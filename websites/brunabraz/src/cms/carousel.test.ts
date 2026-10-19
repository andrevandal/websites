import { describe, expect, it } from "bun:test"
import { pickCarouselPosts } from "./carousel"

// Lists arrive newest first, as the route queries them.
const posts = (...ids: string[]) => ids.map(id => ({ id }))
const ids = (list: { id: string }[]) => list.map(post => post.id)

describe("pickCarouselPosts", () => {
  it("puts the Featured post first, then the two newest others", () => {
    const featured = posts("f1")
    const latest = posts("a", "b", "c", "d", "e")
    expect(ids(pickCarouselPosts(featured, latest))).toEqual(["f1", "a", "b"])
  })

  it("gives the newest three when four posts are Featured", () => {
    const featured = posts("f1", "f2", "f3", "f4")
    expect(ids(pickCarouselPosts(featured, posts("a", "b")))).toEqual([
      "f1",
      "f2",
      "f3",
    ])
  })

  it("gives an empty list without posts", () => {
    expect(pickCarouselPosts([], [])).toEqual([])
  })

  it("does not repeat a Featured post that is also among the newest", () => {
    const featured = posts("f1")
    const latest = posts("f1", "a", "b", "c")
    expect(ids(pickCarouselPosts(featured, latest))).toEqual(["f1", "a", "b"])
  })

  it("holds fewer than three when there are fewer posts", () => {
    expect(ids(pickCarouselPosts([], posts("a", "b")))).toEqual(["a", "b"])
  })
})
