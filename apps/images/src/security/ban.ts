import type { SqliteKV } from "../kv/sqlite-kv"

type BanOptions = {
  strikeThreshold: number
  strikeWindowMs: number
  banDurationMs: number
}

const BAN_KEY_PREFIX = "ban:"
const STRIKE_KEY_PREFIX = "strike:"

class BanTracker {
  private readonly kv: SqliteKV
  private readonly opts: BanOptions

  constructor(kv: SqliteKV, opts: BanOptions) {
    this.kv = kv
    this.opts = opts
  }

  recordStrike(ip: string): void {
    const { count } = this.kv.increment(
      `${STRIKE_KEY_PREFIX}${ip}`,
      this.opts.strikeWindowMs
    )

    if (count >= this.opts.strikeThreshold) {
      this.kv.set(`${BAN_KEY_PREFIX}${ip}`, new Uint8Array(0), {
        ttlMs: this.opts.banDurationMs,
      })
    }
  }

  getActiveBanIps(): string[] {
    return this.kv
      .keysWithPrefix(BAN_KEY_PREFIX)
      .map(key => key.slice(BAN_KEY_PREFIX.length))
  }
}

export { BanTracker }
export type { BanOptions }
