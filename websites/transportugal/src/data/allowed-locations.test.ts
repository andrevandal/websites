import { describe, it, expect } from "bun:test"
import { ALLOWED_LOCATIONS } from "./allowed-locations"
import { BRAZIL_CITIES } from "./brazil-cities.generated"
import { normalizeCityName } from "@/services/normalize"

describe("cross-source consistency guard", () => {
  it("every ALLOWED_LOCATIONS cidade resolves to exactly one BRAZIL_CITIES entry for its uf", () => {
    const byUf = new Map<string, Map<string, number>>()
    for (const city of BRAZIL_CITIES) {
      const norm = normalizeCityName(city.cidade),
        bucket = byUf.get(city.uf) ?? new Map<string, number>()
      bucket.set(norm, (bucket.get(norm) ?? 0) + 1)
      byUf.set(city.uf, bucket)
    }

    const offenders: string[] = []
    for (const area of ALLOWED_LOCATIONS) {
      const bucket = byUf.get(area.estado)
      for (const cidade of area.cidades) {
        const norm = normalizeCityName(cidade),
          count = bucket?.get(norm) ?? 0
        if (count !== 1) {
          offenders.push(
            `${cidade} (${area.estado}) matched ${count} BRAZIL_CITIES entries`
          )
        }
      }
    }

    expect(offenders).toEqual([])
  })
})
