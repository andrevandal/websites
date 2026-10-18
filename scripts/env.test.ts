import { afterEach, describe, expect, test } from "bun:test"
import { resolveTargetEnvVars } from "./env"
import { SITE_IDS, STAGES } from "./site-config"

describe("resolveTargetEnvVars", () => {
  afterEach(() => {
    delete process.env["LEGACY_DEPLOY_CONFIG"]
  })

  test("committed Stage config does not leak legacy process-environment variables", () => {
    process.env["LEGACY_DEPLOY_CONFIG"] = JSON.stringify({
      SITE_URL: "https://wrong.example.test",
      API_TOKEN: "plaintext-token",
    })

    const vars = resolveTargetEnvVars(["websites", "brunabraz"], "staging")
    expect(vars).not.toHaveProperty("SITE_URL")
    expect(vars).not.toHaveProperty("API_TOKEN")
  })

  test("each website routes image transforms to the proxy for its Stage, except Pedro preview", () => {
    for (const siteId of SITE_IDS) {
      for (const stage of STAGES) {
        const vars = resolveTargetEnvVars(["websites", siteId], stage)
        const expected =
          siteId === "pedrohenri" && stage === "preview"
            ? ""
            : stage === "production"
              ? "https://infra.example.invalid"
              : "https://infra.example.invalid"
        expect(vars["IMAGES_BASE_URL"]).toBe(expected)
      }
    }
  })

  test("rejects paths that do not identify a configured website", () => {
    expect(() => resolveTargetEnvVars(["apps", "web"], "production")).toThrow(
      'Expected ["websites", "<site-id>"]'
    )
  })
})
