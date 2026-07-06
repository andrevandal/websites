import { describe, expect, test } from "bun:test"
import { computePlaceholder } from "@/transform/placeholder"

describe("computePlaceholder", () => {
  test("computePlaceholder is a function", () => {
    expect(typeof computePlaceholder).toBe("function")
  })

  test("function is properly exported", () => {
    expect(computePlaceholder).toBeDefined()
  })

  // Full placeholder functionality is tested at the route level (app.test.ts)
  // where actual image sources are available for testing the complete pipeline
})
