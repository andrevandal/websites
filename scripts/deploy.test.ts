import { readFile } from "node:fs/promises"
import { describe, expect, test } from "bun:test"
import { filterEnvVars, resolvePreviewUrl } from "./deploy"

const deployScript = new URL("./deploy.ts", import.meta.url)

describe("deploy cleanup command", () => {
  test("uses only Wrangler-supported flags when deleting preview workers", async () => {
    const source = await readFile(deployScript, "utf-8")

    expect(source).toContain('"wrangler", "delete", name, "--force"')
    expect(source).not.toContain('"-y"')
  })
})

describe("resolvePreviewUrl", () => {
  test("extracts wrangler's workers.dev deploy confirmation URL", () => {
    const output =
      "Uploaded brunabraz-pr-42 (3.21 sec)\nDeployed brunabraz-pr-42 triggers (0.34 sec)\n  https://brunabraz-pr-42.account.workers.dev"

    expect(resolvePreviewUrl(output, "brunabraz-pr-42")).toBe(
      "https://brunabraz-pr-42.account.workers.dev"
    )
  })

  test("ignores unrelated https URLs printed before/after the deploy line", () => {
    const output = [
      "Note: check https://developers.cloudflare.com/workers/ for docs",
      "https://brunabraz-pr-42.account.workers.dev",
      "See also https://dash.cloudflare.com/some-account",
    ].join("\n")

    expect(resolvePreviewUrl(output, "brunabraz-pr-42")).toBe(
      "https://brunabraz-pr-42.account.workers.dev"
    )
  })

  test("falls back to the last workers.dev match when the name can't be matched", () => {
    const output =
      "https://other-worker.account.workers.dev\nhttps://brunabraz.account.workers.dev"

    expect(resolvePreviewUrl(output, "brunabraz")).toBe(
      "https://brunabraz.account.workers.dev"
    )
  })

  test("returns undefined when no workers.dev URL is present", () => {
    expect(resolvePreviewUrl("Deploy failed", "brunabraz")).toBeUndefined()
  })

  test("returns undefined for undefined output", () => {
    expect(resolvePreviewUrl(undefined, "brunabraz")).toBeUndefined()
  })
})

describe("filterEnvVars", () => {
  test("keeps keys present in both raw JSON and allowedKeys", () => {
    const rawJson = JSON.stringify({
      SITE_URL: "https://example.com",
      API_URL: "https://api.example.invalid",
    })
    const allowedKeys = ["SITE_URL", "API_URL"]
    const result = filterEnvVars(rawJson, allowedKeys)

    expect(result).toEqual({
      SITE_URL: "https://example.com",
      API_URL: "https://api.example.invalid",
    })
  })

  test("silently drops keys present in raw JSON but not in allowedKeys", () => {
    const rawJson = JSON.stringify({
      SITE_URL: "https://example.com",
      IMAGES_BASE_URL: "https://images.example.com",
      SECRET_API_KEY: "secret123",
    })
    const allowedKeys = ["SITE_URL"]
    const result = filterEnvVars(rawJson, allowedKeys)

    expect(result).toEqual({
      SITE_URL: "https://example.com",
    })
    expect(result).not.toHaveProperty("IMAGES_BASE_URL")
    expect(result).not.toHaveProperty("SECRET_API_KEY")
  })

  test("does not include keys from allowedKeys if not present in raw JSON", () => {
    const rawJson = JSON.stringify({
      SITE_URL: "https://example.com",
    })
    const allowedKeys = ["SITE_URL", "API_URL", "API_KEY"]
    const result = filterEnvVars(rawJson, allowedKeys)

    expect(result).toEqual({
      SITE_URL: "https://example.com",
    })
    expect(result).not.toHaveProperty("API_URL")
    expect(result).not.toHaveProperty("API_KEY")
  })

  test("returns empty object when allowedKeys is empty", () => {
    const rawJson = JSON.stringify({
      SITE_URL: "https://example.com",
      API_URL: "https://api.example.invalid",
    })
    const allowedKeys: string[] = []
    const result = filterEnvVars(rawJson, allowedKeys)

    expect(result).toEqual({})
  })

  test("returns empty object when raw JSON is empty", () => {
    const rawJson = JSON.stringify({})
    const allowedKeys = ["SITE_URL", "API_URL"]
    const result = filterEnvVars(rawJson, allowedKeys)

    expect(result).toEqual({})
  })

  test("strips trailing backslashes from raw JSON string before parsing", () => {
    const rawJson = JSON.stringify({
      SITE_URL: "https://example.com",
    }).replace(/"/g, '\\"')
    const allowedKeys = ["SITE_URL"]
    const result = filterEnvVars(rawJson, allowedKeys)

    expect(result).toHaveProperty("SITE_URL")
  })

  test("removes leading BOM character from raw JSON string", () => {
    const jsonString = JSON.stringify({
      SITE_URL: "https://example.com",
    })
    const rawJson = `\uFEFF${jsonString}`
    const allowedKeys = ["SITE_URL"]
    const result = filterEnvVars(rawJson, allowedKeys)

    expect(result).toEqual({
      SITE_URL: "https://example.com",
    })
  })

  test("throws on non-string values in raw JSON", () => {
    const rawJson = JSON.stringify({
      SITE_URL: "https://example.com",
      PORT: 3000,
    })
    const allowedKeys = ["SITE_URL", "PORT"]

    expect(() => filterEnvVars(rawJson, allowedKeys)).toThrow()
  })

  test("throws on nested object values in raw JSON", () => {
    const rawJson = JSON.stringify({
      SITE_URL: "https://example.com",
      CONFIG: { timeout: 5000 },
    })
    const allowedKeys = ["SITE_URL", "CONFIG"]

    expect(() => filterEnvVars(rawJson, allowedKeys)).toThrow()
  })

  test("throws on null or undefined values in raw JSON", () => {
    const rawJson = JSON.stringify({
      SITE_URL: "https://example.com",
      NULLABLE_VAR: null,
    })
    const allowedKeys = ["SITE_URL", "NULLABLE_VAR"]

    expect(() => filterEnvVars(rawJson, allowedKeys)).toThrow()
  })

  test("throws on invalid JSON input", () => {
    const rawJson = "{ invalid json }"
    const allowedKeys = ["SITE_URL"]

    expect(() => filterEnvVars(rawJson, allowedKeys)).toThrow()
  })
})
