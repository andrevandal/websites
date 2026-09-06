import Fuse from "fuse.js"
import { normalizeCityName } from "./normalize"

type IndexedEntry<T> = { item: T; norm: string }

export type SearchIndex<T> = {
  /** Every indexed item, in original order. */
  all: () => T[]
  /** Typo-tolerant search by normalized text. */
  search: (query: string, options?: { limit?: number }) => T[]
}

/**
 * Builds a typo-tolerant, accent-insensitive fuzzy search index over
 * `items`. `toSearchText` picks the raw text each item is matched against
 * (normalized internally via `normalizeCityName`) — kept separate from
 * whatever display label an item carries, so search matching isn't
 * affected by presentation formatting.
 */
export const createSearchIndex = <T>(
  items: T[],
  toSearchText: (item: T) => string,
  threshold = 0.35
): SearchIndex<T> => {
  const indexed: IndexedEntry<T>[] = items.map(item => ({
      item,
      norm: normalizeCityName(toSearchText(item)),
    })),
    fuse = new Fuse(indexed, { keys: ["norm"], threshold })

  return {
    all: () => indexed.map(entry => entry.item),
    search: (query, options) =>
      fuse
        .search(normalizeCityName(query), options)
        .map(result => result.item.item),
  }
}
