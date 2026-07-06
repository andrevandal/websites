// oxlint-disable import/no-nodejs-modules
import fs from "node:fs"
import path from "node:path"
import { Database } from "bun:sqlite"

type KvEntry = {
  value: Uint8Array
  etag?: string
  lastModified?: Date
}

type KvSetOptions = {
  ttlMs?: number
  etag?: string
  lastModified?: Date
}

type KvRow = {
  value: Uint8Array
  size: number
  etag: string | null
  last_modified: number | null
  expires_at: number | null
}

class SqliteKV {
  private readonly db: Database
  private readonly maxBytes: number
  private seq: number

  constructor(opts: { path: string; maxBytes: number }) {
    // oxlint-disable-next-line node/no-sync
    fs.mkdirSync(path.dirname(opts.path), { recursive: true })
    this.maxBytes = opts.maxBytes
    this.db = new Database(opts.path, { create: true })
    this.db.run(`
      CREATE TABLE IF NOT EXISTS kv (
        key TEXT PRIMARY KEY,
        value BLOB NOT NULL,
        size INTEGER NOT NULL,
        etag TEXT,
        last_modified INTEGER,
        expires_at INTEGER,
        last_used_seq INTEGER NOT NULL
      )
    `)

    const maxSeqRow = this.db
      .query<{ maxSeq: number | null }, []>(
        "SELECT MAX(last_used_seq) AS maxSeq FROM kv"
      )
      .get()
    this.seq = maxSeqRow?.maxSeq ?? 0
  }

  private nextSeq(): number {
    this.seq += 1
    return this.seq
  }

  get(key: string): KvEntry | null {
    const row = this.db
      .query<KvRow, [string]>(
        "SELECT value, size, etag, last_modified, expires_at FROM kv WHERE key = ?"
      )
      .get(key)

    if (!row) return null

    if (row.expires_at !== null && row.expires_at <= Date.now()) {
      this.delete(key)
      return null
    }

    this.db.run("UPDATE kv SET last_used_seq = ? WHERE key = ?", [
      this.nextSeq(),
      key,
    ])

    return {
      value: new Uint8Array(row.value),
      etag: row.etag ?? undefined,
      lastModified:
        row.last_modified !== null ? new Date(row.last_modified) : undefined,
    }
  }

  set(key: string, value: Uint8Array, opts: KvSetOptions = {}): void {
    const now = Date.now()
    const expiresAt = opts.ttlMs !== undefined ? now + opts.ttlMs : null

    this.db.run(
      `INSERT INTO kv (key, value, size, etag, last_modified, expires_at, last_used_seq)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         size = excluded.size,
         etag = excluded.etag,
         last_modified = excluded.last_modified,
         expires_at = excluded.expires_at,
         last_used_seq = excluded.last_used_seq`,
      [
        key,
        value,
        value.byteLength,
        opts.etag ?? null,
        opts.lastModified?.getTime() ?? null,
        expiresAt,
        this.nextSeq(),
      ]
    )

    this.evict()
  }

  delete(key: string): void {
    this.db.run("DELETE FROM kv WHERE key = ?", [key])
  }

  increment(key: string, windowMs: number): { count: number; resetAt: number } {
    const now = Date.now()
    const existing = this.get(key)
    const counter = existing
      ? (JSON.parse(new TextDecoder().decode(existing.value)) as {
          count: number
          resetAt: number
        })
      : null

    const next =
      counter && counter.resetAt > now
        ? { count: counter.count + 1, resetAt: counter.resetAt }
        : { count: 1, resetAt: now + windowMs }

    this.set(key, new TextEncoder().encode(JSON.stringify(next)), {
      ttlMs: next.resetAt - now,
    })

    return next
  }

  keysWithPrefix(prefix: string): string[] {
    const now = Date.now()
    const rows = this.db
      .query<{ key: string }, [string, number]>(
        "SELECT key FROM kv WHERE key LIKE ? AND (expires_at IS NULL OR expires_at > ?)"
      )
      .all(`${prefix}%`, now)

    return rows.map(row => row.key)
  }

  private totalBytes(): number {
    const row = this.db
      .query<{ total: number | null }, []>("SELECT SUM(size) AS total FROM kv")
      .get()

    return row?.total ?? 0
  }

  private evict(): void {
    let total = this.totalBytes()

    while (total > this.maxBytes) {
      const oldest = this.db
        .query<{ key: string; size: number }, []>(
          "SELECT key, size FROM kv ORDER BY last_used_seq ASC LIMIT 1"
        )
        .get()

      if (!oldest) break

      this.db.run("DELETE FROM kv WHERE key = ?", [oldest.key])
      total -= oldest.size
    }
  }
}

export { SqliteKV }
export type { KvEntry, KvSetOptions }
