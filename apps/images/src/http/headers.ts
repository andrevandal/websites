import type { Context } from "hono"

type CacheableEntry = { etag: string; lastModified: Date }

const setCacheHeaders = (
  c: Context,
  opts: CacheableEntry & { maxAge: number }
) => {
  c.header("ETag", opts.etag)
  c.header("Last-Modified", opts.lastModified.toUTCString())
  c.header(
    "Cache-Control",
    `public, max-age=${opts.maxAge}, s-maxage=${opts.maxAge}`
  )
}

const isNotModified = (c: Context, opts: CacheableEntry): boolean => {
  const ifNoneMatch = c.req.header("if-none-match")
  if (ifNoneMatch && ifNoneMatch === opts.etag) return true

  const ifModifiedSince = c.req.header("if-modified-since")
  if (ifModifiedSince) {
    const since = new Date(ifModifiedSince)
    if (
      !Number.isNaN(since.getTime()) &&
      since.getTime() >= opts.lastModified.getTime()
    )
      return true
  }

  return false
}

const setNoStoreHeaders = (c: Context) => {
  c.header("Cache-Control", "no-store")
}

export { setCacheHeaders, isNotModified, setNoStoreHeaders }
