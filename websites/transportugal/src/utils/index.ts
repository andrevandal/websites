import { findAreaById } from "@/services/coverage"
import { toTitleCase } from "@/services/normalize"
import type { Area } from "@/data/allowed-locations"
import type { LocationMatch } from "@/services/location-search"
import type { BrazilCity } from "@/data/brazil-cities.generated"

type Origin = { cidade: string; uf: string }
type Destination = { areaId: string; cidade?: string }

const buildInitialComboboxItems = (
    destinations: Area[]
  ): { originItems: BrazilCity[]; destinationItems: LocationMatch[] } => {
    const result = destinations.reduce(
      (acc, area) => {
        acc.destinationItems.push({
          type: "area",
          areaId: area.id,
          label: `${area.nome} - ${area.estado}`,
        })
        for (const cidade of area.cidades) {
          // BRAZIL_CITIES (searchOrigin's backing data) stores cidade names
          // uppercase; Area.cidades stores them Title Case. Normalize to
          // uppercase here so a seeded pick and a searched pick of the same
          // city produce the identical originToValue token
          // (`${cidade}|${uf}`) -- otherwise the two can't be matched
          // against each other, and originCidade would silently differ in
          // case depending on which list produced the pick. originToLabel
          // already runs the display value through toTitleCase, so display
          // is unaffected.
          acc.originItems.push({
            cidade: cidade.toUpperCase(),
            uf: area.estado,
          })
          acc.destinationItems.push({
            type: "cidade",
            areaId: area.id,
            cidade,
            label: `${cidade} - ${area.estado}`,
          })
        }
        return acc
      },
      {
        originItems: [] as BrazilCity[],
        destinationItems: [] as LocationMatch[],
      }
    )
    result.originItems.sort((a, b) => a.cidade.localeCompare(b.cidade))
    return result
  },
  originToValue = (city: BrazilCity): string => `${city.cidade}|${city.uf}`,
  originToLabel = (city: BrazilCity): string =>
    `${toTitleCase(city.cidade)} - ${city.uf}`,
  parseOriginValue = (value: string | undefined): Origin | null => {
    if (!value) return null
    const parts = value.split("|"),
      cidade = parts[0],
      uf = parts[1]
    if (cidade === undefined || uf === undefined) return null
    return { cidade, uf }
  },
  shouldSearchOrigin = (query: string): boolean => query.trim().length > 0,
  shouldSearchDestination = (query: string): boolean => query.trim().length > 0,
  destinationToValue = (m: LocationMatch): string =>
    m.type === "area" ? `area:${m.areaId}` : `cidade:${m.areaId}:${m.cidade}`,
  destinationToLabel = (m: LocationMatch): string => m.label,
  destinationGroupKey = (m: LocationMatch): string | undefined =>
    findAreaById(m.areaId)?.nome,
  parseDestinationValue = (value: string | undefined): Destination | null => {
    if (!value) return null
    const parts = value.split(":"),
      kind = parts[0],
      areaId = parts[1]
    if (areaId === undefined) return null
    return kind === "area" ? { areaId } : { areaId, cidade: parts[2] }
  },
  formatDestinationQuery = (destination: Destination | null): string => {
    if (!destination) return ""
    const area = findAreaById(destination.areaId)
    if (!area) return ""
    return destination.cidade
      ? `${destination.cidade} - ${area.estado}`
      : `${area.nome} - ${area.estado}`
  }

export {
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
}
