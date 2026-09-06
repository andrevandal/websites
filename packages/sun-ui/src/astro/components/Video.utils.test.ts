import { describe, it, expect } from "bun:test"
import {
  buildVideoSources,
  isConstrainedConnection,
  canAutoplay,
} from "./Video.utils"

describe("buildVideoSources", () => {
  it("lists webm before mp4 when both are provided", () => {
    const result = buildVideoSources({ mp4: "a.mp4", webm: "a.webm" })
    expect(result).toEqual([
      { src: "a.webm", type: "video/webm" },
      { src: "a.mp4", type: "video/mp4" },
    ])
  })

  it("returns only mp4 when webm is not provided", () => {
    const result = buildVideoSources({ mp4: "a.mp4" })
    expect(result).toEqual([{ src: "a.mp4", type: "video/mp4" }])
  })
})

describe("isConstrainedConnection", () => {
  it("returns false when connection info is undefined", () => {
    expect(isConstrainedConnection(undefined)).toBe(false)
  })

  it("returns true when saveData is true", () => {
    expect(isConstrainedConnection({ saveData: true })).toBe(true)
  })

  it("returns true for slow-2g effectiveType", () => {
    expect(isConstrainedConnection({ effectiveType: "slow-2g" })).toBe(true)
  })

  it("returns true for 2g effectiveType", () => {
    expect(isConstrainedConnection({ effectiveType: "2g" })).toBe(true)
  })

  it("returns false for 4g effectiveType", () => {
    expect(isConstrainedConnection({ effectiveType: "4g" })).toBe(false)
  })
})

describe("canAutoplay", () => {
  it("returns true when connection is good and motion is not reduced", () => {
    expect(canAutoplay({ effectiveType: "4g" }, false)).toBe(true)
  })

  it("returns false when the connection is constrained", () => {
    expect(canAutoplay({ saveData: true }, false)).toBe(false)
  })

  it("returns false when the visitor prefers reduced motion", () => {
    expect(canAutoplay({ effectiveType: "4g" }, true)).toBe(false)
  })

  it("returns true when connection info is unavailable and motion is not reduced", () => {
    expect(canAutoplay(undefined, false)).toBe(true)
  })
})
