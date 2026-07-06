import type { SqliteKV } from "../kv/sqlite-kv"
import type { CacheBackend, CacheEntry } from "./backend"

type HotCacheOptions = {
  maxEntryBytes: number
}

const wrapWithHotCache = (
  backend: CacheBackend,
  kv: SqliteKV,
  opts: HotCacheOptions
): CacheBackend => {
  const populate = (key: string, format: string, entry: CacheEntry) => {
    if (entry.bytes.byteLength > opts.maxEntryBytes) return

    kv.set(`${key}.${format}`, entry.bytes, {
      etag: entry.etag,
      lastModified: entry.lastModified,
    })
  }

  return {
    async get(key, format, getOpts) {
      const cached = kv.get(`${key}.${format}`)

      if (cached) {
        const stale =
          getOpts?.sourceMtime !== undefined &&
          cached.lastModified !== undefined &&
          getOpts.sourceMtime.getTime() > cached.lastModified.getTime()

        if (!stale) {
          return {
            bytes: cached.value,
            etag: cached.etag ?? "",
            lastModified: cached.lastModified ?? new Date(0),
          }
        }
      }

      const result = await backend.get(key, format, getOpts)
      if (result) populate(key, format, result)

      return result
    },

    async put(key, format, bytes) {
      await backend.put(key, format, bytes)
      populate(key, format, {
        bytes,
        etag: `"${bytes.byteLength}-${Date.now()}"`,
        lastModified: new Date(),
      })
    },

    async stream(key, format) {
      return backend.stream(key, format)
    },
  }
}

export { wrapWithHotCache }
