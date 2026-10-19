import type { TaxonomyTerm } from "emdash"

type CategoryMatch = { term: TaxonomyTerm; parent: TaxonomyTerm | undefined }

// A Category page lists its own posts and those of its Subcategories.
const categoryScope = (term: TaxonomyTerm): string[] => [
  term.slug,
  ...term.children.map(child => child.slug),
]

// A Category page's SEO comes from the Category itself; its share image is
// the site's default.
const categorySeo = (term: TaxonomyTerm, siteName: string) => ({
  title: `${term.label} | ${siteName}`,
  description: term.description ?? "",
})

const walk = (
  terms: TaxonomyTerm[],
  predicate: (term: TaxonomyTerm) => boolean,
  parent?: TaxonomyTerm
): CategoryMatch | undefined => {
  for (const term of terms) {
    if (predicate(term)) return { term, parent }
    const found = walk(term.children, predicate, term)
    if (found) return found
  }
  return undefined
}

// Finds a Category by slug in the term tree, with its parent Category when it
// is a Subcategory (falling back to `parentId` if the list is flat).
const findCategory = (
  terms: TaxonomyTerm[],
  slug: string
): CategoryMatch | undefined => {
  const match = walk(terms, term => term.slug === slug)
  if (!match || match.parent || !match.term.parentId) return match
  const { parentId } = match.term
  return {
    term: match.term,
    parent: walk(terms, term => term.id === parentId)?.term,
  }
}

export { categoryScope, categorySeo, findCategory }
export type { CategoryMatch }
