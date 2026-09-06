import { BRAZIL_CITIES } from "@/data/brazil-cities.generated"
import type { BrazilCity } from "@/data/brazil-cities.generated"
import { createSearchIndex } from "./search-index"

const brazilCitiesIndex = createSearchIndex(BRAZIL_CITIES, city => city.cidade)

export const searchBrazilCities = (query: string, limit = 20): BrazilCity[] => {
  if (query.trim() === "") return []
  return brazilCitiesIndex.search(query, { limit })
}

export type { BrazilCity }
