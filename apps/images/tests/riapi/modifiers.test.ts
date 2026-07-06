import { describe, expect, test } from "bun:test"
import { parseModifiers } from "@/riapi/modifiers"

describe("parseModifiers canonicalization", () => {
  test("parses basic width modifier", () => {
    const result = parseModifiers("w_800")
    expect(result.width).toBe(800)
    expect(result.format).toBe("auto")
    expect(result.mode).toBe("max")
    expect(result.scale).toBe("down")
  })

  test("parses height modifier", () => {
    const result = parseModifiers("h_600")
    expect(result.height).toBe(600)
  })

  test("parses width and height together", () => {
    const result = parseModifiers("w_800,h_600")
    expect(result.width).toBe(800)
    expect(result.height).toBe(600)
  })

  test("resolves width alias 'w' to 'width'", () => {
    const withAlias = parseModifiers("w_800")
    const canonical = parseModifiers("width_800")
    expect(withAlias.width).toBe(canonical.width)
    expect(withAlias.width).toBe(800)
  })

  test("resolves height alias 'h' to 'height'", () => {
    const withAlias = parseModifiers("h_600")
    const canonical = parseModifiers("height_600")
    expect(withAlias.height).toBe(canonical.height)
    expect(withAlias.height).toBe(600)
  })

  test("resolves format alias 'f' to 'format'", () => {
    const withAlias = parseModifiers("f_webp")
    const canonical = parseModifiers("format_webp")
    expect(withAlias.format).toBe(canonical.format)
    expect(withAlias.format).toBe("webp")
  })

  test("resolves quality alias 'q' to 'quality'", () => {
    const withAlias = parseModifiers("q_80")
    const canonical = parseModifiers("quality_80")
    expect(withAlias.quality).toBe(canonical.quality)
    expect(withAlias.quality).toBe(80)
  })

  test("resolves brightness alias 'br' to 'brightness'", () => {
    const withAlias = parseModifiers("br_1.2")
    const canonical = parseModifiers("brightness_1.2")
    expect(withAlias.brightness).toBe(canonical.brightness)
  })

  test("resolves saturation alias 'sat' to 'saturation'", () => {
    const withAlias = parseModifiers("sat_1.5")
    const canonical = parseModifiers("saturation_1.5")
    expect(withAlias.saturation).toBe(canonical.saturation)
  })

  test("case-insensitive parsing - uppercase key", () => {
    const result = parseModifiers("W_800")
    expect(result.width).toBe(800)
  })

  test("case-insensitive parsing - mixed case key", () => {
    const result = parseModifiers("Width_800")
    expect(result.width).toBe(800)
  })

  test("case-insensitive parsing - mode key with lowercase value", () => {
    const result = parseModifiers("mode_stretch")
    expect(result.mode).toBe("stretch")
  })

  test("case-insensitive parsing - mode key uppercase", () => {
    const result = parseModifiers("MODE_stretch")
    expect(result.mode).toBe("stretch")
  })

  test("case-insensitive parsing - format key with lowercase value", () => {
    const result = parseModifiers("format_webp")
    expect(result.format).toBe("webp")
  })

  test("parses gif format", () => {
    const result = parseModifiers("f_gif")
    expect(result.format).toBe("gif")
  })

  test("order-independence: w,h same as h,w", () => {
    const order1 = parseModifiers("w_800,h_600")
    const order2 = parseModifiers("h_600,w_800")
    expect(order1.width).toBe(order2.width)
    expect(order1.height).toBe(order2.height)
  })

  test("order-independence: complex modifiers", () => {
    const order1 = parseModifiers("w_800,h_600,f_webp,q_80")
    const order2 = parseModifiers("q_80,f_webp,h_600,w_800")
    expect(order1.width).toBe(order2.width)
    expect(order1.height).toBe(order2.height)
    expect(order1.format).toBe(order2.format)
    expect(order1.quality).toBe(order2.quality)
  })

  test("underscore separator passthrough", () => {
    const result = parseModifiers("_")
    expect(result.width).toBeUndefined()
    expect(result.height).toBeUndefined()
    expect(result.format).toBe("auto")
    expect(result.mode).toBe("max")
    expect(result.scale).toBe("down")
  })

  test("parses mode modifier", () => {
    const result = parseModifiers("mode_stretch")
    expect(result.mode).toBe("stretch")
  })

  test("parses scale modifier", () => {
    const result = parseModifiers("scale_both")
    expect(result.scale).toBe("both")
  })

  test("parses rotate modifier", () => {
    const result = parseModifiers("rotate_90")
    expect(result.rotate).toBe(90)
  })

  test("parses flip modifier", () => {
    const result = parseModifiers("flip_xy")
    expect(result.flip).toBe("xy")
  })

  test("parses compression modifier", () => {
    const result = parseModifiers("compression_9")
    expect(result.compression).toBe(9)
  })

  test("ignores unknown modifier keys", () => {
    const result = parseModifiers("w_800,unknownkey_value")
    expect(result.width).toBe(800)
    expect((result as Record<string, unknown>).unknownkey).toBeUndefined()
  })

  test("ignores unparseable numeric values", () => {
    const result = parseModifiers("w_notanumber,h_600")
    expect(result.width).toBeUndefined()
    expect(result.height).toBe(600)
  })

  test("both separators work: comma and ampersand", () => {
    const commaResult = parseModifiers("w_800,h_600")
    const ampResult = parseModifiers("w_800&h_600")
    expect(commaResult.width).toBe(ampResult.width)
    expect(commaResult.height).toBe(ampResult.height)
  })

  test("value separators: colon equals and underscore", () => {
    const underscore = parseModifiers("w_800")
    const colon = parseModifiers("w:800")
    const equals = parseModifiers("w=800")
    expect(underscore.width).toBe(800)
    expect(colon.width).toBe(800)
    expect(equals.width).toBe(800)
  })

  test("complex realistic example", () => {
    const result = parseModifiers(
      "w_1920,h_1080,f_auto,q_85,mode_stretch,rotate_270"
    )
    expect(result.width).toBe(1920)
    expect(result.height).toBe(1080)
    expect(result.format).toBe("auto")
    expect(result.quality).toBe(85)
    expect(result.mode).toBe("stretch")
    expect(result.rotate).toBe(270)
  })

  test("defaults when no modifiers given", () => {
    const result = parseModifiers("_")
    expect(result.width).toBeUndefined()
    expect(result.height).toBeUndefined()
    expect(result.format).toBe("auto")
    expect(result.mode).toBe("max")
    expect(result.scale).toBe("down")
    expect(result.flip).toBe("none")
  })

  test("parses brightness and saturation", () => {
    const result = parseModifiers("brightness_1.2,saturation_0.8")
    expect(result.brightness).toBe(1.2)
    expect(result.saturation).toBe(0.8)
  })
})
