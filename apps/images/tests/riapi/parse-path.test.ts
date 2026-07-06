import { describe, expect, test } from "bun:test"
import { parseRequestPath } from "@/riapi/parse-path"

describe("parseRequestPath", () => {
  test("parses simple modifiers and source", () => {
    const result = parseRequestPath("w_800/https://example.com/image.jpg")
    expect(result.modifiersRaw).toBe("w_800")
    expect(result.sourceRaw).toBe("https://example.com/image.jpg")
  })

  test("parses complex modifiers with multiple separators", () => {
    const result = parseRequestPath(
      "w_800,h_600&f_webp/https://example.com/image.jpg"
    )
    expect(result.modifiersRaw).toBe("w_800,h_600&f_webp")
    expect(result.sourceRaw).toBe("https://example.com/image.jpg")
  })

  test("parses FS relative paths", () => {
    const result = parseRequestPath("w_800/image.jpg")
    expect(result.modifiersRaw).toBe("w_800")
    expect(result.sourceRaw).toBe("image.jpg")
  })

  test("parses underscore-only modifiers (passthrough)", () => {
    const result = parseRequestPath("_/https://example.com/image.jpg")
    expect(result.modifiersRaw).toBe("_")
    expect(result.sourceRaw).toBe("https://example.com/image.jpg")
  })

  test("URL-decodes source segment", () => {
    const result = parseRequestPath(
      "w_800/https%3A%2F%2Fexample.com%2Fimage.jpg"
    )
    expect(result.sourceRaw).toBe("https://example.com/image.jpg")
  })

  test("repairs collapsed https:/ to https://", () => {
    const result = parseRequestPath("w_800/https:/example.com/image.jpg")
    expect(result.sourceRaw).toBe("https://example.com/image.jpg")
  })

  test("repairs collapsed http:/ to http://", () => {
    const result = parseRequestPath("w_800/http:/example.com/image.jpg")
    expect(result.sourceRaw).toBe("http://example.com/image.jpg")
  })

  test("does not repair https:// (already correct)", () => {
    const result = parseRequestPath("w_800/https://example.com/image.jpg")
    expect(result.sourceRaw).toBe("https://example.com/image.jpg")
  })

  test("throws on empty path", () => {
    expect(() => parseRequestPath("")).toThrow()
  })

  test("throws on path starting with slash", () => {
    expect(() => parseRequestPath("/https://example.com/image.jpg")).toThrow()
  })

  test("throws on path with no source segment", () => {
    expect(() => parseRequestPath("w_800/")).toThrow()
  })

  test("throws on path with only modifiers and no slash", () => {
    expect(() => parseRequestPath("w_800")).toThrow()
  })

  test("preserves multi-segment paths", () => {
    const result = parseRequestPath("w_800/path/to/image.jpg")
    expect(result.modifiersRaw).toBe("w_800")
    expect(result.sourceRaw).toBe("path/to/image.jpg")
  })
})
