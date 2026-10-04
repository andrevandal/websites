import { afterEach, describe, expect, test } from "bun:test"
import { resolveTargetEnvVars } from "./env"

describe("resolveTargetEnvVars", () => {
  afterEach(() => {
    delete process.env["LEGACY_DEPLOY_CONFIG"]
  })

  test("returns the committed Stage config instead of a process environment value", () => {
    process.env["LEGACY_DEPLOY_CONFIG"] = JSON.stringify({
      SITE_URL: "https://wrong.example.test",
      API_TOKEN: "plaintext-token",
    })

    expect(resolveTargetEnvVars(["websites", "brunabraz"], "staging")).toEqual({
      IMAGES_BASE_URL: "https://files.vandal.services/brunabraz/images",
      PUBLIC_GOOGLE_ANALYTICS_ID: "",
      PUBLIC_GOOGLE_ADS_CONVERSION_ID: "",
      PUBLIC_GOOGLE_ADS_CONVERSION_LABEL: "",
    })
    expect(
      resolveTargetEnvVars(["websites", "transportugal"], "production")
    ).toEqual({
      IMAGES_BASE_URL: "https://files.vandal.services/transportugal/images",
      PUBLIC_GOOGLE_ANALYTICS_ID: "",
      PUBLIC_GOOGLE_ADS_CONVERSION_ID: "",
      PUBLIC_GOOGLE_ADS_CONVERSION_LABEL: "",
      ENABLE_PARTYTOWN: "false",
    })
  })

  test("rejects paths that do not identify a configured website", () => {
    expect(() => resolveTargetEnvVars(["apps", "web"], "production")).toThrow(
      'Expected ["websites", "<site-id>"]'
    )
  })
})
