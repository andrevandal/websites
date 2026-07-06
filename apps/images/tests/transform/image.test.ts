import { describe, expect, test } from "bun:test"
import sharp = require("sharp")
import { applyModifiers, resolveTargetFormat } from "@/transform/image"
import type { CanonicalModifiers } from "@/riapi/types"

const baseModifiers: CanonicalModifiers = {
  format: "auto",
  mode: "max",
  scale: "down",
  flip: "none",
}

const imageFrame = async (background: sharp.Color): Promise<Buffer> =>
  await sharp({
    create: {
      width: 2,
      height: 2,
      channels: 4,
      background,
    },
  })
    .png()
    .toBuffer()

const animatedGifFixture = async (): Promise<Buffer> => {
  const frames = await Promise.all([
    imageFrame({ r: 255, g: 0, b: 0, alpha: 1 }),
    imageFrame({ r: 0, g: 0, b: 255, alpha: 1 }),
  ])

  return await sharp(frames, { animated: true, join: { animated: true } })
    .gif({ delay: [50, 50], loop: 0 })
    .toBuffer()
}

describe("resolveTargetFormat", () => {
  test("returns jpeg by default when Accept header missing", async () => {
    const modifiers: CanonicalModifiers = {
      format: "auto",
      mode: "max",
      scale: "down",
      flip: "none",
    }
    const result = await resolveTargetFormat(modifiers, {
      avifEnabled: true,
      acceptHeader: undefined,
    })
    expect(result).toBe("jpeg")
  })

  test("negotiates webp from Accept header", async () => {
    const modifiers: CanonicalModifiers = {
      format: "auto",
      mode: "max",
      scale: "down",
      flip: "none",
    }
    const result = await resolveTargetFormat(modifiers, {
      avifEnabled: false,
      acceptHeader: "image/webp,image/*",
    })
    expect(result).toBe("webp")
  })

  test("negotiates png from Accept header", async () => {
    const modifiers: CanonicalModifiers = {
      format: "auto",
      mode: "max",
      scale: "down",
      flip: "none",
    }
    const result = await resolveTargetFormat(modifiers, {
      avifEnabled: false,
      acceptHeader: "image/png,*/*",
    })
    expect(result).toBe("png")
  })

  test("returns explicit format when not auto", async () => {
    const modifiers: CanonicalModifiers = {
      format: "png",
      mode: "max",
      scale: "down",
      flip: "none",
    }
    const result = await resolveTargetFormat(modifiers, {
      avifEnabled: true,
      acceptHeader: "image/jpeg",
    })
    expect(result).toBe("png")
  })

  test("avif gate prevents avif selection even if requested", async () => {
    const modifiers: CanonicalModifiers = {
      format: "auto",
      mode: "max",
      scale: "down",
      flip: "none",
    }
    const result = await resolveTargetFormat(modifiers, {
      avifEnabled: false,
      acceptHeader: "image/avif,image/jpeg",
    })
    expect(result).toBe("jpeg")
  })

  test("avif format with avifEnabled=false falls back to webp", async () => {
    const modifiers: CanonicalModifiers = {
      format: "avif",
      mode: "max",
      scale: "down",
      flip: "none",
    }
    const result = await resolveTargetFormat(modifiers, {
      avifEnabled: false,
      acceptHeader: "image/avif",
    })
    expect(result).toBe("webp")
  })

  test("handles jpeg format explicitly", async () => {
    const modifiers: CanonicalModifiers = {
      format: "jpeg",
      mode: "max",
      scale: "down",
      flip: "none",
    }
    const result = await resolveTargetFormat(modifiers, {
      avifEnabled: true,
      acceptHeader: "image/png",
    })
    expect(result).toBe("jpeg")
  })

  test("handles webp format explicitly", async () => {
    const modifiers: CanonicalModifiers = {
      format: "webp",
      mode: "max",
      scale: "down",
      flip: "none",
    }
    const result = await resolveTargetFormat(modifiers, {
      avifEnabled: true,
      acceptHeader: "image/jpeg",
    })
    expect(result).toBe("webp")
  })

  test("handles png format explicitly", async () => {
    const modifiers: CanonicalModifiers = {
      format: "png",
      mode: "max",
      scale: "down",
      flip: "none",
    }
    const result = await resolveTargetFormat(modifiers, {
      avifEnabled: true,
      acceptHeader: "image/jpeg",
    })
    expect(result).toBe("png")
  })

  test("defaults to jpeg when no format or accept header", async () => {
    const modifiers: CanonicalModifiers = {
      format: "auto",
      mode: "max",
      scale: "down",
      flip: "none",
    }
    const result = await resolveTargetFormat(modifiers, {
      avifEnabled: true,
      acceptHeader: undefined,
    })
    expect(result).toBe("jpeg")
  })

  test("handles empty Accept header", async () => {
    const modifiers: CanonicalModifiers = {
      format: "auto",
      mode: "max",
      scale: "down",
      flip: "none",
    }
    const result = await resolveTargetFormat(modifiers, {
      avifEnabled: true,
      acceptHeader: "",
    })
    expect(result).toBe("jpeg")
  })

  test("handles wildcard Accept header", async () => {
    const modifiers: CanonicalModifiers = {
      format: "auto",
      mode: "max",
      scale: "down",
      flip: "none",
    }
    const result = await resolveTargetFormat(modifiers, {
      avifEnabled: true,
      acceptHeader: "*/*",
    })
    // First candidate in priority list
    expect(["avif", "webp"]).toContain(result)
  })

  test("handles image/* wildcard", async () => {
    const modifiers: CanonicalModifiers = {
      format: "auto",
      mode: "max",
      scale: "down",
      flip: "none",
    }
    const result = await resolveTargetFormat(modifiers, {
      avifEnabled: true,
      acceptHeader: "image/*",
    })
    // First candidate in priority list when avifEnabled
    expect(["avif", "webp"]).toContain(result)
  })

  test("negotiates webp when avif not available", async () => {
    // Even with avifEnabled=true, if platform doesn't support AVIF,
    // negotiation should prefer the next available format
    const modifiers: CanonicalModifiers = {
      format: "auto",
      mode: "max",
      scale: "down",
      flip: "none",
    }
    const result = await resolveTargetFormat(modifiers, {
      avifEnabled: true,
      acceptHeader: "image/webp",
    })
    expect(result).toBe("webp")
  })
})

describe("animated GIF support", () => {
  test("resolves auto format to webp when animated GIF and client accepts webp", async () => {
    const result = await resolveTargetFormat(baseModifiers, {
      avifEnabled: false,
      acceptHeader: "image/webp,image/*",
      animatedGif: true,
    })

    expect(result).toBe("webp")
  })

  test("resolves auto format to gif when animated GIF client does not accept webp", async () => {
    const result = await resolveTargetFormat(baseModifiers, {
      avifEnabled: false,
      acceptHeader: "image/jpeg,image/png",
      animatedGif: true,
    })

    expect(result).toBe("gif")
  })

  test("keeps explicit gif format for animated GIF sources", async () => {
    const result = await resolveTargetFormat(
      { ...baseModifiers, format: "gif" },
      {
        avifEnabled: false,
        acceptHeader: "image/webp",
        animatedGif: true,
      }
    )

    expect(result).toBe("gif")
  })

  test("falls back to webp when animated GIF requests static-only output", async () => {
    const result = await resolveTargetFormat(
      { ...baseModifiers, format: "jpeg" },
      {
        avifEnabled: false,
        acceptHeader: "image/jpeg",
        animatedGif: true,
      }
    )

    expect(result).toBe("webp")
  })

  test("preserves animated pages when converting animated GIF to webp", async () => {
    const source = await animatedGifFixture()
    const result = await applyModifiers(
      source,
      { ...baseModifiers, format: "webp", width: 1 },
      { avifEnabled: false, animatedGif: true }
    )

    const metadata = await sharp(result.bytes, { animated: true }).metadata()

    expect(result.format).toBe("webp")
    expect(metadata.format).toBe("webp")
    expect(metadata.pages).toBe(2)
  })

  test("preserves animated pages when converting animated GIF to gif", async () => {
    const source = await animatedGifFixture()
    const result = await applyModifiers(
      source,
      { ...baseModifiers, format: "gif", width: 1 },
      { avifEnabled: false, animatedGif: true }
    )

    const metadata = await sharp(result.bytes, { animated: true }).metadata()

    expect(result.format).toBe("gif")
    expect(metadata.format).toBe("gif")
    expect(metadata.pages).toBe(2)
  })
})
