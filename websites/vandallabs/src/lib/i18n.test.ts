import { describe, expect, test } from "bun:test"
import { dictionaries, getPreferredLang } from "./i18n"

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

describe("getPreferredLang", () => {
  test("prefers Portuguese for Portuguese browser languages", () => {
    expect(getPreferredLang("pt-BR,pt;q=0.9,en;q=0.8")).toBe("pt")
  })

  test("prefers English for English browser languages", () => {
    expect(getPreferredLang("en-CA,en;q=0.9,pt;q=0.8")).toBe("en")
  })

  test("falls back to English for unsupported browser languages", () => {
    expect(getPreferredLang("fr-CA,fr;q=0.9")).toBe("en")
  })
})
