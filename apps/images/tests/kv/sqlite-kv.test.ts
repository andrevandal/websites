import { describe, expect, test } from "bun:test"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { SqliteKV } from "@/kv/sqlite-kv"

const freshDbPath = () =>
  // oxlint-disable-next-line node/no-sync -- test-only temp dir setup
  path.join(mkdtempSync(path.join(tmpdir(), "kv-test-")), "kv.db")

describe("SqliteKV: get/set/delete", () => {
  test("returns null for a missing key", () => {
    const kv = new SqliteKV({ path: freshDbPath(), maxBytes: 1_000_000 })
    expect(kv.get("missing")).toBeNull()
  })

  test("set then get returns the stored value", () => {
    const kv = new SqliteKV({ path: freshDbPath(), maxBytes: 1_000_000 })
    const value = new TextEncoder().encode("hello")
    kv.set("greeting", value)

    const entry = kv.get("greeting")
    expect(entry).not.toBeNull()
    expect(new TextDecoder().decode(entry?.value)).toBe("hello")
  })

  test("delete removes the key", () => {
    const kv = new SqliteKV({ path: freshDbPath(), maxBytes: 1_000_000 })
    kv.set("gone-soon", new TextEncoder().encode("x"))
    kv.delete("gone-soon")

    expect(kv.get("gone-soon")).toBeNull()
  })

  test("set with ttlMs expires after the ttl elapses", () => {
    const kv = new SqliteKV({ path: freshDbPath(), maxBytes: 1_000_000 })
    kv.set("short-lived", new TextEncoder().encode("x"), { ttlMs: -1 })

    expect(kv.get("short-lived")).toBeNull()
  })

  test("set stores optional etag and lastModified metadata", () => {
    const kv = new SqliteKV({ path: freshDbPath(), maxBytes: 1_000_000 })
    const lastModified = new Date("2026-01-01T00:00:00.000Z")
    kv.set("with-meta", new TextEncoder().encode("x"), {
      etag: '"abc"',
      lastModified,
    })

    const entry = kv.get("with-meta")
    expect(entry?.etag).toBe('"abc"')
    expect(entry?.lastModified?.getTime()).toBe(lastModified.getTime())
  })
})

describe("SqliteKV: byte-size LRU eviction", () => {
  test("evicts oldest-used entries once total size exceeds maxBytes", () => {
    const kv = new SqliteKV({ path: freshDbPath(), maxBytes: 30 })
    kv.set("a", new Uint8Array(10))
    kv.set("b", new Uint8Array(10))
    kv.set("c", new Uint8Array(10))

    // Touch "a" so it's most-recently-used, "b" becomes the least-recently-used.
    kv.get("a")
    kv.set("d", new Uint8Array(10))

    expect(kv.get("b")).toBeNull()
    expect(kv.get("a")).not.toBeNull()
    expect(kv.get("c")).not.toBeNull()
    expect(kv.get("d")).not.toBeNull()
  })
})

describe("SqliteKV: increment", () => {
  test("first increment for a key returns count 1", () => {
    const kv = new SqliteKV({ path: freshDbPath(), maxBytes: 1_000_000 })
    const result = kv.increment("hits:1.2.3.4", 60_000)

    expect(result.count).toBe(1)
  })

  test("increments count within the same window", () => {
    const kv = new SqliteKV({ path: freshDbPath(), maxBytes: 1_000_000 })
    kv.increment("hits:1.2.3.4", 60_000)
    kv.increment("hits:1.2.3.4", 60_000)
    const result = kv.increment("hits:1.2.3.4", 60_000)

    expect(result.count).toBe(3)
  })

  test("resets count once the window has expired", () => {
    const kv = new SqliteKV({ path: freshDbPath(), maxBytes: 1_000_000 })
    kv.increment("hits:1.2.3.4", -1)
    const result = kv.increment("hits:1.2.3.4", 60_000)

    expect(result.count).toBe(1)
  })
})

describe("SqliteKV: keysWithPrefix", () => {
  test("returns only keys matching the prefix", () => {
    const kv = new SqliteKV({ path: freshDbPath(), maxBytes: 1_000_000 })
    kv.set("ban:active:1.1.1.1", new Uint8Array(1))
    kv.set("ban:active:2.2.2.2", new Uint8Array(1))
    kv.set("ratelimit:1.1.1.1", new Uint8Array(1))

    const keys = kv.keysWithPrefix("ban:active:")

    expect(keys.sort()).toEqual(["ban:active:1.1.1.1", "ban:active:2.2.2.2"])
  })

  test("excludes expired keys", () => {
    const kv = new SqliteKV({ path: freshDbPath(), maxBytes: 1_000_000 })
    kv.set("ban:active:1.1.1.1", new Uint8Array(1), { ttlMs: -1 })
    kv.set("ban:active:2.2.2.2", new Uint8Array(1))

    expect(kv.keysWithPrefix("ban:active:")).toEqual(["ban:active:2.2.2.2"])
  })
})
