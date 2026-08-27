import { readFile } from "node:fs/promises"
import { describe, expect, test } from "bun:test"
import { resolvePreviewUrl } from "./deploy"

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
