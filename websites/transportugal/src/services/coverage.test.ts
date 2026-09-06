import { describe, it, expect } from "bun:test"
import { findAreaById, isCityAllowed } from "./coverage"

describe("findAreaById", () => {
  it("returns the matching area", () => {
    const area = findAreaById("es-vitoria-e-grande-vitoria")
    expect(area?.nome).toBe("Vitória e Grande Vitória")
  })

  it("returns undefined for an unknown id", () => {
    expect(findAreaById("does-not-exist")).toBeUndefined()
  })
})

describe("isCityAllowed", () => {
  it("is case-insensitive and accent-insensitive", () => {
    expect(isCityAllowed("sorocaba", "SP")).toBe(true)
    expect(isCityAllowed("VITORIA", "ES")).toBe(true)
  })

  it("is punctuation-insensitive (hyphen vs. space)", () => {
    expect(isCityAllowed("Biritiba Mirim", "SP")).toBe(true)
  })

  it("is punctuation-insensitive (straight vs. curly apostrophe)", () => {
    expect(isCityAllowed("Santa Bárbara d\u2019Oeste", "SP")).toBe(true)
  })

  it("is scoped by uf — a São Paulo area city must not match under ES", () => {
    expect(isCityAllowed("Sorocaba", "ES")).toBe(false)
  })

  it("returns false for a city outside every area", () => {
    expect(isCityAllowed("Banana", "AM")).toBe(false)
  })

  it("returns false for an unsupported uf", () => {
    expect(isCityAllowed("Sorocaba", "RJ")).toBe(false)
  })
})
