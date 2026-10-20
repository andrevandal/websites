import { describe, expect, it } from "bun:test"
import { MAX_PAGES, excludePosts, parsePage, takePage } from "./posts"
import type { TakenPage } from "./posts"

describe("excludePosts", () => {
  it("filters out posts by id", () => {
    const posts = [
      { id: "1", title: "Post 1" },
      { id: "2", title: "Post 2" },
      { id: "3", title: "Post 3" },
    ]
    const shown = [{ id: "2" }]
    const result = excludePosts(posts, shown)
    expect(result).toEqual([
      { id: "1", title: "Post 1" },
      { id: "3", title: "Post 3" },
    ])
  })

  it("returns all posts when shown is empty", () => {
    const posts = [
      { id: "1", title: "Post 1" },
      { id: "2", title: "Post 2" },
    ]
    const result = excludePosts(posts, [])
    expect(result).toEqual(posts)
  })

  it("returns empty array when all posts are shown", () => {
    const posts = [{ id: "1", title: "Post 1" }]
    const shown = [{ id: "1" }]
    const result = excludePosts(posts, shown)
    expect(result).toEqual([])
  })
})

describe("takePage", () => {
  it("takes the requested page size from available posts", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ id: String(i) }))
    const shown: { id: string }[] = []
    const result = takePage(rows, shown, 6, false)
    expect(result.posts).toHaveLength(6)
    expect(result.consumed).toBe(6)
    expect(result.hasMore).toBe(true)
  })

  it("skips shown posts and fills with non-shown posts", () => {
    const rows = [
      { id: "0" },
      { id: "1" },
      { id: "2" },
      { id: "3" },
      { id: "4" },
      { id: "5" },
      { id: "6" },
      { id: "7" },
      { id: "8" },
    ]
    const shown = [{ id: "4" }, { id: "6" }, { id: "8" }]
    const result = takePage(rows, shown, 6, false)
    expect(result.posts).toHaveLength(6)
    expect(result.posts.map(p => p.id)).toEqual(["0", "1", "2", "3", "5", "7"])
    expect(result.consumed).toBe(8)
    expect(result.hasMore).toBe(false)
  })

  it("looks past consumed window for non-excluded rows to determine hasMore", () => {
    const rows = [
      { id: "0" },
      { id: "1" },
      { id: "2" },
      { id: "3" },
      { id: "4" },
      { id: "5" },
      { id: "6" },
      { id: "7" },
      { id: "8" },
    ]
    const shown = [{ id: "4" }, { id: "6" }, { id: "8" }]
    const result = takePage(rows, shown, 6, false)
    // consumed is 8, hasMore should be false because rows[8] (the 9th row) is shown
    expect(result.hasMore).toBe(false)
  })

  it("respects moreRowsExist when no more rows after consumed window", () => {
    const rows = [
      { id: "0" },
      { id: "1" },
      { id: "2" },
      { id: "3" },
      { id: "4" },
      { id: "5" },
    ]
    const shown: { id: string }[] = []
    const result = takePage(rows, shown, 6, false)
    expect(result.posts).toHaveLength(6)
    expect(result.consumed).toBe(6)
    expect(result.hasMore).toBe(false)
  })

  it("returns hasMore true when moreRowsExist is true even if all loaded rows are consumed", () => {
    const rows = [
      { id: "0" },
      { id: "1" },
      { id: "2" },
      { id: "3" },
      { id: "4" },
      { id: "5" },
    ]
    const shown: { id: string }[] = []
    const result = takePage(rows, shown, 6, true)
    expect(result.posts).toHaveLength(6)
    expect(result.consumed).toBe(6)
    expect(result.hasMore).toBe(true)
  })

  it("handles a tail of only shown posts - no more button", () => {
    const rows = [
      { id: "0" },
      { id: "1" },
      { id: "2" },
      { id: "3" },
      { id: "4" },
      { id: "5" },
      { id: "6" },
      { id: "7" },
      { id: "8" },
    ]
    // All of rows 6,7,8 (tail) are shown; we still only consumed up to 6
    const shown = [{ id: "6" }, { id: "7" }, { id: "8" }]
    const result = takePage(rows, shown, 6, false)
    expect(result.posts).toHaveLength(6)
    expect(result.posts.map(p => p.id)).toEqual(["0", "1", "2", "3", "4", "5"])
    expect(result.consumed).toBe(6) // we walked up through row 5 to get 6 posts
    expect(result.hasMore).toBe(false) // rows 6-8 are all shown, no more available
  })
})

// Walks every "Ver mais" batch the way loadGridPosts and the partial route do:
// `?pagina=N` fetches N * pageSize + shown.length rows from the start, and
// batch N is what that adds past the first N - 1 batches.
const walkPages = (total: number, shown: { id: string }[], pageSize = 6) => {
  const all = Array.from({ length: total }, (_, i) => ({ id: `p${i}` }))
  const pages: string[][] = []
  for (let page = 1; ; page += 1) {
    const limit = page * pageSize + shown.length
    const grid: TakenPage<{ id: string }> = takePage(
      all.slice(0, limit),
      shown,
      page * pageSize,
      limit < total
    )
    pages.push(grid.posts.slice((page - 1) * pageSize).map(post => post.id))
    if (!grid.hasMore) break
  }
  return { all: all.map(post => post.id), pages }
}

describe("grid pages with carousel posts excluded", () => {
  it("never lists a carousel post and shows every other post exactly once", () => {
    const shown = [{ id: "p0" }, { id: "p4" }, { id: "p13" }]
    const { all, pages } = walkPages(15, shown)
    const listed = pages.flat()
    const shownIds = shown.map(post => post.id)
    expect(listed.filter(id => shownIds.includes(id))).toEqual([])
    expect(listed.toSorted()).toEqual(
      all.filter(id => !shownIds.includes(id)).toSorted()
    )
    expect(new Set(listed).size).toBe(listed.length)
  })

  it("fills every page but the last and leaves no empty page", () => {
    const { pages } = walkPages(15, [{ id: "p0" }, { id: "p4" }, { id: "p13" }])
    expect(pages.map(page => page.length)).toEqual([6, 6])
  })

  it("ends without an empty page when the carousel posts are the oldest", () => {
    const { pages } = walkPages(9, [{ id: "p6" }, { id: "p7" }, { id: "p8" }])
    expect(pages.map(page => page.length)).toEqual([6])
  })
})

describe("parsePage", () => {
  it("reads a valid ?pagina= value", () => {
    expect(parsePage("3")).toBe(3)
  })

  it("falls back to the first page when the param is missing or invalid", () => {
    for (const value of [null, "", "0", "-2", "1.5", "abc"])
      expect(parsePage(value)).toBe(1)
  })

  it("falls back to the first page above the page cap", () => {
    expect(parsePage(String(MAX_PAGES))).toBe(MAX_PAGES)
    expect(parsePage(String(MAX_PAGES + 1))).toBe(1)
  })
})
