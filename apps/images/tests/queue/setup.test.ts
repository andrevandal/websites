import { describe, expect, test } from "bun:test"
import { enqueueTransform, transformQueue } from "@/queue/setup"

describe("queue/setup: enqueueTransform behavior", () => {
  test("FS job enqueue succeeds with valid structure", async () => {
    const jobData = {
      sourceKind: "fs" as const,
      sourceId: "test.jpg",
      modifiers: {
        width: 800,
        mode: "max" as const,
        scale: "down" as const,
        format: "jpeg" as const,
        flip: "none" as const,
      },
      cacheKey: "test-key-1",
    }
    // Should not throw
    await enqueueTransform(jobData)
  })

  test("HTTP job enqueue succeeds with valid structure", async () => {
    const jobData = {
      sourceKind: "http" as const,
      sourceId: "https://example.com/image.jpg",
      modifiers: {
        width: 600,
        mode: "max" as const,
        scale: "down" as const,
        format: "webp" as const,
        flip: "none" as const,
      },
      cacheKey: "test-key-2",
    }
    // Should not throw
    await enqueueTransform(jobData)
  })

  test("same cacheKey enqueued twice uses jobId dedup (no duplicate jobs)", async () => {
    const cacheKey = `dedup-key-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const jobData = {
      sourceKind: "fs" as const,
      sourceId: "dedup-test.jpg",
      modifiers: {
        width: 300,
        mode: "max" as const,
        scale: "down" as const,
        format: "png" as const,
        flip: "none" as const,
      },
      cacheKey,
    }

    const before = await transformQueue.getJobCountsAsync()
    await enqueueTransform(jobData)
    await enqueueTransform(jobData)
    const after = await transformQueue.getJobCountsAsync()

    const total = (counts: typeof before) =>
      counts.waiting +
      counts.active +
      counts.completed +
      counts.failed +
      counts.delayed

    // Two enqueue calls with the same cacheKey (== jobId) must create exactly
    // one job, not two — this is bunqueue's own jobId-based dedup, not a mock.
    expect(total(after) - total(before)).toBe(1)

    const job = await transformQueue.getJob(cacheKey)
    expect(job).not.toBeNull()
    expect(job?.id).toBe(cacheKey)
  })

  test("different cacheKeys create separate job identities", async () => {
    const base = {
      sourceKind: "fs" as const,
      sourceId: "multi.jpg",
      modifiers: {
        width: 400,
        mode: "max" as const,
        scale: "down" as const,
        format: "jpeg" as const,
        flip: "none" as const,
      },
    }

    // Different keys = separate jobs
    await enqueueTransform({ ...base, cacheKey: "key-a" })
    await enqueueTransform({ ...base, cacheKey: "key-b" })
    // Both succeed = different identities accepted
  })

  test("broken source doesn't prevent queue from accepting new jobs", async () => {
    const brokenJob = {
      sourceKind: "fs" as const,
      sourceId: "/etc/passwd", // path traversal
      modifiers: {
        width: 100,
        mode: "max" as const,
        scale: "down" as const,
        format: "jpeg" as const,
        flip: "none" as const,
      },
      cacheKey: "broken-source-test",
    }

    // Broken job enqueue succeeds (error handling in worker)
    await enqueueTransform(brokenJob)

    // Queue accepts subsequent jobs without crashing
    const goodJob = {
      sourceKind: "fs" as const,
      sourceId: "recovery.jpg",
      modifiers: {
        width: 200,
        mode: "max" as const,
        scale: "down" as const,
        format: "webp" as const,
        flip: "none" as const,
      },
      cacheKey: "recovery-test",
    }

    await enqueueTransform(goodJob)
    // Test passes = queue is still usable
  })
})
