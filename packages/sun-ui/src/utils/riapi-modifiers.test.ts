import { describe, expect, it } from "bun:test"
import { buildRiapiModifiers } from "./riapi-modifiers"

describe("buildRiapiModifiers", () => {
  it("returns the passthrough segment when no options are given", () => {
    expect(buildRiapiModifiers({})).toBe("_")
  })

  it("builds width and height modifiers, rounding fractional values", () => {
    expect(buildRiapiModifiers({ width: 800.4, height: 599.6 })).toBe(
      "w_800,h_600"
    )
  })

  it("includes a supported format", () => {
    expect(buildRiapiModifiers({ format: "webp" })).toBe("f_webp")
  })

  it("drops an unsupported format (svg)", () => {
    expect(buildRiapiModifiers({ format: "svg" })).toBe("_")
  })

  it("drops an unrecognized format string", () => {
    expect(buildRiapiModifiers({ format: "bogus" })).toBe("_")
  })

  it("passes through a numeric quality, clamped to 1-100", () => {
    expect(buildRiapiModifiers({ quality: 55 })).toBe("q_55")
    expect(buildRiapiModifiers({ quality: 150 })).toBe("q_100")
    expect(buildRiapiModifiers({ quality: 0 })).toBe("q_1")
  })

  it("maps quality presets to Astro's own Sharp-service values", () => {
    expect(buildRiapiModifiers({ quality: "low" })).toBe("q_25")
    expect(buildRiapiModifiers({ quality: "mid" })).toBe("q_50")
    expect(buildRiapiModifiers({ quality: "high" })).toBe("q_80")
    expect(buildRiapiModifiers({ quality: "max" })).toBe("q_100")
  })

  it("drops an unrecognized quality preset", () => {
    expect(buildRiapiModifiers({ quality: "ultra" })).toBe("_")
  })

  it("maps fit=fill to mode_stretch", () => {
    expect(buildRiapiModifiers({ fit: "fill" })).toBe("mode_stretch")
  })

  it("maps fit=cover to mode_crop", () => {
    expect(buildRiapiModifiers({ fit: "cover" })).toBe("mode_crop")
  })

  it("maps fit=contain, none, and scale-down to mode_max", () => {
    expect(buildRiapiModifiers({ fit: "contain" })).toBe("mode_max")
    expect(buildRiapiModifiers({ fit: "none" })).toBe("mode_max")
    expect(buildRiapiModifiers({ fit: "scale-down" })).toBe("mode_max")
  })

  it("drops an unrecognized fit value", () => {
    expect(buildRiapiModifiers({ fit: "bogus" })).toBe("_")
  })

  it("combines all modifiers in a fixed order: w,h,f,q,mode", () => {
    expect(
      buildRiapiModifiers({
        width: 800,
        height: 600,
        format: "webp",
        quality: 80,
        fit: "cover",
      })
    ).toBe("w_800,h_600,f_webp,q_80,mode_crop")
  })

  it("is secure against prototype-chain keys", () => {
    expect(buildRiapiModifiers({ quality: "constructor" })).toBe("_")
    expect(buildRiapiModifiers({ format: "toString" })).toBe("_")
  })
})
