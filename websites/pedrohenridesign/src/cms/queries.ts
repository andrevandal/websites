import { getEmDashCollection, getEmDashEntry } from "emdash"
import type { Category, Post } from "../../emdash-env"

// Entry `id` is the route slug; `data.id` is the database id.
type Entry<T> = { id: string; data: T }

type CategoryWithPosts = {
  slug: string
  entry: { data: Category }
  category: Category
  posts: Entry<Post>[]
}

const PER_CATEGORY_LIMIT = 100

// Newest first, by last publish.
const byNewest = (a: Entry<Post>, b: Entry<Post>): number =>
  (b.data.publishedAt?.getTime() ?? 0) - (a.data.publishedAt?.getTime() ?? 0)

const categoryWithPosts = async (
  slug: string
): Promise<CategoryWithPosts | undefined> => {
  const { entry, isPreview, error } = await getEmDashEntry("categories", slug, {
    references: { posts: { limit: PER_CATEGORY_LIMIT } },
  })
  if (error) throw error
  if (!entry || (entry.data.status !== "published" && !isPreview))
    return undefined

  return {
    slug: entry.id,
    entry,
    category: entry.data,
    posts: (entry.references?.posts.entries ?? [])
      .filter(post => post.data.status === "published")
      .toSorted(byNewest),
  }
}

// Categories shown on the home page, in `showcase` order.
const showcaseCategories = async (): Promise<CategoryWithPosts[]> => {
  const { entries, error } = await getEmDashCollection("categories", {
    status: "published",
  })
  if (error) throw error

  const showcased = entries
    .filter(entry => entry.data.showcase > 0)
    .toSorted((a, b) => a.data.showcase - b.data.showcase)
  const loaded = await Promise.all(showcased.map(e => categoryWithPosts(e.id)))

  return loaded.filter(
    (category): category is CategoryWithPosts => category !== undefined
  )
}

const publishedPost = async (slug: string) => {
  const { entry, isPreview, error } = await getEmDashEntry("posts", slug, {
    references: { category: true },
  })
  if (error) throw error
  if (!entry || (entry.data.status !== "published" && !isPreview))
    return undefined

  // A post's preview token must not expose another entry's draft.
  const referenced = entry.references?.category.entries[0]
  const category =
    referenced?.data.status === "published" ? referenced : undefined

  return {
    entry,
    post: entry.data,
    category: category?.data,
    categorySlug: category?.id,
  }
}

// The "inicio" entry of the pages collection is the home page: its SEO panel
// sets the home title, description and share image.
const HOME_PAGE_SLUG = "inicio"

const homePage = async () => {
  const { entry, error } = await getEmDashEntry("pages", HOME_PAGE_SLUG)
  if (error) throw error
  return entry?.data.status === "published" ? entry : undefined
}

export { categoryWithPosts, homePage, publishedPost, showcaseCategories }
export type { CategoryWithPosts, Entry }
