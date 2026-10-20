import { getEmDashCollection } from "emdash"

const CAROUSEL_SIZE = 3

// Featured posts first, then the newest others, up to three and without
// repeats. Both lists arrive newest first.
const pickCarouselPosts = <T extends { id: string }>(
  featured: T[],
  latest: T[]
): T[] => {
  const picked: T[] = []
  const seen = new Set<string>()
  for (const post of [...featured, ...latest]) {
    if (picked.length === CAROUSEL_SIZE) break
    if (!seen.has(post.id)) {
      seen.add(post.id)
      picked.push(post)
    }
  }
  return picked
}

// The blog home's carousel posts. Every grid batch on the blog home excludes
// them, including the ones loaded by "Ver mais".
const loadCarouselPosts = async () => {
  const query = {
    status: "published",
    orderBy: { published_at: "desc" },
  } as const
  const [featured, latest] = await Promise.all([
    getEmDashCollection("posts", {
      ...query,
      where: { featured: "1" },
      limit: CAROUSEL_SIZE,
    }),
    getEmDashCollection("posts", { ...query, limit: CAROUSEL_SIZE * 2 }),
  ])
  return pickCarouselPosts(featured.entries, latest.entries)
}

export { CAROUSEL_SIZE, loadCarouselPosts, pickCarouselPosts }
