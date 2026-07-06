import { describe, expect, test } from "bun:test"
import { Hono } from "hono"
import { setCacheHeaders, setNoStoreHeaders } from "@/http/headers"

describe("HTTP headers: setCacheHeaders and setNoStoreHeaders behavior", () => {
  test("setCacheHeaders sets ETag to exact provided value", async () => {
    const app = new Hono()
    app.get("/", c => {
      setCacheHeaders(c, {
        etag: '"unique-test-123"',
        lastModified: new Date("2024-01-01T00:00:00Z"),
        maxAge: 3600,
      })
      return c.text("ok")
    })

    const res = await app.request("/")
    expect(res.headers.get("ETag")).toBe('"unique-test-123"')
  })

  test("setCacheHeaders sets Last-Modified to RFC date", async () => {
    const app = new Hono()
    const testDate = new Date("2024-02-15T10:30:00Z")
    const expected = testDate.toUTCString()

    app.get("/", c => {
      setCacheHeaders(c, {
        etag: '"e"',
        lastModified: testDate,
        maxAge: 7200,
      })
      return c.text("ok")
    })

    const res = await app.request("/")
    expect(res.headers.get("Last-Modified")).toBe(expected)
  })

  test("setCacheHeaders includes correct max-age in Cache-Control", async () => {
    const app = new Hono()
    app.get("/", c => {
      setCacheHeaders(c, {
        etag: '"e"',
        lastModified: new Date(),
        maxAge: 4500,
      })
      return c.text("ok")
    })

    const res = await app.request("/")
    const cc = res.headers.get("Cache-Control") || ""
    expect(cc).toContain("max-age=4500")
    expect(cc).toContain("public")
  })

  test("setNoStoreHeaders sets Cache-Control: no-store", async () => {
    const app = new Hono()
    app.get("/", c => {
      setNoStoreHeaders(c)
      return c.text("ok")
    })

    const res = await app.request("/")
    const cc = res.headers.get("Cache-Control") || ""
    expect(cc).toContain("no-store")
  })

  test("setCacheHeaders handles zero maxAge", async () => {
    const app = new Hono()
    app.get("/", c => {
      setCacheHeaders(c, {
        etag: '"e"',
        lastModified: new Date(),
        maxAge: 0,
      })
      return c.text("ok")
    })

    const res = await app.request("/")
    const cc = res.headers.get("Cache-Control") || ""
    expect(cc).toContain("max-age=0")
  })

  test("setCacheHeaders includes s-maxage for shared caches", async () => {
    const app = new Hono()
    app.get("/", c => {
      setCacheHeaders(c, {
        etag: '"e"',
        lastModified: new Date(),
        maxAge: 1800,
      })
      return c.text("ok")
    })

    const res = await app.request("/")
    const cc = res.headers.get("Cache-Control") || ""
    expect(cc).toContain("s-maxage=1800")
  })
})
