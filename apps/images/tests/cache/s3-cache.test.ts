import { describe, expect, test } from "bun:test"
import { s3CacheBackend } from "@/cache/s3-cache"

describe("s3CacheBackend", () => {
  // Tests for when S3 is not configured (bucket unset)
  test("get returns null when bucket is not configured", async () => {
    // S3 should be disabled when bucket is unset
    const result = await s3CacheBackend.get("any-key", "webp")
    expect(result).toBeNull()
  })

  test("put completes without error when bucket is not configured", async () => {
    const testBytes = new TextEncoder().encode("test-data")
    // Should be a no-op, not throw
    await expect(
      s3CacheBackend.put("any-key", "webp", testBytes)
    ).resolves.toBeUndefined()
  })

  test("stream returns null when bucket is not configured", async () => {
    const result = await s3CacheBackend.stream("any-key", "webp")
    expect(result).toBeNull()
  })

  test("no-op behavior is consistent across multiple calls", async () => {
    const testBytes = new TextEncoder().encode("test-data")

    // Multiple puts should all succeed (as no-ops)
    await expect(
      s3CacheBackend.put("key1", "webp", testBytes)
    ).resolves.toBeUndefined()
    await expect(
      s3CacheBackend.put("key2", "jpeg", testBytes)
    ).resolves.toBeUndefined()

    // Gets should all return null
    const result1 = await s3CacheBackend.get("key1", "webp")
    const result2 = await s3CacheBackend.get("key2", "jpeg")
    expect(result1).toBeNull()
    expect(result2).toBeNull()
  })

  // Note: Real S3 integration tests would require valid AWS credentials
  // and a real S3 bucket. Those are skipped in this sandbox environment.
  // The no-op behavior above ensures that when S3 is misconfigured,
  // the app degrades gracefully without crashing (per design doc §8).
})
