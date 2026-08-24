import { describe, it, expect } from "bun:test"
import {
  wrapLoopPosition,
  getKeyboardScrollDelta,
  shouldDisableSnap,
} from "./Carousel.svelte.utils"

describe("wrapLoopPosition", () => {
  it("returns pos unchanged when loopWidth is 0", () => {
    expect(wrapLoopPosition(42, 0)).toBe(42)
  })

  it("returns pos unchanged when already within [0, loopWidth)", () => {
    expect(wrapLoopPosition(50, 100)).toBe(50)
  })

  it("wraps a pos at or past loopWidth back into range", () => {
    expect(wrapLoopPosition(120, 100)).toBe(20)
  })

  it("wraps a negative pos up into range using floored modulo", () => {
    expect(wrapLoopPosition(-10, 100)).toBe(90)
  })

  it("wraps a pos exactly equal to loopWidth to 0", () => {
    expect(wrapLoopPosition(100, 100)).toBe(0)
  })
})

describe("getKeyboardScrollDelta", () => {
  it("returns a positive delta of slideWidth + gap for ArrowRight", () => {
    expect(getKeyboardScrollDelta("ArrowRight", 280, 24)).toBe(304)
  })

  it("returns a negative delta of slideWidth + gap for ArrowLeft", () => {
    expect(getKeyboardScrollDelta("ArrowLeft", 280, 24)).toBe(-304)
  })
})

describe("shouldDisableSnap", () => {
  it("disables snap when the container is wider than the content", () => {
    expect(shouldDisableSnap(800, 600)).toBe(true)
  })

  it("disables snap when the container exactly matches content width", () => {
    expect(shouldDisableSnap(600, 600)).toBe(true)
  })

  it("keeps snap enabled when content overflows the container", () => {
    expect(shouldDisableSnap(600, 800)).toBe(false)
  })
})
