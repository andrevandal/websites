import { describe, expect, test } from "bun:test"
import { mediaFormat, mediaSource, mediaUrl, text } from "#/index"

const page = (publicUrl?: (key: string) => string | undefined) => ({
  url: new URL("https://site.example.com/posts/x"),
  locals: { emdash: publicUrl ? { getPublicMediaUrl: publicUrl } : undefined },
})

describe("mediaUrl", () => {
  test("prefers the public bucket URL for a storage key", () => {
    expect(
      mediaUrl(
        { storageKey: "images/a.png", url: "https://old.example.com/a.png" },
        page(key => `https://assets.example.com/${key}`)
      )
    ).toBe("https://assets.example.com/images/a.png")
  })

  test("uses the encoded Worker route when public storage is unavailable", () => {
    expect(mediaUrl({ storageKey: "images/a b.png" }, page())).toBe(
      "https://site.example.com/_emdash/api/media/file/images%2Fa%20b.png"
    )
    expect(
      mediaUrl(
        { storageKey: "a.png" },
        page(() => undefined)
      )
    ).toBe("https://site.example.com/_emdash/api/media/file/a.png")
  })

  test("resolves an encoded internal media URL through public storage", () => {
    expect(
      mediaUrl(
        { url: "/_emdash/api/media/file/images%2Fa.png", id: "other" },
        page(key => `https://assets.example.com/${key}`)
      )
    ).toBe("https://assets.example.com/images/a.png")
  })

  test("resolves an absolute internal URL with the admin cache-buster query", () => {
    expect(
      mediaUrl(
        {
          url: "https://other.example.com/_emdash/api/media/file/a.jpg?_emdash_media=sha1%3Aabc",
        },
        page(key => `https://assets.example.com/${key}`)
      )
    ).toBe("https://assets.example.com/a.jpg")
  })

  test("preserves external and site-relative URLs", () => {
    expect(mediaUrl({ url: "https://assets.example.com/a.png" }, page())).toBe(
      "https://assets.example.com/a.png"
    )
    expect(mediaUrl({ url: "/images/a.svg" }, page())).toBe(
      "https://site.example.com/images/a.svg"
    )
  })

  test("falls back to the media id, or an empty source", () => {
    expect(mediaUrl({ id: "media-id" }, page())).toBe(
      "https://site.example.com/_emdash/api/media/file/media-id"
    )
    expect(mediaUrl({}, page())).toBe("")
  })
})

describe("mediaSource", () => {
  test("resolves CMS image storage metadata through the public resolver", () => {
    expect(
      mediaSource(
        { id: "media-id", src: "", meta: { storageKey: "a.png" } },
        page(key => `https://assets.example.com/${key}`)
      )
    ).toBe("https://assets.example.com/a.png")
  })

  test("preserves external media and ignores non-string storage metadata", () => {
    expect(
      mediaSource(
        {
          id: "media-id",
          src: "https://assets.example.com/a.jpg",
          meta: { storageKey: 3 },
        },
        page()
      )
    ).toBe("https://assets.example.com/a.jpg")
  })

  test("returns an empty source without media", () => {
    expect(mediaSource(undefined, page())).toBe("")
    expect(mediaSource(null, page())).toBe("")
  })
})

test("mediaFormat preserves animated GIF output", () => {
  expect(mediaFormat({ mimeType: "image/gif" })).toBe("gif")
  expect(mediaFormat({ mimeType: "image/png" })).toBe("auto")
  expect(mediaFormat({})).toBe("auto")
})

test("text accepts only nonempty strings", () => {
  expect(text("value")).toBe("value")
  expect(text("")).toBeUndefined()
  expect(text(1)).toBeUndefined()
})
