import { describe, expect, test } from "bun:test"
import { getHealthStatus } from "@/handlers/health"

describe("getHealthStatus", () => {
  test("returns status ok", () => {
    const result = getHealthStatus()

    expect(result).toEqual({ status: "ok" })
  })

  test("returns an object with status property", () => {
    const result = getHealthStatus()

    expect(result.status).toBe("ok")
  })
})
