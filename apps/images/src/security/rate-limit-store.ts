import type { ClientRateLimitInfo, Store } from "hono-rate-limiter"
import type { SqliteKV } from "../kv/sqlite-kv"

type Counter = { count: number; resetAt: number }

const RATE_LIMIT_KEY_PREFIX = "ratelimit:"

const decodeCounter = (bytes: Uint8Array): Counter =>
  JSON.parse(new TextDecoder().decode(bytes)) as Counter

class SqliteRateLimitStore implements Store {
  private readonly kv: SqliteKV
  private windowMs = 60_000

  constructor(kv: SqliteKV) {
    this.kv = kv
  }

  init(options: { windowMs: number }): void {
    this.windowMs = options.windowMs
  }

  async get(key: string): Promise<ClientRateLimitInfo | undefined> {
    const entry = this.kv.get(`${RATE_LIMIT_KEY_PREFIX}${key}`)
    if (!entry) return undefined

    const counter = decodeCounter(entry.value)
    return { totalHits: counter.count, resetTime: new Date(counter.resetAt) }
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const { count, resetAt } = this.kv.increment(
      `${RATE_LIMIT_KEY_PREFIX}${key}`,
      this.windowMs
    )

    return { totalHits: count, resetTime: new Date(resetAt) }
  }

  async decrement(key: string): Promise<void> {
    const entry = this.kv.get(`${RATE_LIMIT_KEY_PREFIX}${key}`)
    if (!entry) return

    const counter = decodeCounter(entry.value)
    const next: Counter = {
      count: Math.max(0, counter.count - 1),
      resetAt: counter.resetAt,
    }

    this.kv.set(
      `${RATE_LIMIT_KEY_PREFIX}${key}`,
      new TextEncoder().encode(JSON.stringify(next)),
      { ttlMs: next.resetAt - Date.now() }
    )
  }

  async resetKey(key: string): Promise<void> {
    this.kv.delete(`${RATE_LIMIT_KEY_PREFIX}${key}`)
  }
}

export { SqliteRateLimitStore }
