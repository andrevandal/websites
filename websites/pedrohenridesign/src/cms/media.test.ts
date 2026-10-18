import { describe, expect, test } from "bun:test"
import { mediaUrl } from "./media"

const page = (publicUrl?: (key: string) => string) => ({
  url: new URL("https://pedrohenridesign.com.br/posts/x"),
  locals: {
    emdash: publicUrl ? { getPublicMediaUrl: publicUrl } : undefined,
  } as unknown as App.Locals,
})

describe("mediaUrl", () => {
  test("serves a storage key from the bucket public URL when there is one", () => {
    expect(
      mediaUrl(
        { storageKey: "01ABC.png" },
        page(key => `https://cdn.example/${key}`)
      )
    ).toBe("https://cdn.example/01ABC.png")
  })

  test("falls back to the site's own media route, absolute", () => {
    expect(mediaUrl({ storageKey: "01ABC.png" }, page())).toBe(
      "https://pedrohenridesign.com.br/_emdash/api/media/file/01ABC.png"
    )
  })

  test("resolves an internal media URL (Portable Text asset.url) through the bucket", () => {
    expect(
      mediaUrl(
        { url: "/_emdash/api/media/file/01ABC.png", id: "01XYZ" },
        page(key => `https://cdn.example/${key}`)
      )
    ).toBe("https://cdn.example/01ABC.png")
  })

  test("passes external URLs through untouched", () => {
    expect(
      mediaUrl({ url: "https://files.vandal.services/a.png" }, page())
    ).toBe("https://files.vandal.services/a.png")
  })

  test("falls back to the media id route, and to empty when nothing resolves", () => {
    expect(mediaUrl({ id: "01XYZ" }, page())).toBe(
      "https://pedrohenridesign.com.br/_emdash/api/media/file/01XYZ"
    )
    expect(mediaUrl({}, page())).toBe("")
  })
})
