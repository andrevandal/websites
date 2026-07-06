import { config } from "../config/env"
import { kv } from "../kv/instance"
import { wrapWithHotCache } from "./hot-cache"
import { localCacheBackend } from "./local-cache"
import { s3CacheBackend } from "./s3-cache"
import type { CacheBackend } from "./backend"

const hotCacheOpts = { maxEntryBytes: config.kvMaxBytes / 2 }
const hotLocalCacheBackend = wrapWithHotCache(
  localCacheBackend,
  kv,
  hotCacheOpts
)
const hotS3CacheBackend = wrapWithHotCache(s3CacheBackend, kv, hotCacheOpts)

const pickBackend = (sourceKind: "http" | "fs"): CacheBackend =>
  sourceKind === "fs" ? hotLocalCacheBackend : hotS3CacheBackend

export { pickBackend }
