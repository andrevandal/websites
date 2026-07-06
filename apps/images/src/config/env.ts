import { consola } from "consola"
import * as v from "valibot"

type ImagesConfig = {
  httpDomains: string[]
  httpMaxAge: number
  fsDir: string
  fsMaxAge: number
  localCacheDir: string
  queueDb: string
  maxConcurrent: number
  s3: {
    endpoint: string
    port: number
    useSSL: boolean
    accessKey?: string
    secretKey?: string
    bucket?: string
  }
  consolaLevel: number
  avifEnabled: boolean
  kvPath: string
  kvMaxBytes: number
  banStrikeThreshold: number
  banStrikeWindowMs: number
  banDurationMs: number
  rateLimitWindowMs: number
  rateLimitMax: number
  trustCloudflareIps: boolean
}

const parseBooleanString = (val: string): boolean => {
  if (val === "true" || val === "1" || val === "yes") return true
  if (val === "false" || val === "0" || val === "no") return false
  throw new Error(`Invalid boolean value: ${val}`)
}

const configSchema = v.object({
  httpDomains: v.pipe(
    v.string(),
    v.transform(val =>
      val
        .split(",")
        .map(domain => domain.trim().toLowerCase())
        .filter(Boolean)
    )
  ),
  httpMaxAge: v.pipe(
    v.string(),
    v.transform(val => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num < 0) throw new Error("Must be non-negative")
      return num
    })
  ),
  fsDir: v.string(),
  fsMaxAge: v.pipe(
    v.string(),
    v.transform(val => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num < 0) throw new Error("Must be non-negative")
      return num
    })
  ),
  localCacheDir: v.string(),
  queueDb: v.optional(v.string(), "./.data/queue.db"),
  maxConcurrent: v.pipe(
    v.string(),
    v.transform(val => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num < 0) throw new Error("Must be non-negative")
      return num
    })
  ),
  s3Endpoint: v.string(),
  s3Port: v.pipe(
    v.string(),
    v.transform(val => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num < 0) throw new Error("Must be non-negative")
      return num
    })
  ),
  s3UseSSL: v.pipe(
    v.string(),
    v.transform(val => parseBooleanString(val))
  ),
  s3AccessKey: v.optional(v.string()),
  s3SecretKey: v.optional(v.string()),
  s3Bucket: v.optional(v.string()),
  consolaLevel: v.pipe(
    v.string(),
    v.transform(val => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num < 0) throw new Error("Must be non-negative")
      return num
    })
  ),
  avifEnabled: v.pipe(
    v.string(),
    v.transform(val => parseBooleanString(val))
  ),
  kvPath: v.optional(v.string(), "./.data/kv.db"),
  kvMaxBytes: v.pipe(
    v.string(),
    v.transform(val => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num < 0) throw new Error("Must be non-negative")
      return num
    })
  ),
  banStrikeThreshold: v.pipe(
    v.string(),
    v.transform(val => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num < 0) throw new Error("Must be non-negative")
      return num
    })
  ),
  banStrikeWindowMs: v.pipe(
    v.string(),
    v.transform(val => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num < 0) throw new Error("Must be non-negative")
      return num
    })
  ),
  banDurationMs: v.pipe(
    v.string(),
    v.transform(val => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num < 0) throw new Error("Must be non-negative")
      return num
    })
  ),
  rateLimitWindowMs: v.pipe(
    v.string(),
    v.transform(val => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num < 0) throw new Error("Must be non-negative")
      return num
    })
  ),
  rateLimitMax: v.pipe(
    v.string(),
    v.transform(val => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num < 0) throw new Error("Must be non-negative")
      return num
    })
  ),
  trustCloudflareIps: v.pipe(
    v.string(),
    v.transform(val => parseBooleanString(val))
  ),
})

const loadConfig = (): ImagesConfig => {
  const env = {
    httpDomains: process.env.HTTP_DOMAINS || "",
    httpMaxAge: process.env.HTTP_MAX_AGE || "0",
    fsDir: process.env.FS_DIR || "./assets/images",
    fsMaxAge: process.env.FS_MAX_AGE || "0",
    localCacheDir: process.env.LOCAL_CACHE_DIR || "./.data/cache",
    queueDb: process.env.QUEUE_DB || "./.data/queue.db",
    maxConcurrent: process.env.MAX_CONCURRENT || "3",
    s3Endpoint: process.env.S3_ENDPOINT || "https://s3.amazonaws.com",
    s3Port: process.env.S3_PORT || "9000",
    s3UseSSL: process.env.S3_USE_SSL || "true",
    s3AccessKey: process.env.S3_ACCESS_KEY,
    s3SecretKey: process.env.S3_SECRET_KEY,
    s3Bucket: process.env.S3_BUCKET,
    consolaLevel: process.env.CONSOLA_LEVEL || "3",
    avifEnabled: process.env.AVIF_ENABLED || "true",
    kvPath: process.env.KV_PATH,
    kvMaxBytes: process.env.KV_MAX_BYTES || "52428800",
    banStrikeThreshold: process.env.BAN_STRIKE_THRESHOLD || "5",
    banStrikeWindowMs: process.env.BAN_STRIKE_WINDOW_MS || "3600000",
    banDurationMs: process.env.BAN_DURATION_MS || "86400000",
    rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS || "300000",
    rateLimitMax: process.env.RATE_LIMIT_MAX || "300",
    trustCloudflareIps: process.env.TRUST_CLOUDFLARE_IPS || "true",
  }

  const result = v.safeParse(configSchema, env)
  if (!result.success) {
    throw new Error(
      `Invalid configuration: ${result.issues.map(i => i.message).join(", ")}`
    )
  }

  return {
    httpDomains: result.output.httpDomains,
    httpMaxAge: result.output.httpMaxAge,
    fsDir: result.output.fsDir,
    fsMaxAge: result.output.fsMaxAge,
    localCacheDir: result.output.localCacheDir,
    queueDb: result.output.queueDb,
    maxConcurrent: result.output.maxConcurrent,
    s3: {
      endpoint: result.output.s3Endpoint,
      port: result.output.s3Port,
      useSSL: result.output.s3UseSSL,
      accessKey: result.output.s3AccessKey,
      secretKey: result.output.s3SecretKey,
      bucket: result.output.s3Bucket,
    },
    consolaLevel: result.output.consolaLevel,
    avifEnabled: result.output.avifEnabled,
    kvPath: result.output.kvPath,
    kvMaxBytes: result.output.kvMaxBytes,
    banStrikeThreshold: result.output.banStrikeThreshold,
    banStrikeWindowMs: result.output.banStrikeWindowMs,
    banDurationMs: result.output.banDurationMs,
    rateLimitWindowMs: result.output.rateLimitWindowMs,
    rateLimitMax: result.output.rateLimitMax,
    trustCloudflareIps: result.output.trustCloudflareIps,
  }
}

const config = loadConfig()

// Applied globally: every consola.withTag(...) instance elsewhere in the app
// inherits this level, since they all share the same underlying singleton.
consola.level = config.consolaLevel

const logger = consola.withTag("config")
logger.debug("resolved config", {
  httpDomains: config.httpDomains,
  httpMaxAge: config.httpMaxAge,
  fsDir: config.fsDir,
  fsMaxAge: config.fsMaxAge,
  localCacheDir: config.localCacheDir,
  queueDb: config.queueDb,
  maxConcurrent: config.maxConcurrent,
  s3Endpoint: config.s3.endpoint,
  s3Port: config.s3.port,
  s3UseSSL: config.s3.useSSL,
  s3Bucket: config.s3.bucket ?? "(unset)",
  s3AccessKeyConfigured: Boolean(config.s3.accessKey),
  s3SecretKeyConfigured: Boolean(config.s3.secretKey),
  consolaLevel: config.consolaLevel,
  avifEnabled: config.avifEnabled,
  kvPath: config.kvPath,
  kvMaxBytes: config.kvMaxBytes,
  banStrikeThreshold: config.banStrikeThreshold,
  banStrikeWindowMs: config.banStrikeWindowMs,
  banDurationMs: config.banDurationMs,
  rateLimitWindowMs: config.rateLimitWindowMs,
  rateLimitMax: config.rateLimitMax,
  trustCloudflareIps: config.trustCloudflareIps,
})

export type { ImagesConfig }
export { config, loadConfig }
