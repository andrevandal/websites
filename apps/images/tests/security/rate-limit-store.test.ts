import { describe, expect, test } from "bun:test"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { SqliteKV } from "@/kv/sqlite-kv"
import { SqliteRateLimitStore } from "@/security/rate-limit-store"

const freshStore = () => {
  const kv = new SqliteKV({
    path: path.join(mkdtempSync(path.join(tmpdir(), "rl-")), "kv.db"),
    maxBytes: 1_000_000,
  })
  const store = new SqliteRateLimitStore(kv)
  store.init?.({ windowMs: 60_000 } as Parameters<
    NonNullable<typeof store.init>
  >[0])
  return store
}

describe("SqliteRateLimitStore", () => {
  test("get returns undefined for a client with no hits yet", async () => {
    const store = freshStore()
    expect(await store.get("1.1.1.1")).toBeUndefined()
  })

  test("increment starts a client's hit count at 1", async () => {
    const store = freshStore()
    const info = await store.increment("2.2.2.2")
    expect(info.totalHits).toBe(1)
  })

  test("increment accumulates hits within the window", async () => {
    const store = freshStore()
    await store.increment("3.3.3.3")
    await store.increment("3.3.3.3")
    const info = await store.increment("3.3.3.3")
    expect(info.totalHits).toBe(3)
  })

  test("get reflects the current hit count without incrementing", async () => {
    const store = freshStore()
    await store.increment("4.4.4.4")
    await store.increment("4.4.4.4")

    const info = await store.get("4.4.4.4")
    expect(info?.totalHits).toBe(2)
    const infoAgain = await store.get("4.4.4.4")
    expect(infoAgain?.totalHits).toBe(2)
  })

  test("decrement reduces a client's hit count", async () => {
    const store = freshStore()
    await store.increment("5.5.5.5")
    await store.increment("5.5.5.5")
    await store.decrement("5.5.5.5")

    const info = await store.get("5.5.5.5")
    expect(info?.totalHits).toBe(1)
  })

  test("resetKey clears a client's hit count entirely", async () => {
    const store = freshStore()
    await store.increment("6.6.6.6")
    await store.resetKey("6.6.6.6")

    expect(await store.get("6.6.6.6")).toBeUndefined()
  })
})
