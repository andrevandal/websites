import { getMenu, getTaxonomyTerms } from "emdash"
import type { TaxonomyTerm } from "emdash"

type NavLink = {
  id: string
  label: string
  href: string
  target?: string
  children: NavLink[]
}

const splitNavCategories = (
  topLevel: TaxonomyTerm[]
): { nav: TaxonomyTerm[]; more: TaxonomyTerm[] } => ({
  nav: topLevel.slice(0, 4),
  more: topLevel.slice(4),
})

const toCategoryLink = (term: TaxonomyTerm): NavLink => ({
  id: term.id,
  label: term.label,
  href: `/blog/categoria/${term.slug}`,
  children: term.children.map(toCategoryLink),
})

const loadSiteNavigation = async (): Promise<NavLink[]> =>
  ((await getMenu("primary"))?.items ?? []).map(item => ({
    id: item.id,
    label: item.label,
    href: item.url,
    target: item.target,
    children: [],
  }))

const loadBlogNavigation = async (): Promise<{
  links: NavLink[]
  more: NavLink[]
}> => {
  const terms = await getTaxonomyTerms("category", { includeCounts: false })
  const { nav, more } = splitNavCategories(terms.filter(t => !t.parentId))
  return { links: nav.map(toCategoryLink), more: more.map(toCategoryLink) }
}

export {
  splitNavCategories,
  toCategoryLink,
  loadSiteNavigation,
  loadBlogNavigation,
}
export type { NavLink }
