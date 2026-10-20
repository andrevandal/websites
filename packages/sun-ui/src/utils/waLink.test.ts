import { describe, expect, it } from "bun:test"
import { waLink } from "./waLink"

describe("waLink", () => {
  it("builds a number-only URL without an empty query", () => {
    expect(waLink("5511945488607")).toBe("https://wa.me/5511945488607")
    expect(waLink("5511945488607", "")).toBe("https://wa.me/5511945488607")
  })

  it("encodes message spaces, Unicode and query delimiters", () => {
    expect(waLink("5541984341352", "Olá! Café & pão? 50% + entrega")).toBe(
      "https://wa.me/5541984341352?text=Ol%C3%A1!%20Caf%C3%A9%20%26%20p%C3%A3o%3F%2050%25%20%2B%20entrega"
    )
  })

  it("preserves transportugal's decoded message without double encoding", () => {
    const encoded =
      "Ol%C3%A1%21%20Gostaria%20de%20solicitar%20uma%20cota%C3%A7%C3%A3o."
    const url = waLink("551123580464", decodeURIComponent(encoded))
    expect(new URL(url).searchParams.get("text")).toBe(
      "Olá! Gostaria de solicitar uma cotação."
    )
    expect(url).not.toContain("%25")
  })

  it("leaves literal percent sequences in raw messages intact after decoding", () => {
    const message = "Use %20 as a literal code"
    expect(
      new URL(waLink("5541984341352", message)).searchParams.get("text")
    ).toBe(message)
  })
})
