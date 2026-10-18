import { describe, expect, test } from "bun:test"
import { findings, originalUrl } from "./audit-images"
import type { Intrinsic, Sighting } from "./audit-images"

const PAGE = "http://localhost:4321/posts/x/"
const SOURCE = "https://files.vandal.services/site/images/a.png"

describe("originalUrl", () => {
  test("unwraps an Astro /_image href", () => {
    const src = `/_image?href=${encodeURIComponent("http://localhost:4321/_emdash/api/media/file/k.png")}&w=1440&f=png`
    expect(originalUrl(src, PAGE)).toBe(
      "http://localhost:4321/_emdash/api/media/file/k.png"
    )
  })

  test("unwraps an image-service URL with an encoded source", () => {
    const src = `https://infra.example.invalid/w_375,h_211,f_auto/${encodeURIComponent(SOURCE)}`
    expect(originalUrl(src, PAGE)).toBe(SOURCE)
  })

  test("unwraps an image-service URL with a raw source", () => {
    expect(
      originalUrl(`https://infra.example.invalid/w_600/${SOURCE}`, PAGE)
    ).toBe(SOURCE)
  })

  test("keeps the source query string", () => {
    const src = `https://infra.example.invalid/w_300/${encodeURIComponent(`${SOURCE}?v=2`)}`
    expect(originalUrl(src, PAGE)).toBe(`${SOURCE}?v=2`)
  })

  test("leaves a direct image alone and resolves relative paths", () => {
    expect(originalUrl(SOURCE, PAGE)).toBe(SOURCE)
    expect(originalUrl("/images/a.png", PAGE)).toBe(
      "http://localhost:4321/images/a.png"
    )
  })
})

describe("findings", () => {
  const sighting = (width: number, viewport: number): Sighting => ({
    src: `https://infra.example.invalid/w_${width}/${SOURCE}`,
    width,
    viewport,
    page: PAGE,
  })

  test("compares the intrinsic width with the widest rendering", () => {
    const [finding] = findings(
      [sighting(400, 390), sighting(1152, 1280), sighting(960, 1024)],
      new Map<string, Intrinsic>([[SOURCE, { width: 1920, height: 1080 }]])
    )
    expect(finding).toMatchObject({
      original: SOURCE,
      rendered: 1152,
      viewport: 1280,
      ratio: 1920 / 1152,
    })
  })

  test("sorts the smallest ratio first and skips vector or unmeasured originals", () => {
    const other = "https://files.vandal.services/site/images/b.png"
    const vector = "https://files.vandal.services/site/images/c.svg"
    const result = findings(
      [
        sighting(600, 1280),
        { ...sighting(600, 1280), src: other },
        { ...sighting(600, 1280), src: vector },
        { ...sighting(600, 1280), src: "https://files.vandal.services/d.png" },
      ],
      new Map<string, Intrinsic>([
        [SOURCE, { width: 3000, height: 2000 }],
        [other, { width: 500, height: 400 }],
        [vector, "vector"],
      ])
    )
    expect(result.map(finding => finding.original)).toEqual([other, SOURCE])
  })
})
