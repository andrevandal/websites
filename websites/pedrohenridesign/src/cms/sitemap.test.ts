import { describe, expect, test } from "bun:test"
import { sitemapPaths } from "./sitemap"

describe("sitemapPaths", () => {
  test("includes root path", () => {
    const paths = sitemapPaths([], [])
    expect(paths).toContain("/")
  })

  test("appends trailing slashes to category paths", () => {
    const paths = sitemapPaths([{ id: "identidade-visual" }], [])
    expect(paths).toContain("/categorias/identidade-visual/")
  })

  test("appends trailing slashes to post paths", () => {
    const paths = sitemapPaths([], [{ id: "my-post" }])
    expect(paths).toContain("/posts/my-post/")
  })

  test("includes all categories and posts with trailing slashes", () => {
    const categories = [{ id: "category-1" }, { id: "category-2" }]
    const posts = [{ id: "post-1" }, { id: "post-2" }, { id: "post-3" }]
    const paths = sitemapPaths(categories, posts)

    expect(paths).toEqual([
      "/",
      "/categorias/category-1/",
      "/categorias/category-2/",
      "/posts/post-1/",
      "/posts/post-2/",
      "/posts/post-3/",
    ])
  })
})
