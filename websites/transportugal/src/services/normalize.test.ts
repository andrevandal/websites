import { describe, it, expect } from "bun:test"
import { normalizeCityName, toTitleCase } from "./normalize"

describe("normalizeCityName", () => {
  it("lowercases the input", () => {
    expect(normalizeCityName("SOROCABA")).toBe("sorocaba")
  })

  it("strips accents via NFD decomposition", () => {
    expect(normalizeCityName("São Paulo")).toBe("sao paulo")
    expect(normalizeCityName("Ibirité")).toBe("ibirite")
  })

  it("replaces hyphens with spaces so hyphenated and spaced forms match", () => {
    expect(normalizeCityName("Biritiba-Mirim")).toBe(
      normalizeCityName("Biritiba Mirim")
    )
  })

  it("replaces straight and curly apostrophes identically", () => {
    expect(normalizeCityName("Santa Bárbara d'Oeste")).toBe(
      normalizeCityName("Santa Bárbara d\u2019Oeste")
    )
  })

  it("replaces periods with spaces", () => {
    expect(normalizeCityName("S.Paulo")).toBe("s paulo")
  })

  it("collapses repeated whitespace and trims", () => {
    expect(normalizeCityName("  Rio   de   Janeiro  ")).toBe("rio de janeiro")
  })
})

describe("toTitleCase", () => {
  it("capitalizes an all-caps input", () => {
    expect(toTitleCase("SOROCABA")).toBe("Sorocaba")
  })

  it("keeps connector words lowercase", () => {
    expect(toTitleCase("SAO PAULO E DEMAIS CIDADES")).toBe(
      "Sao Paulo e Demais Cidades"
    )
  })

  it("handles d' contractions by keeping d lowercase", () => {
    expect(toTitleCase("D'ÁGUA")).toBe("d'Água")
  })

  it("capitalizes non-d apostrophe-prefixed words normally", () => {
    expect(toTitleCase("SANT'ANA")).toBe("Sant'Ana")
  })

  it("handles hyphenated names", () => {
    expect(toTitleCase("BIRITIBA-MIRIM")).toBe("Biritiba-Mirim")
  })
})
