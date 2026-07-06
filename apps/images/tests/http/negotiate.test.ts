import { describe, expect, test } from "bun:test"
import { negotiateFormat } from "@/http/negotiate"

describe("negotiateFormat", () => {
  test("returns jpeg by default when no Accept header", () => {
    const result = negotiateFormat(undefined, true)
    expect(result).toBe("jpeg")
  })

  test("returns jpeg by default for empty Accept header", () => {
    const result = negotiateFormat("", true)
    expect(result).toBe("jpeg")
  })

  test("negotiates avif when requested and enabled", () => {
    const result = negotiateFormat("image/avif", true)
    expect(result).toBe("avif")
  })

  test("negotiates avif when in list and enabled", () => {
    const result = negotiateFormat("image/avif,image/webp,image/jpeg", true)
    expect(result).toBe("avif")
  })

  test("skips avif when disabled", () => {
    const result = negotiateFormat("image/avif,image/webp", false)
    expect(result).toBe("webp")
  })

  test("negotiates webp from Accept header", () => {
    const result = negotiateFormat("image/webp,image/jpeg", true)
    expect(result).toBe("webp")
  })

  test("negotiates png from Accept header", () => {
    const result = negotiateFormat("image/png,image/jpeg", true)
    expect(result).toBe("png")
  })

  test("negotiates jpeg from Accept header", () => {
    const result = negotiateFormat("image/jpeg,image/png", true)
    expect(result).toBe("jpeg")
  })

  test("first matching format in priority order wins", () => {
    // Candidate order: avif, webp, jpeg, png
    // Accept header has webp and png, webp should win (higher priority)
    const result = negotiateFormat("image/webp,image/png", true)
    expect(result).toBe("webp")
  })

  test("handles wildcards - image/*", () => {
    // image/* should match first candidate (avif when enabled)
    const result = negotiateFormat("image/*", true)
    expect(result).toBe("avif")
  })

  test("handles wildcards - */*", () => {
    // */* should match first candidate
    const result = negotiateFormat("*/*", true)
    expect(result).toBe("avif")
  })

  test("handles wildcards with avif disabled", () => {
    // Without avif, first candidate is webp
    const result = negotiateFormat("image/*", false)
    expect(result).toBe("webp")
  })

  test("UPPERCASE mime types don't match (strict comparison)", () => {
    // The implementation does strict equality, so uppercase doesn't match
    const result = negotiateFormat("IMAGE/WEBP", true)
    expect(result).toBe("jpeg") // Falls back to default
  })

  test("handles q-values (stripped but order preserved)", () => {
    // q-values are stripped but order is preserved
    const result = negotiateFormat("image/webp;q=0.5,image/jpeg;q=0.9", true)
    expect(result).toBe("webp") // webp appears first, so it matches first
  })

  test("handles complex Accept headers", () => {
    const result = negotiateFormat(
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      true
    )
    expect(result).toBe("webp") // image/webp appears first
  })

  test("returns default when no matches", () => {
    // If we ask for unsupported format, default to jpeg
    const result = negotiateFormat("image/gif", true)
    expect(result).toBe("jpeg")
  })

  test("handles whitespace in Accept header", () => {
    const result = negotiateFormat("image/webp , image/jpeg , image/png", true)
    expect(result).toBe("webp")
  })

  test("png is included in candidates", () => {
    const result = negotiateFormat("image/png", true)
    expect(result).toBe("png")
  })

  test("jpeg is included in candidates", () => {
    const result = negotiateFormat("image/jpeg", true)
    expect(result).toBe("jpeg")
  })

  test("webp is included in candidates", () => {
    const result = negotiateFormat("image/webp", true)
    expect(result).toBe("webp")
  })

  test("avif included when enabled", () => {
    const result = negotiateFormat("image/avif", true)
    expect(result).toBe("avif")
  })

  test("avif excluded when disabled", () => {
    const result = negotiateFormat("image/avif,image/jpeg", false)
    expect(result).toBe("jpeg")
  })

  test("prioritizes avif over webp when both present and enabled", () => {
    const result = negotiateFormat("image/avif,image/webp", true)
    expect(result).toBe("avif")
  })

  test("prioritizes webp over jpeg when both present", () => {
    const result = negotiateFormat("image/webp,image/jpeg", true)
    expect(result).toBe("webp")
  })

  test("prioritizes jpeg over png when both present", () => {
    const result = negotiateFormat("image/jpeg,image/png", true)
    expect(result).toBe("jpeg")
  })
})
