import { describe, expect, test, beforeAll, afterAll } from "bun:test"
import { mkdir } from "fs/promises"
import { resolve } from "path"
import { localCacheBackend } from "@/cache/local-cache"

const testCacheDir = resolve("/tmp/omr-images-cache-test")

beforeAll(async () => {
  await mkdir(testCacheDir, { recursive: true })
  // Override config to use test directory
  process.env.LOCAL_CACHE_DIR = testCacheDir
})

afterAll(async () => {
  await Bun.$`rm -rf ${testCacheDir}`
  delete process.env.LOCAL_CACHE_DIR
})

describe("localCacheBackend", () => {
  test("put and get returns same bytes", async () => {
    const testBytes = new TextEncoder().encode("test-image-data")
    await localCacheBackend.put("test-key", "webp", testBytes)

    const cached = await localCacheBackend.get("test-key", "webp")
    expect(cached).not.toBeNull()
    expect(cached?.bytes).toEqual(testBytes)
  })

  test("get returns null for missing key", async () => {
    const cached = await localCacheBackend.get("nonexistent-key", "webp")
    expect(cached).toBeNull()
  })

  test("returns etag and lastModified on hit", async () => {
    const testBytes = new TextEncoder().encode("test-image-data")
    await localCacheBackend.put("test-key-2", "jpeg", testBytes)

    const cached = await localCacheBackend.get("test-key-2", "jpeg")
    expect(cached).not.toBeNull()
    expect(cached?.etag).toBeDefined()
    expect(typeof cached?.etag).toBe("string")
    expect(cached?.lastModified).toBeDefined()
    expect(cached?.lastModified instanceof Date).toBe(true)
  })

  test("etag is consistent for same content", async () => {
    const testBytes = new TextEncoder().encode("consistent-data")
    await localCacheBackend.put("etag-test", "png", testBytes)

    const cached1 = await localCacheBackend.get("etag-test", "png")
    const cached2 = await localCacheBackend.get("etag-test", "png")
    expect(cached1?.etag).toBe(cached2?.etag)
  })

  test("different formats use different files", async () => {
    const testBytes = new TextEncoder().encode("test-data")
    await localCacheBackend.put("format-test", "webp", testBytes)
    await localCacheBackend.put("format-test", "jpeg", testBytes)

    const webp = await localCacheBackend.get("format-test", "webp")
    const jpeg = await localCacheBackend.get("format-test", "jpeg")
    expect(webp).not.toBeNull()
    expect(jpeg).not.toBeNull()
    expect(webp?.bytes).toEqual(jpeg?.bytes)
  })

  test("handles nested directory creation", async () => {
    const testBytes = new TextEncoder().encode("nested-test")
    await localCacheBackend.put("path/to/nested/key", "png", testBytes)

    const cached = await localCacheBackend.get("path/to/nested/key", "png")
    expect(cached).not.toBeNull()
    expect(cached?.bytes).toEqual(testBytes)
  })

  test("stale detection: returns null when sourceMtime is newer", async () => {
    const testBytes = new TextEncoder().encode("stale-test")
    await localCacheBackend.put("stale-key", "webp", testBytes)

    // Get the cached entry
    const cached = await localCacheBackend.get("stale-key", "webp")
    expect(cached).not.toBeNull()

    // Now provide a future sourceMtime (cache file should be considered stale)
    const futureDate = new Date(Date.now() + 60000) // 60 seconds in future
    const staleCheck = await localCacheBackend.get("stale-key", "webp", {
      sourceMtime: futureDate,
    })
    expect(staleCheck).toBeNull()
  })

  test("freshness check: returns cached when sourceMtime is older", async () => {
    const testBytes = new TextEncoder().encode("fresh-test")
    await localCacheBackend.put("fresh-key", "jpeg", testBytes)

    // Get the cached entry first to establish it exists
    const cached = await localCacheBackend.get("fresh-key", "jpeg")
    expect(cached).not.toBeNull()

    // Provide an older sourceMtime (cache should be fresh)
    const pastDate = new Date(Date.now() - 60000) // 60 seconds in past
    const freshCheck = await localCacheBackend.get("fresh-key", "jpeg", {
      sourceMtime: pastDate,
    })
    expect(freshCheck).not.toBeNull()
    expect(freshCheck?.bytes).toEqual(testBytes)
  })

  test("stream method returns readable stream", async () => {
    const testBytes = new TextEncoder().encode("stream-test-data")
    await localCacheBackend.put("stream-key", "png", testBytes)

    const streamed = await localCacheBackend.stream("stream-key", "png")
    expect(streamed).not.toBeNull()
    expect(streamed?.stream).toBeDefined()
    expect(streamed?.etag).toBeDefined()
    expect(streamed?.lastModified).toBeDefined()

    // Read the stream to verify it contains correct data
    if (streamed?.stream) {
      const reader = streamed.stream.getReader()
      const chunks: Uint8Array[] = []
      try {
        while (true) {
          // oxlint-disable-next-line eslint/no-await-in-loop -- stream chunks are inherently sequential
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
        }
      } finally {
        reader.releaseLock()
      }
      const combined = new Uint8Array(
        chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      )
      let offset = 0
      for (const chunk of chunks) {
        combined.set(chunk, offset)
        offset += chunk.length
      }
      expect(combined).toEqual(testBytes)
    }
  })

  test("stream returns null for missing key", async () => {
    const streamed = await localCacheBackend.stream(
      "nonexistent-stream-key",
      "webp"
    )
    expect(streamed).toBeNull()
  })

  test("handles large binary data", async () => {
    // Create 1MB of random data
    const largeData = new Uint8Array(1024 * 1024)
    for (let i = 0; i < largeData.length; i++)
      largeData[i] = Math.floor(Math.random() * 256)

    await localCacheBackend.put("large-key", "webp", largeData)
    const cached = await localCacheBackend.get("large-key", "webp")
    expect(cached?.bytes.length).toBe(1024 * 1024)
    expect(cached?.bytes).toEqual(largeData)
  })

  test("put creates parent directories automatically", async () => {
    const testBytes = new TextEncoder().encode("auto-dir-test")
    // This should create deeply nested directories
    await localCacheBackend.put("a/b/c/d/e/f/test", "png", testBytes)

    const cached = await localCacheBackend.get("a/b/c/d/e/f/test", "png")
    expect(cached?.bytes).toEqual(testBytes)
  })
})
