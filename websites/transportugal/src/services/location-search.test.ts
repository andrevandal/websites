import { describe, it, expect } from "bun:test"
import { searchAllowedLocations } from "./location-search"
import { ALLOWED_LOCATIONS } from "@/data/allowed-locations"

describe("searchAllowedLocations", () => {
  it("returns every area and every cidade, grouped in ALLOWED_LOCATIONS order, for an empty query", () => {
    const results = searchAllowedLocations(""),
      totalCidades = ALLOWED_LOCATIONS.reduce((n, a) => n + a.cidades.length, 0)
    expect(results.length).toBe(ALLOWED_LOCATIONS.length + totalCidades)
    expect(results[0]).toEqual({
      type: "area",
      areaId: "sp-sao-paulo-e-demais-cidades",
      label: "São Paulo e Demais Cidades - SP",
    })
    expect(results[1]).toEqual({
      type: "cidade",
      areaId: "sp-sao-paulo-e-demais-cidades",
      cidade: "Caieiras",
      label: "Caieiras - SP",
    })
  })

  it("ranks a typo-tolerant match against a cidade name", () => {
    const results = searchAllowedLocations("Sorocba")
    expect(
      results.some(r => r.type === "cidade" && r.cidade === "Sorocaba")
    ).toBe(true)
  })

  it("ranks a typo-tolerant match against an area name", () => {
    const results = searchAllowedLocations("Grand Vitoria")
    expect(
      results.some(
        r => r.type === "area" && r.areaId === "es-vitoria-e-grande-vitoria"
      )
    ).toBe(true)
  })
})
