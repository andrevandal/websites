import { getEmDashCollection } from "emdash"

type SlugEntry = { id: string }

// Entry `id` is the route slug (see queries.ts).
const sitemapPaths = (
  categories: readonly SlugEntry[],
  posts: readonly SlugEntry[]
): string[] => [
  "/",
  ...categories.map(category => `/categorias/${category.id}/`),
  ...posts.map(post => `/posts/${post.id}/`),
]

const loadSitemapPaths = async (): Promise<string[]> => {
  const [categories, posts] = await Promise.all([
    getEmDashCollection("categories", { status: "published" }),
    getEmDashCollection("posts", { status: "published" }),
  ])

  for (const result of [categories, posts]) if (result.error) throw result.error

  return sitemapPaths(categories.entries, posts.entries)
}

export { loadSitemapPaths, sitemapPaths }
