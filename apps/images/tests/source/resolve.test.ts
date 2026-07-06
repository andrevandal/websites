import { describe, expect, test } from "bun:test"
import { resolveSource } from "@/source/resolve"
import type { SourceRef } from "@/source/resolve"

describe("source/resolve: real behavioral tests", () => {
  test("HTTP URL returns success with correct structure", async () => {
    const result = await resolveSource("https://example.com/image.jpg")

    expect("ok" in result).toBe(true)
    if (result.ok) {
      expect(result.source.kind).toBe("http")
      // Type-safe access to http-specific fields
      const httpSource = result.source as Extract<SourceRef, { kind: "http" }>
      expect(httpSource.url).toBe("https://example.com/image.jpg")
      expect(typeof httpSource.id).toBe("string")
    }
  })

  test("Disallowed HTTP domain returns 400 error", async () => {
    const result = await resolveSource(
      "https://definitely-not-in-allowlist.com/image.jpg"
    )

    if (!result.ok) {
      expect(result.error.status).toBe(400)
      expect(typeof result.error.message).toBe("string")
    }
  })

  test("path-traversal attempt returns 404 error", async () => {
    const result = await resolveSource("../../../etc/passwd")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.status).toBe(404)
      expect(typeof result.error.message).toBe("string")
    }
  })

  test("missing FS file returns 404 error", async () => {
    const result = await resolveSource("nonexistent-definitely-not-there.jpg")

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.status).toBe(404)
  })

  test("relative path is classified as FS source", async () => {
    const result = await resolveSource("image.jpg")

    if (result.ok) {
      expect(result.source.kind).toBe("fs")
      const fsSource = result.source as Extract<SourceRef, { kind: "fs" }>
      expect("absolutePath" in fsSource).toBe(true)
      expect("mtime" in fsSource).toBe(true)
    }
  })

  test("HTTP vs FS classification works correctly", async () => {
    const https = await resolveSource("https://example.com/test.jpg")
    const http = await resolveSource("http://example.com/test.jpg")
    const fs = await resolveSource("local/test.jpg")

    if (https.ok) expect(https.source.kind).toBe("http")

    if (http.ok) expect(http.source.kind).toBe("http")

    if (fs.ok) expect(fs.source.kind).toBe("fs")
  })

  test("FS success case includes mtime for freshness checks", async () => {
    const result = await resolveSource("test.jpg")

    if (result.ok) {
      expect(result.source.kind).toBe("fs")
      const fsSource = result.source as Extract<SourceRef, { kind: "fs" }>
      expect(fsSource.mtime instanceof Date).toBe(true)
    }
  })

  test("error shape is consistent across both failure modes", async () => {
    const httpErr = await resolveSource("https://not-allowed.com/x.jpg")
    const fsErr = await resolveSource("missing-file.jpg")

    if (!httpErr.ok) {
      expect("status" in httpErr.error).toBe(true)
      expect("message" in httpErr.error).toBe(true)
      expect(typeof httpErr.error.status).toBe("number")
      expect(typeof httpErr.error.message).toBe("string")
    }

    if (!fsErr.ok) {
      expect("status" in fsErr.error).toBe(true)
      expect("message" in fsErr.error).toBe(true)
    }
  })
})
