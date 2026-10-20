import { z } from "astro/zod"
import { getEmDashCollection, getTermsForEntries } from "emdash"
import type { ContentEntry, TaxonomyTerm, WhereValue } from "emdash"
import type { Post } from "../../emdash-env"
import { loadCarouselPosts } from "./carousel"
import { categoryScope } from "./category"

type GridPosts<T> = {
  posts: T[]
  terms: Map<string, TaxonomyTerm | undefined>
  hasMore: boolean
}

const PAGE_SIZE = 6
// Caps `?pagina=`: each page renders every batch up to it.
const MAX_PAGES = 50

const pageSchema = z.coerce.number().int().min(1).max(MAX_PAGES)

// `?pagina=N` is the grid's only state: the page renders batches 1..N and
// "Ver mais" loads N + 1, so a reload or a shared link shows the same grid.
// Anything invalid reads as the first page.
const parsePage = (value: string | null): number => {
  const parsed = pageSchema.safeParse(value)
  return parsed.success ? parsed.data : 1
}

// One grid batch: the posts to show, how many fetched rows were walked to
// fill the batch (excluded rows count too), and whether another batch has posts.
type TakenPage<T> = { posts: T[]; consumed: number; hasMore: boolean }

const excludePosts = <T extends { id: string }>(
  posts: T[],
  shown: { id: string }[]
): T[] => {
  const shownIds = new Set(shown.map(s => s.id))
  return posts.filter(post => !shownIds.has(post.id))
}

const takePage = <T extends { id: string }>(
  rows: T[],
  shown: { id: string }[],
  pageSize: number,
  moreRowsExist: boolean
): TakenPage<T> => {
  const shownIds = new Set(shown.map(s => s.id))
  const posts: T[] = []
  let consumed = 0
  let foundEnough = false

  for (const [index, row] of rows.entries()) {
    consumed = index + 1

    if (!shownIds.has(row.id)) {
      posts.push(row)
      if (posts.length === pageSize) {
        foundEnough = true
        break
      }
    }
  }

  // If we found enough posts, check if there's more
  let hasMore = moreRowsExist
  if (foundEnough && !hasMore) {
    // Check if there are any non-shown rows after consumed
    hasMore = rows.slice(consumed).some(r => !shownIds.has(r.id))
  }

  return { posts, consumed, hasMore }
}

// Batches 1..pages of a grid, newest first, without the `shown` posts.
const loadGridPosts = async ({
  pages,
  shown = [],
  where,
}: {
  pages: number
  shown?: { id: string }[]
  where?: Record<string, WhereValue>
}): Promise<GridPosts<ContentEntry<Post>>> => {
  const pageSize = pages * PAGE_SIZE
  const result = await getEmDashCollection("posts", {
    status: "published",
    where,
    orderBy: { published_at: "desc" },
    limit: pageSize + shown.length,
  })

  const { posts, hasMore } = takePage(
    result.entries,
    shown,
    pageSize,
    result.hasMore ?? false
  )

  // `getTermsForEntries` matches against the real database id
  // (`post.data.id`, a ULID), not `post.id` (the routable slug) - the two
  // differ for every entry in a slug-routed collection. The output map stays
  // keyed by `post.id` to match how PostGrid/PostCard look posts up.
  const dbIdToSlug = new Map(posts.map(p => [p.data.id, p.id]))
  const termMap = await getTermsForEntries(
    "posts",
    [...dbIdToSlug.keys()],
    "category"
  )

  const terms = new Map<string, TaxonomyTerm | undefined>()
  for (const [dbId, slug] of dbIdToSlug) {
    const categoryTerms = termMap.get(dbId) ?? []
    terms.set(slug, categoryTerms[0])
  }

  // `?pagina=` past the cap reads as page 1, so the last page offers no more.
  return { posts, terms, hasMore: hasMore && pages < MAX_PAGES }
}

// The blog home's grid leaves out the carousel posts on every page.
const loadBlogGrid = async (pages: number) => {
  const carousel = await loadCarouselPosts()
  return { carousel, ...(await loadGridPosts({ pages, shown: carousel })) }
}

// A Category page lists its own posts and its Subcategories'.
const loadCategoryGrid = (term: TaxonomyTerm, pages: number) =>
  loadGridPosts({ pages, where: { category: categoryScope(term) } })

export {
  MAX_PAGES,
  PAGE_SIZE,
  excludePosts,
  loadBlogGrid,
  loadCategoryGrid,
  parsePage,
  takePage,
}
export type { GridPosts, TakenPage }
