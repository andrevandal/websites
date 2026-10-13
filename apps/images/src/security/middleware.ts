import type { Context, MiddlewareHandler } from "hono"
import { getConnInfo } from "hono/bun"
import { ipRestriction } from "hono/ip-restriction"
import { rateLimiter } from "hono-rate-limiter"
import { consola } from "consola"
import { config } from "../config/env"
import { kv } from "../kv/instance"
import { BanTracker } from "./ban"
import { isBlockedPath } from "./blocklist"
import { getClientIp, UNKNOWN_CLIENT_IP } from "./client-ip"
import { SqliteRateLimitStore } from "./rate-limit-store"

const logger = consola.withTag("security")

const banTracker = new BanTracker(kv, {
  strikeThreshold: config.banStrikeThreshold,
  strikeWindowMs: config.banStrikeWindowMs,
  banDurationMs: config.banDurationMs,
})

const rawPeerAddress = (c: Context): string | undefined => {
  try {
    return getConnInfo(c).remote.address
  } catch {
    // No 2nd fetch() argument available (e.g. Hono's app.request() test
    // helper without a mock server) — degrade to an unknown peer rather
    // than 500 the whole request.
    return undefined
  }
}

const clientIpFor = (c: Context): string =>
  getClientIp(
    rawPeerAddress(c),
    c.req.header("cf-connecting-ip"),
    config.trustCloudflareIps,
    {
      trustedProxyCidrs: config.trustedProxyCidrs,
      forwardedFor: c.req.header("x-forwarded-for"),
    }
  )

// Rebuilt fresh per request: hono's ipRestriction snapshots denyList at
// construction time, and the active ban list changes as strikes accrue.
// Requests with no resolvable client identity (only possible outside real
// Bun.serve, e.g. test harnesses) skip the gate — nothing meaningful to
// check them against, and lumping them into one shared "unknown" bucket
// would let unrelated traffic accumulate strikes/bans against each other.
const banGateMiddleware: MiddlewareHandler = async (c, next) => {
  const ip = clientIpFor(c)
  if (ip === UNKNOWN_CLIENT_IP) return next()

  return ipRestriction(
    () => ({ remote: { address: ip } }),
    { denyList: banTracker.getActiveBanIps() },
    (_remote, ctx) => {
      logger.debug(`banned ip blocked: ${ctx.req.path}`)
      return ctx.json({ status: 403, error: "Forbidden" }, 403)
    }
  )(c, next)
}

const rateLimitMiddleware = rateLimiter({
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMax,
  keyGenerator: clientIpFor,
  skip: c => clientIpFor(c) === UNKNOWN_CLIENT_IP,
  store: new SqliteRateLimitStore(kv),
})

const blocklistMiddleware: MiddlewareHandler = async (c, next) => {
  if (!isBlockedPath(c.req.path)) return next()

  const ip = clientIpFor(c)
  if (ip !== UNKNOWN_CLIENT_IP) banTracker.recordStrike(ip)
  logger.debug(`blocked probe path: ${c.req.path}`)
  return c.json({ status: 404, error: "Not Found" }, 404)
}

export { banGateMiddleware, blocklistMiddleware, rateLimitMiddleware }
