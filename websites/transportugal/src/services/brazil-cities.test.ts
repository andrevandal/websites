import { describe, it, expect } from "bun:test"
import { searchBrazilCities } from "./brazil-cities"

describe("searchBrazilCities", () => {
  it("returns an empty array for an empty query", () => {
    expect(searchBrazilCities("")).toEqual([])
  })

  it("finds an intended city despite a one-character-off query", () => {
    const results = searchBrazilCities("Riberao Preto")
    expect(results.some(c => c.cidade === "RIBEIRÃO PRETO")).toBe(true)
  })

  it("respects the limit parameter", () => {
    const results = searchBrazilCities("Santa", 3)
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it("defaults the limit to 20", () => {
    const results = searchBrazilCities("a")
    expect(results.length).toBeLessThanOrEqual(20)
  })
})
