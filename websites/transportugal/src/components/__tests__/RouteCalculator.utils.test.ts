import { describe, it, expect } from "bun:test"
import {
  buildInitialComboboxItems,
  originToValue,
  originToLabel,
  parseOriginValue,
  shouldSearchOrigin,
  shouldSearchDestination,
  destinationToValue,
  destinationToLabel,
  destinationGroupKey,
  parseDestinationValue,
  formatDestinationQuery,
} from "@utils"
import { ALLOWED_LOCATIONS } from "../../data/allowed-locations"

describe("buildInitialComboboxItems", () => {
  it("destinationItems: emits one area entry followed by one cidade entry per city, per area, in ALLOWED_LOCATIONS order", () => {
    const { destinationItems } = buildInitialComboboxItems(ALLOWED_LOCATIONS),
      totalCidades = ALLOWED_LOCATIONS.reduce((n, a) => n + a.cidades.length, 0)
    expect(destinationItems).toHaveLength(
      ALLOWED_LOCATIONS.length + totalCidades
    )
    expect(destinationItems[0]).toEqual({
      type: "area",
      areaId: "sp-sao-paulo-e-demais-cidades",
      label: "São Paulo e Demais Cidades - SP",
    })
    expect(destinationItems[1]).toEqual({
      type: "cidade",
      areaId: "sp-sao-paulo-e-demais-cidades",
      cidade: "Caieiras",
      label: "Caieiras - SP",
    })
  })

  it("originItems: uppercases cidade, sorted alphabetically, first entry matches the known-smallest city", () => {
    const { originItems } = buildInitialComboboxItems(ALLOWED_LOCATIONS)
    expect(originItems).toHaveLength(
      ALLOWED_LOCATIONS.reduce((n, a) => n + a.cidades.length, 0)
    )
    expect(originItems[0]).toEqual({ cidade: "AFONSO CLÁUDIO", uf: "ES" })
    expect(originItems.every(c => c.cidade === c.cidade.toUpperCase())).toBe(
      true
    )
    expect(
      originItems.every(
        (c, i) =>
          i === 0 || originItems[i - 1]!.cidade.localeCompare(c.cidade) <= 0
      )
    ).toBe(true)
  })

  it("originItems: has one entry per cidade across all areas, no area-level entries", () => {
    const { originItems } = buildInitialComboboxItems(ALLOWED_LOCATIONS),
      totalCidades = ALLOWED_LOCATIONS.reduce((n, a) => n + a.cidades.length, 0)
    expect(originItems).toHaveLength(totalCidades)
  })
})

describe("origin value helpers", () => {
  it("originToValue joins cidade and uf with a pipe", () => {
    expect(originToValue({ cidade: "Serra", uf: "ES" })).toBe("Serra|ES")
  })

  it("originToLabel formats 'Cidade - UF'", () => {
    expect(originToLabel({ cidade: "Serra", uf: "ES" })).toBe("Serra - ES")
  })

  it("parseOriginValue splits the pipe-joined token back into cidade/uf", () => {
    expect(parseOriginValue("Serra|ES")).toEqual({ cidade: "Serra", uf: "ES" })
  })

  it("parseOriginValue returns null for an empty/undefined value", () => {
    expect(parseOriginValue(undefined)).toBeNull()
    expect(parseOriginValue("")).toBeNull()
  })
})

describe("shouldSearchOrigin", () => {
  it("is false for empty and whitespace-only queries", () => {
    expect(shouldSearchOrigin("")).toBe(false)
    expect(shouldSearchOrigin("  ")).toBe(false)
  })

  it("is true from 1 character", () => {
    expect(shouldSearchOrigin("S")).toBe(true)
    expect(shouldSearchOrigin("Se")).toBe(true)
    expect(shouldSearchOrigin("Serra")).toBe(true)
  })
})

describe("shouldSearchDestination", () => {
  it("is false for empty and whitespace-only queries", () => {
    expect(shouldSearchDestination("")).toBe(false)
    expect(shouldSearchDestination("  ")).toBe(false)
  })

  it("is true from 1 character", () => {
    expect(shouldSearchDestination("S")).toBe(true)
    expect(shouldSearchDestination("Se")).toBe(true)
    expect(shouldSearchDestination("Serra")).toBe(true)
  })
})

describe("destination value helpers", () => {
  it("destinationToValue prefixes a whole-area pick with 'area:'", () => {
    expect(
      destinationToValue({ type: "area", areaId: "es-interiores", label: "x" })
    ).toBe("area:es-interiores")
  })

  it("destinationToValue prefixes a cidade pick with 'cidade:areaId:cidade'", () => {
    expect(
      destinationToValue({
        type: "cidade",
        areaId: "es-interiores",
        cidade: "Linhares",
        label: "x",
      })
    ).toBe("cidade:es-interiores:Linhares")
  })

  it("destinationToLabel returns the match's own label verbatim", () => {
    expect(
      destinationToLabel({
        type: "area",
        areaId: "es-interiores",
        label: "Interiores - ES",
      })
    ).toBe("Interiores - ES")
  })

  it("destinationGroupKey resolves the area's nome for a cidade match", () => {
    expect(
      destinationGroupKey({
        type: "cidade",
        areaId: "es-interiores",
        cidade: "Linhares",
        label: "x",
      })
    ).toBe("Interiores")
  })

  it("parseDestinationValue parses a whole-area token, cidade left undefined", () => {
    expect(parseDestinationValue("area:es-interiores")).toEqual({
      areaId: "es-interiores",
    })
  })

  it("parseDestinationValue parses a cidade token", () => {
    expect(parseDestinationValue("cidade:es-interiores:Linhares")).toEqual({
      areaId: "es-interiores",
      cidade: "Linhares",
    })
  })

  it("parseDestinationValue returns null for an empty/undefined value", () => {
    expect(parseDestinationValue(undefined)).toBeNull()
  })
})

describe("formatDestinationQuery", () => {
  it("returns an empty string for null", () => {
    expect(formatDestinationQuery(null)).toBe("")
  })

  it("formats a whole-area pick as 'Area nome - UF'", () => {
    expect(formatDestinationQuery({ areaId: "es-interiores" })).toBe(
      "Interiores - ES"
    )
  })

  it("formats a cidade pick as 'Cidade - UF'", () => {
    expect(
      formatDestinationQuery({ areaId: "es-interiores", cidade: "Linhares" })
    ).toBe("Linhares - ES")
  })
})
