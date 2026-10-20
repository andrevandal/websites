import { describe, expect, test } from "bun:test"
import { resolveImageLayout } from "./image-layout"

const ratio = (l: ReturnType<typeof resolveImageLayout>) =>
  l.baseWidth / l.baseHeight

describe("resolveImageLayout", () => {
  test("width-only display keeps the original aspect ratio", () => {
    const layout = resolveImageLayout(
      { displayWidth: 240 },
      { width: 3600, height: 2400 },
      {}
    )
    expect(layout.maxWidth).toBe(240)
    expect(layout.baseWidth).toBe(240)
    expect(ratio(layout)).toBeCloseTo(3 / 2, 2)
  })

  test("height-only display derives the width cap", () => {
    const layout = resolveImageLayout(
      { displayHeight: 80 },
      { width: 3600, height: 2400 },
      {}
    )
    expect(layout.maxWidth).toBe(120)
  })

  test("both display dimensions use the authored ratio", () => {
    const layout = resolveImageLayout(
      { displayWidth: 240, displayHeight: 120 },
      { width: 3600, height: 2400 },
      {}
    )
    expect(ratio(layout)).toBeCloseTo(2, 2)
  })

  test("original width never becomes a sizing cap", () => {
    const layout = resolveImageLayout({}, { width: 3600, height: 2400 }, {})
    expect(layout.maxWidth).toBeUndefined()
    expect(layout.baseWidth).toBe(343)
    expect(layout.breakpoints.map(b => b.width)).toEqual([432, 896, 1152])
    expect(layout.sizes).toBe(
      "auto, (min-width: 1280px) 1152px, (min-width: 1024px) 896px, (min-width: 464px) 432px, calc(100vw - 32px)"
    )
  })

  test("a cap clamps every tier and the fallback sizes", () => {
    const layout = resolveImageLayout({ displayWidth: 240 }, {}, {})
    expect(layout.breakpoints.map(b => b.width)).toEqual([240, 240, 240])
    expect(layout.sizes).toContain("(min-width: 1280px) min(240px, 1152px)")
    expect(layout.sizes.endsWith("min(240px, calc(100vw - 32px))")).toBe(true)
  })

  test("falls back block -> asset -> metadata, then 3:2, then 1200x800", () => {
    expect(
      ratio(resolveImageLayout({ width: 900 }, { height: 100 }, {}))
    ).toBeCloseTo(9, 0)
    expect(
      ratio(resolveImageLayout({}, {}, { width: 600, height: 400 }))
    ).toBeCloseTo(1.5)
    expect(ratio(resolveImageLayout({ width: 500 }, {}, {}))).toBeCloseTo(1.5)
    expect(ratio(resolveImageLayout({}, {}, {}))).toBeCloseTo(1.5)
    expect(
      ratio(resolveImageLayout({ width: -5, height: NaN }, {}, {}))
    ).toBeCloseTo(1.5)
  })
})
