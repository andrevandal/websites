import { consola } from "consola"
import { config } from "../config/env"
import type { CacheBackend } from "./backend"

const logger = consola.withTag("cache:s3")

// Build S3 client if bucket is configured
const s3Client = config.s3.bucket
  ? new Bun.S3Client({
      bucket: config.s3.bucket,
      endpoint: `${config.s3.useSSL ? "https" : "http"}://${config.s3.endpoint}${
        (config.s3.useSSL && config.s3.port === 443) ||
        (!config.s3.useSSL && config.s3.port === 80)
          ? ""
          : `:${config.s3.port}`
      }`,
      accessKeyId: config.s3.accessKey,
      secretAccessKey: config.s3.secretKey,
    })
  : null

if (!config.s3.bucket)
  logger.warn("S3 cache disabled: no bucket configured (S3_BUCKET unset)")
else if (!config.s3.accessKey || !config.s3.secretKey) {
  logger.warn(
    `S3 cache misconfigured: bucket "${config.s3.bucket}" set but accessKey/secretKey missing — every put/get will fail (set S3_ACCESS_KEY and S3_SECRET_KEY)`
  )
} else {
  logger.debug(
    `S3 cache enabled: bucket "${config.s3.bucket}" at ${config.s3.endpoint}`
  )
}

const s3CacheBackend: CacheBackend = {
  async get(key: string, format: string) {
    if (!s3Client) return null

    try {
      const file = s3Client.file(`${key}.${format}`)
      const stat = await file.stat()

      if (!stat) {
        logger.debug(`miss: ${key}.${format}`)
        return null
      }

      const bytes = new Uint8Array(await file.arrayBuffer())
      logger.debug(`hit: ${key}.${format} (${bytes.length}b)`)
      return { bytes, etag: stat.etag, lastModified: stat.lastModified }
    } catch (error) {
      // File not found or other error (including misconfigured credentials)
      // - treat as miss so the request still degrades to redirect-passthrough,
      // but surface the reason at debug level instead of failing silently.
      const message = error instanceof Error ? error.message : String(error)
      logger.debug(`get failed, treated as miss: ${key}.${format}: ${message}`)
      return null
    }
  },

  async put(key: string, format: string, bytes: Uint8Array) {
    if (!s3Client) return

    await s3Client.write(`${key}.${format}`, bytes)
    logger.debug(`put: ${key}.${format} (${bytes.length}b)`)
  },

  async stream(key: string, format: string) {
    if (!s3Client) return null

    try {
      const file = s3Client.file(`${key}.${format}`)
      const stat = await file.stat()

      if (!stat) {
        logger.debug(`stream miss: ${key}.${format}`)
        return null
      }

      logger.debug(`stream hit: ${key}.${format}`)
      return {
        stream: file.stream(),
        etag: stat.etag,
        lastModified: stat.lastModified,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.debug(
        `stream failed, treated as miss: ${key}.${format}: ${message}`
      )
      return null
    }
  },
}

// Helper to get raw S3File handle for Task 5
const file = (key: string, format: string) => {
  if (!s3Client) return null
  return s3Client.file(`${key}.${format}`)
}

export { s3CacheBackend, file }
