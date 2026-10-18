import { describe, expect, test } from "bun:test"

import { toAnalyticsSettings, toSettingsUpdate } from "./shared"

describe("toAnalyticsSettings", () => {
  test("keeps trimmed non-empty strings for known keys only", () => {
    expect(
      toAnalyticsSettings({
        gtagId: " G-1 ",
        conversionId: "",
        conversionLabel: 5,
        other: "x",
      })
    ).toEqual({ gtagId: "G-1" })
  })

  test("returns no keys when nothing is stored", () => {
    expect(toAnalyticsSettings({})).toEqual({})
  })
})

describe("toSettingsUpdate", () => {
  test("trims values and turns blanks into null so the host deletes them", () => {
    expect(
      toSettingsUpdate({
        gtagId: " G-1 ",
        conversionId: "  ",
        conversionLabel: "abc",
      })
    ).toEqual({
      gtagId: "G-1",
      conversionId: null,
      conversionLabel: "abc",
    })
  })
})
