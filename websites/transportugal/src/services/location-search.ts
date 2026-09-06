import { ALLOWED_LOCATIONS } from "@/data/allowed-locations"
import { createSearchIndex } from "./search-index"

type LocationMatch =
  | { type: "area"; areaId: string; label: string }
  | { type: "cidade"; areaId: string; cidade: string; label: string }

type LocationCandidate = { match: LocationMatch; searchText: string }

const buildCandidates = (): LocationCandidate[] => {
  const candidates: LocationCandidate[] = []
  for (const area of ALLOWED_LOCATIONS) {
    candidates.push({
      match: {
        type: "area",
        areaId: area.id,
        label: `${area.nome} - ${area.estado}`,
      },
      searchText: area.nome,
    })
    for (const cidade of area.cidades) {
      candidates.push({
        match: {
          type: "cidade",
          areaId: area.id,
          cidade,
          label: `${cidade} - ${area.estado}`,
        },
        searchText: cidade,
      })
    }
  }
  return candidates
}

const locationIndex = createSearchIndex(
  buildCandidates(),
  candidate => candidate.searchText
)

const searchAllowedLocations = (query: string): LocationMatch[] => {
  if (query.trim() === "") return locationIndex.all().map(c => c.match)
  return locationIndex.search(query).map(c => c.match)
}

export type { LocationMatch }
export { searchAllowedLocations }
