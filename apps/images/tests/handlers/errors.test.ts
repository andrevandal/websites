import { describe, expect, test } from "bun:test"
import { Hono } from "hono"
import type { BaseIssue } from "valibot"
import {
  errorHandler,
  notFoundHandler,
  validationErrorResponse,
} from "@/handlers/errors"

describe("notFoundHandler", () => {
  test("returns 404 status with Not Found message", async () => {
    const app = new Hono()
    app.notFound(notFoundHandler)

    const response = await app.request("/nonexistent")

    expect(response.status).toBe(404)
    const data = (await response.json()) as Record<string, unknown>
    expect(data.status).toBe(404)
    expect(data.error).toBe("Not Found")
  })
})

describe("errorHandler", () => {
  test("returns 500 status with Internal Server Error message when error is thrown", async () => {
    const app = new Hono()
    app.onError(errorHandler)
    app.get("/throw", () => {
      throw new Error("Test error")
    })

    const originalError = console.error
    console.error = () => {}
    const response = await app.request("/throw")
    console.error = originalError

    expect(response.status).toBe(500)
    const data = (await response.json()) as Record<string, unknown>
    expect(data.status).toBe(500)
    expect(data.error).toBe("Internal Server Error")
  })
})

describe("validationErrorResponse", () => {
  test("returns 400 status with validation error details", async () => {
    const app = new Hono()
    app.get("/validate", c => {
      const issues = [
        { message: "Field is required." },
        { message: "Value must be shorter." },
      ] as unknown as BaseIssue<unknown>[]
      return validationErrorResponse(c, issues)
    })

    const response = await app.request("/validate")

    expect(response.status).toBe(400)
    const data = (await response.json()) as Record<string, unknown>
    expect(data.status).toBe(400)
    expect(data.error).toBe("Validation Failed")
    expect(Array.isArray(data.issues)).toBe(true)
    const issues = data.issues as string[]
    expect(issues).toContain("Field is required.")
    expect(issues).toContain("Value must be shorter.")
  })

  test("maps valibot issues to message strings", async () => {
    const app = new Hono()
    app.get("/validate", c => {
      const issues = [
        { message: "Path is too long." },
      ] as unknown as BaseIssue<unknown>[]
      return validationErrorResponse(c, issues)
    })

    const response = await app.request("/validate")

    const data = (await response.json()) as Record<string, unknown>
    const issues = data.issues as string[]
    expect(issues[0]).toBe("Path is too long.")
  })
})
