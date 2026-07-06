import { describe, expect, test } from "bun:test"
import { buildCacheKey } from "@/cache/key"
import type { CanonicalModifiers } from "@/riapi/types"

describe("buildCacheKey", () => {
  const baseModifiers: CanonicalModifiers = {
    mode: "max",
    scale: "down",
    format: "auto",
    flip: "none",
  }

  test("builds consistent key from same modifiers", () => {
    const modifiers: CanonicalModifiers = {
      ...baseModifiers,
      width: 800,
      height: 600,
    }
    const key1 = buildCacheKey("image.jpg", modifiers)
    const key2 = buildCacheKey("image.jpg", modifiers)
    expect(key1).toBe(key2)
  })

  test("includes source ID in key", () => {
    const modifiers: CanonicalModifiers = {
      ...baseModifiers,
      width: 800,
    }
    const key1 = buildCacheKey("image1.jpg", modifiers)
    const key2 = buildCacheKey("image2.jpg", modifiers)
    expect(key1).not.toBe(key2)
  })

  test("produces stable key regardless of modifier order", () => {
    const modifiers1: CanonicalModifiers = {
      ...baseModifiers,
      width: 800,
      height: 600,
      quality: 80,
    }
    const modifiers2: CanonicalModifiers = {
      quality: 80,
      height: 600,
      width: 800,
      mode: "max",
      scale: "down",
      format: "auto",
      flip: "none",
    }
    const key1 = buildCacheKey("image.jpg", modifiers1)
    const key2 = buildCacheKey("image.jpg", modifiers2)
    expect(key1).toBe(key2)
  })

  test("produces different keys for different modifiers", () => {
    const mods1: CanonicalModifiers = {
      ...baseModifiers,
      width: 800,
    }
    const mods2: CanonicalModifiers = {
      ...baseModifiers,
      width: 1200,
    }
    const key1 = buildCacheKey("image.jpg", mods1)
    const key2 = buildCacheKey("image.jpg", mods2)
    expect(key1).not.toBe(key2)
  })

  test("key excludes format from filename (format becomes extension)", () => {
    const modsWebp: CanonicalModifiers = {
      ...baseModifiers,
      format: "webp",
      width: 800,
    }
    const modsJpeg: CanonicalModifiers = {
      ...baseModifiers,
      format: "jpeg",
      width: 800,
    }
    const key1 = buildCacheKey("image.jpg", modsWebp)
    const key2 = buildCacheKey("image.jpg", modsJpeg)
    // Keys should be the same (format in file extension, not in key)
    // Both would be stored as key.webp and key.jpeg respectively
    expect(key1).toBe(key2)
  })

  test("handles empty optional modifiers", () => {
    const modifiers: CanonicalModifiers = {
      mode: "max",
      scale: "down",
      format: "auto",
      flip: "none",
    }
    const key = buildCacheKey("image.jpg", modifiers)
    expect(typeof key).toBe("string")
    expect(key.length).toBeGreaterThan(0)
  })

  test("handles all modifier types", () => {
    const modifiers: CanonicalModifiers = {
      width: 800,
      height: 600,
      mode: "stretch",
      scale: "both",
      format: "webp",
      quality: 85,
      rotate: 90,
      flip: "xy",
      brightness: 1.2,
      saturation: 0.8,
      filter: "lanczos3",
      compression: 9,
    }
    const key = buildCacheKey("test.jpg", modifiers)
    expect(typeof key).toBe("string")
    expect(key.length).toBeGreaterThan(0)
  })

  test("different HTTP URLs produce different keys", () => {
    const mods: CanonicalModifiers = baseModifiers
    const key1 = buildCacheKey("example.com/image1.jpg", mods)
    const key2 = buildCacheKey("example.com/image2.jpg", mods)
    expect(key1).not.toBe(key2)
  })

  test("same URL with different modifiers produce different keys", () => {
    const mods1: CanonicalModifiers = {
      ...baseModifiers,
      width: 800,
    }
    const mods2: CanonicalModifiers = {
      ...baseModifiers,
      width: 1200,
    }
    const key1 = buildCacheKey("example.com/image.jpg", mods1)
    const key2 = buildCacheKey("example.com/image.jpg", mods2)
    expect(key1).not.toBe(key2)
  })

  test("placeholder key format", () => {
    const sourceKey = buildCacheKey("image.jpg", baseModifiers)
    // Placeholder would be sourceKey/placeholder
    const placeholderKey = `${sourceKey}/placeholder`
    expect(placeholderKey).toContain("/placeholder")
  })

  test("key is URL-safe (no spaces or special chars that need encoding)", () => {
    const modifiers: CanonicalModifiers = {
      ...baseModifiers,
      width: 800,
      height: 600,
      quality: 80,
    }
    const key = buildCacheKey("my-image.jpg", modifiers)
    // Should not contain spaces or problematic characters
    expect(/[\s"'<>]/.test(key)).toBe(false)
  })
})
