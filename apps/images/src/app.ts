import { Hono } from "hono"
import { serveStatic } from "hono/bun"
import { consola } from "consola"
import { config } from "./config/env"
import { errorHandler, notFoundHandler } from "./handlers/errors"
import { getDeepHealthStatus, getHealthStatus } from "./handlers/health"
import type { DeepHealthStatus } from "./handlers/health"
import { homeHandler } from "./handlers/home"
import { imageHandler } from "./handlers/image"
import {
  banGateMiddleware,
  blocklistMiddleware,
  getActiveBanIps,
  rateLimitMiddleware,
} from "./security/middleware"
import { readSourceBytes, resolveSource } from "./source/resolve"
import { computePlaceholder } from "./transform/placeholder"

const logger = consola.withTag("app")
const app = new Hono()

const staticFilesRootFolder = new URL("../public", import.meta.url).pathname
logger.info(`Static files root: ${staticFilesRootFolder}`)

app.get(
  "/favicon.ico",
  serveStatic({
    root: staticFilesRootFolder,
    path: "favicon.ico",
  })
)

// Each probe fetches and decodes a real image, so a short cache stops an
// unauthenticated caller from turning this route into a source-fetch loop.
const DEEP_HEALTH_TTL_MS = 15_000
let deepHealthCache: { at: number; value: DeepHealthStatus } | undefined

const loadHealthImage = async (url: string) => {
  const resolved = await resolveSource(url)
  if (!resolved.ok || resolved.source.kind !== "http")
    throw new Error(`health image rejected: ${url}`)
  return readSourceBytes({ kind: "http", url: resolved.source.url })
}

const deepHealth = async (): Promise<DeepHealthStatus> => {
  if (deepHealthCache && Date.now() - deepHealthCache.at < DEEP_HEALTH_TTL_MS)
    return deepHealthCache.value

  const value = await getDeepHealthStatus(
    getActiveBanIps(),
    config.trustedProxyCidrs,
    {
      imageUrl: config.healthImageUrl,
      loadImage: loadHealthImage,
      decodeImage: computePlaceholder,
    }
  )
  deepHealthCache = { at: Date.now(), value }
  return value
}

const routes = app
  .get("/", homeHandler)
  .get("/healthy", c => {
    const health = getHealthStatus(getActiveBanIps(), config.trustedProxyCidrs)
    return c.json(health, health.status === "ok" ? 200 : 503)
  })
  .get("/healthy/deep", async c => {
    const health = await deepHealth()
    return c.json(health, health.status === "ok" ? 200 : 503)
  })
  .get("/robots.txt", c => c.text("User-agent: *\nDisallow: /\n"))
  .get(
    "/*",
    banGateMiddleware,
    rateLimitMiddleware,
    blocklistMiddleware,
    imageHandler
  )

app.notFound(notFoundHandler)
app.onError(errorHandler)

export { app }
export type AppType = typeof routes
