import { describe, expect, test } from "bun:test"
import { WA_NUMBER, waLink } from "./whatsapp"

describe("waLink", () => {
  test("builds a wa.me URL prefixed with the shared WA_NUMBER", () => {
    const url = waLink("Hello")
    expect(url.startsWith(`https://wa.me/${WA_NUMBER}?text=`)).toBe(true)
  })

  test("URL-encodes the message", () => {
    const url = waLink("Hi Vandal Labs! I would like to chat.")
    expect(url).toBe(
      `https://wa.me/${WA_NUMBER}?text=Hi%20Vandal%20Labs!%20I%20would%20like%20to%20chat.`
    )
  })

  test("every call reuses the same number regardless of message", () => {
    const a = waLink("message one")
    const b = waLink("message two")
    const numberOf = (url: string) => url.split("?")[0]
    expect(numberOf(a)).toBe(numberOf(b))
    expect(numberOf(a)).toBe(`https://wa.me/${WA_NUMBER}`)
  })
})
