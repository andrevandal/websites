import { describe, expect, test } from "bun:test"
import { dictionaries } from "./i18n"

describe("dictionaries", () => {
  test("en and pt define the exact same set of keys", () => {
    const enKeys = Object.keys(dictionaries.en).sort()
    const ptKeys = Object.keys(dictionaries.pt).sort()
    expect(ptKeys).toEqual(enKeys)
  })

  test("no dictionary value is empty", () => {
    for (const lang of ["en", "pt"] as const) {
      for (const [key, value] of Object.entries(dictionaries[lang])) {
        if (Array.isArray(value)) {
          expect(value.length, `${lang}.${key}`).toBeGreaterThan(0)
          for (const item of value)
            expect(item.length, `${lang}.${key} item`).toBeGreaterThan(0)
        } else expect(value.length, `${lang}.${key}`).toBeGreaterThan(0)
      }
    }
  })

  test("head_rotating has at least 2 phrases in both languages", () => {
    expect(dictionaries.en.head_rotating.length).toBeGreaterThanOrEqual(2)
    expect(dictionaries.pt.head_rotating.length).toBeGreaterThanOrEqual(2)
  })
})
