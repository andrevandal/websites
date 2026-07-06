import { describe, expect, test } from "bun:test"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { SqliteKV } from "@/kv/sqlite-kv"
import { wrapWithHotCache } from "@/cache/hot-cache"
import type { CacheBackend, CacheEntry } from "@/cache/backend"

const freshKv = (maxBytes = 1_000_000) =>
  new SqliteKV({
    // oxlint-disable-next-line node/no-sync -- test-only temp dir setup
    path: path.join(mkdtempSync(path.join(tmpdir(), "hc-")), "kv.db"),
    maxBytes,
  })

const makeMockBackend = (initial?: CacheEntry) => {
  let stored: CacheEntry | null = initial ?? null
  let getCalls = 0

  const backend: CacheBackend = {
    get: async () => {
      getCalls += 1
      return stored
    },
    put: async (_key, _format, bytes) => {
      stored = { bytes, etag: '"underlying"', lastModified: new Date() }
    },
    stream: async () => null,
  }

  return { backend, getCallCount: () => getCalls }
}

describe("hot-cache: get", () => {
  test("returns a hot hit from KV without calling the underlying backend", async () => {
    const kv = freshKv()
    const entry: CacheEntry = {
      bytes: new TextEncoder().encode("cached"),
      etag: '"abc"',
      lastModified: new Date(),
    }
    const { backend, getCallCount } = makeMockBackend(entry)
    const hot = wrapWithHotCache(backend, kv, { maxEntryBytes: 1_000_000 })

    // Prime the hot cache via a miss-then-populate round trip.
    await hot.get("key1", "webp")
    expect(getCallCount()).toBe(1)

    const result = await hot.get("key1", "webp")
    expect(getCallCount()).toBe(1) // no second underlying call: served from KV
    expect(new TextDecoder().decode(result?.bytes)).toBe("cached")
  })

  test("falls through to the underlying backend on KV miss and populates it", async () => {
    const kv = freshKv()
    const entry: CacheEntry = {
      bytes: new TextEncoder().encode("fresh"),
      etag: '"xyz"',
      lastModified: new Date(),
    }
    const { backend } = makeMockBackend(entry)
    const hot = wrapWithHotCache(backend, kv, { maxEntryBytes: 1_000_000 })

    const result = await hot.get("key2", "webp")
    expect(new TextDecoder().decode(result?.bytes)).toBe("fresh")
    expect(kv.get("key2.webp")).not.toBeNull()
  })

  test("returns null when the underlying backend also misses", async () => {
    const kv = freshKv()
    const { backend } = makeMockBackend(undefined)
    const hot = wrapWithHotCache(backend, kv, { maxEntryBytes: 1_000_000 })

    expect(await hot.get("missing", "webp")).toBeNull()
  })
})

describe("hot-cache: staleness", () => {
  test("bypasses a hot entry older than the given sourceMtime", async () => {
    const kv = freshKv()
    const oldEntry: CacheEntry = {
      bytes: new TextEncoder().encode("old"),
      etag: '"old"',
      lastModified: new Date("2020-01-01T00:00:00.000Z"),
    }
    const { backend, getCallCount } = makeMockBackend(oldEntry)
    const hot = wrapWithHotCache(backend, kv, { maxEntryBytes: 1_000_000 })

    await hot.get("key3", "webp") // primes hot cache with the old entry
    expect(getCallCount()).toBe(1)

    const sourceMtime = new Date("2026-01-01T00:00:00.000Z")
    await hot.get("key3", "webp", { sourceMtime })

    expect(getCallCount()).toBe(2) // staleness forced a second underlying read
  })
})

describe("hot-cache: put", () => {
  test("writes through to the underlying backend and populates KV", async () => {
    const kv = freshKv()
    const { backend } = makeMockBackend()
    const hot = wrapWithHotCache(backend, kv, { maxEntryBytes: 1_000_000 })

    await hot.put("key4", "webp", new TextEncoder().encode("payload"))

    expect(kv.get("key4.webp")).not.toBeNull()
    const result = await backend.get("key4", "webp")
    expect(new TextDecoder().decode(result?.bytes)).toBe("payload")
  })

  test("skips KV population for values above maxEntryBytes", async () => {
    const kv = freshKv()
    const { backend } = makeMockBackend()
    const hot = wrapWithHotCache(backend, kv, { maxEntryBytes: 4 })

    await hot.put("key5", "webp", new TextEncoder().encode("way too big"))

    expect(kv.get("key5.webp")).toBeNull()
    const result = await backend.get("key5", "webp")
    expect(new TextDecoder().decode(result?.bytes)).toBe("way too big")
  })
})
