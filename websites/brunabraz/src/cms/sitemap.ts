import { getEmDashCollection, getTaxonomyTerms } from "emdash"
import type { TaxonomyTerm } from "emdash"
import { getDb } from "emdash/runtime"
import type { SitemapUrl } from "@vandal-websites/robots-sitemap"
import { HOME_PAGE_SLUG } from "./pages"

type SeoOverride = { noIndex: boolean; canonical: string | null }
// id: database id (entry.data.id); slug: route slug (entry.id).
type SitemapEntry = { id: string; slug: string; updatedAt: Date }
type SitemapContent = {
  pages: SitemapEntry[]
  posts: SitemapEntry[]
  // Category tree; every Category and Subcategory has a page.
  categories: TaxonomyTerm[]
  // Keyed by `${collection}/${id}`; no row means indexable and self-canonical.
  seo: ReadonlyMap<string, SeoOverride>
}

const SITEMAP_URL_PATH = "/sitemap.xml"

const isSelfCanonical = (
  canonical: string,
  origin: string,
  path: string
): boolean => {
  try {
    const url = new URL(canonical, origin)
    const canonicalPath =
      url.pathname === "/" ? url.pathname : url.pathname.replace(/\/+$/, "")
    const entryPath = path === "/" ? path : path.replace(/\/+$/, "")
    return url.origin === new URL(origin).origin && canonicalPath === entryPath
  } catch {
    return true
  }
}

// Depth-first: a Category, then its Subcategories.
const categoryPaths = (terms: TaxonomyTerm[]): SitemapUrl[] =>
  terms.flatMap(term => [
    { path: `/blog/categoria/${term.slug}` },
    ...categoryPaths(term.children),
  ])

const sitemapUrls = (content: SitemapContent, origin: string): SitemapUrl[] => {
  const indexableUrl = (
    collection: "pages" | "posts",
    entry: SitemapEntry,
    path: string
  ): SitemapUrl | undefined => {
    const seo = content.seo.get(`${collection}/${entry.id}`)
    if (
      seo?.noIndex ||
      (seo?.canonical && !isSelfCanonical(seo.canonical, origin, path))
    )
      return undefined

    return { path, lastmod: entry.updatedAt }
  }

  return [
    ...content.pages.map(entry =>
      indexableUrl(
        "pages",
        entry,
        entry.slug === HOME_PAGE_SLUG ? "/" : `/${entry.slug}`
      )
    ),
    ...content.posts.map(entry =>
      indexableUrl("posts", entry, `/blog/${entry.slug}`)
    ),
    ...categoryPaths(content.categories),
  ].filter((url): url is SitemapUrl => url !== undefined)
}

const readSeoOverrides = async (): Promise<Map<string, SeoOverride>> => {
  const db = await getDb()
  const rows = await db
    .selectFrom("_emdash_seo")
    .select(["collection", "content_id", "seo_canonical", "seo_no_index"])
    .where("collection", "in", ["pages", "posts"])
    .where(eb =>
      eb.or([eb("seo_no_index", "=", 1), eb("seo_canonical", "is not", null)])
    )
    .execute()

  return new Map(
    rows.map(row => [
      `${row.collection}/${row.content_id}`,
      {
        noIndex: row.seo_no_index === 1,
        canonical: row.seo_canonical || null,
      },
    ])
  )
}

const toSitemapEntries = (
  entries: { id: string; data: { id: string; updatedAt: Date } }[]
): SitemapEntry[] =>
  entries.map(entry => ({
    id: entry.data.id,
    slug: entry.id,
    updatedAt: entry.data.updatedAt,
  }))

const loadSitemapUrls = async (origin: string): Promise<SitemapUrl[]> => {
  const [pagesResult, postsResult, categories, seo] = await Promise.all([
    getEmDashCollection("pages"),
    getEmDashCollection("posts"),
    getTaxonomyTerms("category", { includeCounts: false }),
    readSeoOverrides(),
  ])

  for (const result of [pagesResult, postsResult])
    if (result.error) throw result.error

  return sitemapUrls(
    {
      pages: toSitemapEntries(pagesResult.entries),
      posts: toSitemapEntries(postsResult.entries),
      categories,
      seo,
    },
    origin
  )
}

export { loadSitemapUrls, readSeoOverrides, SITEMAP_URL_PATH, sitemapUrls }
export type { SeoOverride, SitemapContent, SitemapEntry }
