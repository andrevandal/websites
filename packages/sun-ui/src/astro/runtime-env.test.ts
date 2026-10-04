import { describe, expect, test } from "bun:test"
import { runtimeBoolean, runtimeEnv, runtimeGtag } from "./runtime-env"

const reader =
  (values: Record<string, string>) =>
  (key: string): string | undefined =>
    values[key]

describe("runtimeEnv", () => {
  test("returns the Worker variable read at request time", () => {
    expect(
      runtimeEnv(
        reader({ IMAGES_BASE_URL: "https://files.example.test/images" }),
        "IMAGES_BASE_URL"
      )
    ).toBe("https://files.example.test/images")
  })

  test("treats a missing or empty variable as unset", () => {
    expect(runtimeEnv(reader({}), "IMAGES_BASE_URL")).toBeUndefined()
    expect(
      runtimeEnv(reader({ IMAGES_BASE_URL: "" }), "IMAGES_BASE_URL")
    ).toBeUndefined()
  })
})

describe("runtimeBoolean", () => {
  test("is true only for the raw string true", () => {
    expect(
      runtimeBoolean(reader({ ENABLE_PARTYTOWN: "true" }), "ENABLE_PARTYTOWN")
    ).toBe(true)
    expect(
      runtimeBoolean(reader({ ENABLE_PARTYTOWN: "false" }), "ENABLE_PARTYTOWN")
    ).toBe(false)
    expect(
      runtimeBoolean(reader({ ENABLE_PARTYTOWN: "TRUE" }), "ENABLE_PARTYTOWN")
    ).toBe(false)
    expect(runtimeBoolean(reader({}), "ENABLE_PARTYTOWN")).toBe(false)
  })
})

describe("runtimeGtag", () => {
  test("builds the Gtag config from Worker variables", () => {
    expect(
      runtimeGtag(
        reader({
          PUBLIC_GOOGLE_ANALYTICS_ID: "G-TEST",
          PUBLIC_GOOGLE_ADS_CONVERSION_ID: "AW-1",
          PUBLIC_GOOGLE_ADS_CONVERSION_LABEL: "label",
          ENABLE_PARTYTOWN: "true",
        })
      )
    ).toEqual({
      gtagId: "G-TEST",
      conversionId: "AW-1",
      conversionLabel: "label",
      partytown: true,
    })
  })

  test("disables Partytown unless ENABLE_PARTYTOWN is true", () => {
    expect(runtimeGtag(reader({ ENABLE_PARTYTOWN: "false" })).partytown).toBe(
      false
    )
    expect(runtimeGtag(reader({}))).toEqual({
      gtagId: undefined,
      conversionId: undefined,
      conversionLabel: undefined,
      partytown: false,
    })
  })
})
