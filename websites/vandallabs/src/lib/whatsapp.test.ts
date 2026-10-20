import { describe, expect, test } from "bun:test"
import { waLink } from "@vandal-websites/sun-ui"
import { dictionaries } from "#/lib/i18n"
import { WA_NUMBER } from "#/lib/whatsapp"

describe("Vandal Labs WhatsApp links", () => {
  test("builds a wa.me URL with the site's number", () => {
    expect(WA_NUMBER).toBe("5541984341352")
    const url = waLink(WA_NUMBER, "Hello")
    expect(url).toBe("https://wa.me/5541984341352?text=Hello")
  })

  test("URL-encodes the message", () => {
    const url = waLink(WA_NUMBER, "Hi Vandal Labs! I would like to chat.")
    expect(url).toBe(
      `https://wa.me/${WA_NUMBER}?text=Hi%20Vandal%20Labs!%20I%20would%20like%20to%20chat.`
    )
  })

  test.each([
    ["en", "wa_general"],
    ["en", "wa_consulting"],
    ["en", "wa_training"],
    ["en", "wa_impl"],
    ["pt", "wa_general"],
    ["pt", "wa_consulting"],
    ["pt", "wa_training"],
    ["pt", "wa_impl"],
  ] as const)(
    "%s %s preserves the raw localized message and site number",
    (lang, field) => {
      const message = dictionaries[lang][field]
      const url = new URL(waLink(WA_NUMBER, message))
      expect(url.origin).toBe("https://wa.me")
      expect(url.pathname).toBe("/5541984341352")
      expect(url.searchParams.get("text")).toBe(message)
      expect(url.search).toBe(`?text=${encodeURIComponent(message)}`)
    }
  )
})
