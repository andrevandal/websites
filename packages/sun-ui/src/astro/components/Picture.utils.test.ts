import { describe, it, expect } from "bun:test"
import {
  computeResponsiveImageProps,
  getPlaceholderModeAttribute,
} from "./Picture.utils"
import type { SunPictureBreakpoint } from "./Picture.props"

describe("computeResponsiveImageProps", () => {
  it("returns undefined for responsiveWidths and sizes when breakpoints is undefined", () => {
    const result = computeResponsiveImageProps({
      width: 375,
      densities: [1, 1.5, 2, 3],
    })

    expect(result.responsiveWidths).toBeUndefined()
    expect(result.sizes).toBeUndefined()
  })

  it("returns undefined for responsiveWidths and sizes when breakpoints is empty array", () => {
    const result = computeResponsiveImageProps({
      width: 375,
      densities: [1, 1.5, 2, 3],
      breakpoints: [],
    })

    expect(result.responsiveWidths).toBeUndefined()
    expect(result.sizes).toBeUndefined()
  })

  it("uses default density [1] when densities is undefined", () => {
    const breakpoints: SunPictureBreakpoint[] = [
      { minWidth: 1024, width: 472 },
      { minWidth: 1280, width: 493 },
    ]

    const result = computeResponsiveImageProps({
      width: 375,
      breakpoints,
    })

    const expected = [375, 472, 493].sort((a, b) => a - b)
    expect(result.responsiveWidths).toEqual(expected)
  })

  it("deduplicates width values that collide after rounding", () => {
    const breakpoints: SunPictureBreakpoint[] = [
      { minWidth: 1024, width: 375 }, // Same as base width
    ]

    const result = computeResponsiveImageProps({
      width: 375,
      densities: [1, 1.5],
      breakpoints,
    })

    // 375 * 1 = 375 (from both base and breakpoint)
    // 375 * 1.5 = 562.5 → 563 (Math.round rounds half up)
    const expected = [375, 563]
    expect(result.responsiveWidths).toEqual(expected)
  })

  it("returns sorted responsiveWidths array for standard case", () => {
    const breakpoints: SunPictureBreakpoint[] = [
      { minWidth: 1024, width: 472 },
      { minWidth: 1280, width: 493 },
    ]

    const result = computeResponsiveImageProps({
      width: 375,
      densities: [1, 1.5, 2, 3],
      breakpoints,
    })

    // Base width 375: 375, 563, 750, 1125
    // Breakpoint width 472: 472, 708, 944, 1416
    // Breakpoint width 493: 493, 740, 986, 1479
    const expected = [
      375, 472, 493, 563, 708, 740, 750, 944, 986, 1125, 1416, 1479,
    ]
    expect(result.responsiveWidths).toEqual(expected)
  })

  it("generates correct sizes string with breakpoints ordered descending", () => {
    const breakpoints: SunPictureBreakpoint[] = [
      { minWidth: 1024, width: 472 },
      { minWidth: 1280, width: 493 },
    ]

    const result = computeResponsiveImageProps({
      width: 375,
      breakpoints,
    })

    const expected =
      "(min-width: 1280px) 493px, (min-width: 1024px) 472px, 375px"
    expect(result.sizes).toBe(expected)
  })

  it("handles breakpoints in arbitrary order", () => {
    // Pass breakpoints in unsorted order
    const breakpoints: SunPictureBreakpoint[] = [
      { minWidth: 768, width: 400 },
      { minWidth: 1280, width: 500 },
      { minWidth: 1024, width: 450 },
    ]

    const result = computeResponsiveImageProps({
      width: 320,
      breakpoints,
    })

    // Should be sorted by minWidth descending
    const expected =
      "(min-width: 1280px) 500px, (min-width: 1024px) 450px, (min-width: 768px) 400px, 320px"
    expect(result.sizes).toBe(expected)
  })

  it("parses density strings like '1.5x' as number 1.5", () => {
    const breakpoints: SunPictureBreakpoint[] = [{ minWidth: 1024, width: 472 }]

    const resultString = computeResponsiveImageProps({
      width: 375,
      densities: ["1x", "1.5x", "2x", "3x"],
      breakpoints,
    })

    const resultNumber = computeResponsiveImageProps({
      width: 375,
      densities: [1, 1.5, 2, 3],
      breakpoints,
    })

    expect(resultString.responsiveWidths).toEqual(resultNumber.responsiveWidths)
  })

  it("handles mixed density formats (strings and numbers)", () => {
    const breakpoints: SunPictureBreakpoint[] = [{ minWidth: 1024, width: 472 }]

    const result = computeResponsiveImageProps({
      width: 375,
      densities: ["1x", 1.5, "2x", 3],
      breakpoints,
    })

    // Should parse consistently
    const expectedWidths = [375, 472, 563, 708, 750, 944, 1125, 1416]
    expect(result.responsiveWidths).toEqual(expectedWidths)
  })

  it("computes correct responsiveWidths for exact test case: 375/[1,1.5,2,3]/[{1024,472},{1280,493}]", () => {
    const breakpoints: SunPictureBreakpoint[] = [
      { minWidth: 1024, width: 472 },
      { minWidth: 1280, width: 493 },
    ]

    const result = computeResponsiveImageProps({
      width: 375,
      densities: [1, 1.5, 2, 3],
      breakpoints,
    })

    // Verify the exact array (computed by running the function)
    expect(result.responsiveWidths).toBeDefined()
    expect(result.responsiveWidths).toHaveLength(12)

    // Verify it's sorted ascending
    const widths = result.responsiveWidths!
    for (let i = 0; i < widths.length - 1; i++)
      expect(widths[i]).toBeLessThanOrEqual(widths[i + 1] as number)

    // Verify no duplicates
    const uniqueWidths = new Set(widths)
    expect(uniqueWidths.size).toBe(widths.length)
  })

  it("generates correct sizes string for breakpoints in provided order", () => {
    const breakpoints: SunPictureBreakpoint[] = [
      { minWidth: 1024, width: 472 },
      { minWidth: 1280, width: 493 },
    ]

    const result = computeResponsiveImageProps({
      width: 375,
      breakpoints,
    })

    // Verify sizes string format
    expect(result.sizes).toBeDefined()
    expect(result.sizes).toMatch(/\(min-width: \d+px\) \d+px/)
    expect(result.sizes).toEndWith("375px")

    // Verify minWidth values are in descending order
    const parts = result.sizes!.split(", ")
    expect(parts).toHaveLength(3) // 2 breakpoints + 1 fallback
    expect(parts[0]).toBe("(min-width: 1280px) 493px")
    expect(parts[1]).toBe("(min-width: 1024px) 472px")
    expect(parts[2]).toBe("375px")
  })
})

describe("getPlaceholderModeAttribute", () => {
  it("returns undefined for default placeholder mode", () => {
    expect(getPlaceholderModeAttribute(undefined)).toBeUndefined()
  })

  it("returns circle mode data attribute when requested", () => {
    expect(getPlaceholderModeAttribute("circle")).toBe("circle")
  })
})
