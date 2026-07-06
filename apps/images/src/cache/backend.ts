type CacheEntry = {
  bytes: Uint8Array
  etag: string
  lastModified: Date
}

type CacheBackend = {
  get: (
    key: string,
    format: string,
    opts?: { sourceMtime?: Date }
  ) => Promise<CacheEntry | null>
  put: (key: string, format: string, bytes: Uint8Array) => Promise<void>
  stream: (
    key: string,
    format: string
  ) => Promise<{
    stream: ReadableStream
    etag: string
    lastModified: Date
  } | null>
}

export type { CacheEntry, CacheBackend }
