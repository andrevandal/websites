import { describe, expect, test } from "bun:test"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { SqliteKV } from "@/kv/sqlite-kv"
import { BanTracker } from "@/security/ban"

const freshTracker = (
  overrides: Partial<{
    strikeThreshold: number
    strikeWindowMs: number
    banDurationMs: number
  }> = {}
) => {
  const kv = new SqliteKV({
    // oxlint-disable-next-line node/no-sync -- test-only temp dir setup
    path: path.join(mkdtempSync(path.join(tmpdir(), "ban-test-")), "kv.db"),
    maxBytes: 1_000_000,
  })
  const tracker = new BanTracker(kv, {
    strikeThreshold: 3,
    strikeWindowMs: 60_000,
    banDurationMs: 60_000,
    ...overrides,
  })
  return { kv, tracker }
}

describe("BanTracker: recordStrike", () => {
  test("does not ban an IP below the strike threshold", () => {
    const { tracker } = freshTracker()
    tracker.recordStrike("1.1.1.1")
    tracker.recordStrike("1.1.1.1")

    expect(tracker.getActiveBanIps()).not.toContain("1.1.1.1")
  })

  test("bans an IP once it reaches the strike threshold", () => {
    const { tracker } = freshTracker()
    tracker.recordStrike("2.2.2.2")
    tracker.recordStrike("2.2.2.2")
    tracker.recordStrike("2.2.2.2")

    expect(tracker.getActiveBanIps()).toContain("2.2.2.2")
  })

  test("tracks strikes independently per IP", () => {
    const { tracker } = freshTracker()
    tracker.recordStrike("3.3.3.3")
    tracker.recordStrike("4.4.4.4")
    tracker.recordStrike("4.4.4.4")

    expect(tracker.getActiveBanIps()).not.toContain("3.3.3.3")
    expect(tracker.getActiveBanIps()).not.toContain("4.4.4.4")
  })
})

describe("BanTracker: getActiveBanIps", () => {
  test("excludes bans once banDurationMs has elapsed", () => {
    const { tracker } = freshTracker({ banDurationMs: -1 })
    tracker.recordStrike("5.5.5.5")
    tracker.recordStrike("5.5.5.5")
    tracker.recordStrike("5.5.5.5")

    expect(tracker.getActiveBanIps()).not.toContain("5.5.5.5")
  })
})
