import { consola } from "consola"
import { config } from "../config/env"
import type { CacheBackend } from "./backend"

const logger = consola.withTag("cache:local")

const localCacheBackend: CacheBackend = {
  async get(key: string, format: string, opts?: { sourceMtime?: Date }) {
    const path = `${config.localCacheDir}/${key}.${format}`
    const file = Bun.file(path)
    const exists = await file.exists()

    if (!exists) {
      logger.debug(`miss: ${key}.${format}`)
      return null
    }

    // Check freshness: if source is newer than cache, treat as stale
    if (opts?.sourceMtime) {
      const stat = await file.stat()
      if (stat && opts.sourceMtime.getTime() > stat.mtimeMs) {
        logger.debug(`stale: ${key}.${format}`)
        return null
      }
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const stat = await file.stat()

    if (!stat) return null

    const etag = `"${stat.size}-${stat.mtimeMs}"`
    const lastModified = new Date(stat.mtimeMs)

    logger.debug(`hit: ${key}.${format} (${bytes.length}b)`)
    return { bytes, etag, lastModified }
  },

  async put(key: string, format: string, bytes: Uint8Array) {
    const path = `${config.localCacheDir}/${key}.${format}`
    await Bun.write(path, bytes)
    logger.debug(`put: ${key}.${format} (${bytes.length}b)`)
  },

  async stream(key: string, format: string) {
    const path = `${config.localCacheDir}/${key}.${format}`
    const file = Bun.file(path)
    const exists = await file.exists()

    if (!exists) {
      logger.debug(`stream miss: ${key}.${format}`)
      return null
    }

    const stat = await file.stat()
    if (!stat) return null

    const etag = `"${stat.size}-${stat.mtimeMs}"`
    const lastModified = new Date(stat.mtimeMs)

    logger.debug(`stream hit: ${key}.${format}`)
    return {
      stream: file.stream(),
      etag,
      lastModified,
    }
  },
}

export { localCacheBackend }
