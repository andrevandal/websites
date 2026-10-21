import { describe, expect, test } from "bun:test"
import { resolveTargetEnvVars } from "./env"

const env = {
  IMAGES_BASE_URL: "https://images.example.invalid",
  S3_PUBLIC_URL: "https://assets.example.com/site-staging",
  API_TOKEN: "plaintext-token",
}

describe("resolveTargetEnvVars", () => {
  test("staging and production get only the image service base", () => {
    for (const stage of ["staging", "production"] as const) {
      expect(
        resolveTargetEnvVars(["websites", "brunabraz"], stage, env)
      ).toEqual({ IMAGES_BASE_URL: "https://images.example.invalid" })
    }
  })

  test("static-site previews use the image service and leave assets to Preview Base", () => {
    expect(
      resolveTargetEnvVars(["websites", "bellypao"], "preview", env)
    ).toEqual({ IMAGES_BASE_URL: "https://images.example.invalid" })
  })

  test("EmDash previews serve originals", () => {
    expect(
      resolveTargetEnvVars(["websites", "pedrohenridesign"], "preview", env)[
        "IMAGES_BASE_URL"
      ]
    ).toBe("")
  })

  test("rejects paths that do not identify a website", () => {
    expect(() =>
      resolveTargetEnvVars(["apps", "web"], "production", env)
    ).toThrow('Expected ["websites", "<site-id>"]')
  })
})
