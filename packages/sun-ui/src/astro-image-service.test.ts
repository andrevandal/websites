import { describe, expect, it } from "bun:test"
import type { ExternalImageService, ImageTransform } from "astro"
import sunImageService, { getPlaceholderUrl } from "./astro-image-service"
import type { SunImageServiceConfig } from "./astro-image-service"

type ImageConfigArg = Parameters<
  ExternalImageService<SunImageServiceConfig>["getURL"]
>[1]

const imageConfigWith = (
  config: Partial<SunImageServiceConfig> = {}
): ImageConfigArg =>
  ({
    service: {
      entrypoint: "@vandal-websites/sun-ui/astro-image-service",
      config: { baseUrl: "https://images.example.com", ...config },
    },
  }) as ImageConfigArg

describe("sunImageService.validateOptions", () => {
  it("throws when src is not a string", () => {
    const options = { src: { src: "photo.jpg" } } as unknown as ImageTransform
    expect(() =>
      sunImageService.validateOptions?.(options, imageConfigWith())
    ).toThrow(/remote URL/)
  })

  it("rounds fractional width and height", async () => {
    const options: ImageTransform = {
      src: "https://cdn.example.com/a.jpg",
      width: 800.6,
      height: 599.4,
    }
    const result = await sunImageService.validateOptions?.(
      options,
      imageConfigWith()
    )
    expect(result?.width).toBe(801)
    expect(result?.height).toBe(599)
  })

  it("rejects local paths like /hero.jpg", () => {
    const options = { src: "/hero.jpg" } as ImageTransform
    expect(() =>
      sunImageService.validateOptions?.(options, imageConfigWith())
    ).toThrow(/remote URL/)
  })

  it("rejects relative paths like hero.jpg", () => {
    const options = { src: "hero.jpg" } as ImageTransform
    expect(() =>
      sunImageService.validateOptions?.(options, imageConfigWith())
    ).toThrow(/remote URL/)
  })

  it("rejects non-http schemes like ftp://example.com/photo.jpg", () => {
    const options = { src: "ftp://example.com/photo.jpg" } as ImageTransform
    expect(() =>
      sunImageService.validateOptions?.(options, imageConfigWith())
    ).toThrow(/remote URL/)
  })

  it("accepts valid https URLs", () => {
    const options = { src: "https://example.com/photo.jpg" } as ImageTransform
    expect(
      sunImageService.validateOptions?.(options, imageConfigWith())
    ).toEqual(options)
  })
})

describe("sunImageService.getURL", () => {
  it("builds a URL with the configured base and a percent-encoded source", async () => {
    const options: ImageTransform = {
      src: "https://cdn.example.com/photo.jpg",
      width: 800,
      height: 600,
      format: "webp",
    }
    const url = await sunImageService.getURL(options, imageConfigWith())
    expect(url).toBe(
      "https://images.example.com/w_800,h_600,f_webp/https%3A%2F%2Fcdn.example.com%2Fphoto.jpg"
    )
  })

  it("uses the passthrough segment when no modifiers apply", async () => {
    const options: ImageTransform = { src: "https://cdn.example.com/photo.jpg" }
    const url = await sunImageService.getURL(options, imageConfigWith())
    expect(url).toBe(
      "https://images.example.com/_/https%3A%2F%2Fcdn.example.com%2Fphoto.jpg"
    )
  })

  it("strips trailing slashes from baseUrl", async () => {
    const options: ImageTransform = { src: "https://cdn.example.com/photo.jpg" }
    const url = await sunImageService.getURL(
      options,
      imageConfigWith({ baseUrl: "https://images.example.com/" })
    )
    expect(url.startsWith("https://images.example.com/_/")).toBe(true)
  })

  it("throws a clear error when baseUrl is not configured", () => {
    const options: ImageTransform = { src: "https://cdn.example.com/photo.jpg" }
    expect(() =>
      sunImageService.getURL(options, imageConfigWith({ baseUrl: "" }))
    ).toThrow(/baseUrl/)
  })
})

describe("sunImageService.getHTMLAttributes", () => {
  it("strips RIAPI-only fields and defaults loading/decoding", async () => {
    const options: ImageTransform = {
      src: "https://cdn.example.com/photo.jpg",
      width: 800,
      height: 600,
      format: "webp",
      quality: 80,
      fit: "cover",
      alt: "A photo",
    }
    const attrs = await sunImageService.getHTMLAttributes?.(
      options,
      imageConfigWith()
    )
    expect(attrs).toStrictEqual({
      width: 800,
      height: 600,
      alt: "A photo",
      loading: "lazy",
      decoding: "async",
    })
  })

  it("preserves explicit loading and decoding overrides", async () => {
    const options: ImageTransform = {
      src: "https://cdn.example.com/photo.jpg",
      alt: "",
      loading: "eager",
      decoding: "sync",
    }
    const attrs = await sunImageService.getHTMLAttributes?.(
      options,
      imageConfigWith()
    )
    expect(attrs?.loading).toBe("eager")
    expect(attrs?.decoding).toBe("sync")
  })

  it("strips layout prop while preserving others", async () => {
    const options: ImageTransform = {
      src: "https://cdn.example.com/photo.jpg",
      layout: "responsive",
      alt: "test",
    } as any
    const attrs = await sunImageService.getHTMLAttributes?.(
      options,
      imageConfigWith()
    )
    expect(attrs).not.toHaveProperty("layout")
    expect(attrs).toHaveProperty("alt", "test")
  })
})

describe("sunImageService.getSrcSet", () => {
  it("returns no entries when densities are not provided", () => {
    const options: ImageTransform = {
      src: "https://cdn.example.com/photo.jpg",
      width: 493,
      height: 481,
    }
    expect(sunImageService.getSrcSet?.(options, imageConfigWith())).toEqual([])
  })

  it("returns no entries when width is missing", () => {
    const options: ImageTransform = {
      src: "https://cdn.example.com/photo.jpg",
      densities: [2],
    }
    expect(sunImageService.getSrcSet?.(options, imageConfigWith())).toEqual([])
  })

  it("builds one transform per density, sorted ascending, with scaled width/height", async () => {
    const options: ImageTransform = {
      src: "https://cdn.example.com/photo.jpg",
      width: 493,
      height: 481,
      densities: [3, 1.5, 2],
    }
    const srcSet = await sunImageService.getSrcSet?.(options, imageConfigWith())
    expect(srcSet).toHaveLength(3)
    expect(srcSet?.[0]).toMatchObject({ descriptor: "1.5x" })
    expect(srcSet?.[0]?.transform).toMatchObject({ width: 740, height: 722 })
    expect(srcSet?.[1]).toMatchObject({ descriptor: "2x" })
    expect(srcSet?.[1]?.transform).toMatchObject({ width: 986, height: 962 })
    expect(srcSet?.[2]).toMatchObject({ descriptor: "3x" })
    expect(srcSet?.[2]?.transform).toMatchObject({ width: 1479, height: 1443 })
  })

  it('accepts string density descriptors like "2x"', async () => {
    const options: ImageTransform = {
      src: "https://cdn.example.com/photo.jpg",
      width: 100,
      height: 100,
      densities: ["2x"],
    }
    const srcSet = await sunImageService.getSrcSet?.(options, imageConfigWith())
    expect(srcSet?.[0]).toMatchObject({ descriptor: "2x" })
    expect(srcSet?.[0]?.transform).toMatchObject({ width: 200, height: 200 })
  })

  it("preserves other transform options like format and quality", async () => {
    const options: ImageTransform = {
      src: "https://cdn.example.com/photo.jpg",
      width: 100,
      height: 100,
      format: "webp",
      quality: 90,
      densities: [2],
    }
    const srcSet = await sunImageService.getSrcSet?.(options, imageConfigWith())
    expect(srcSet?.[0]?.transform).toMatchObject({
      format: "webp",
      quality: 90,
    })
  })

  it("builds one transform per width, sorted ascending, with scaled height", async () => {
    const options: ImageTransform = {
      src: "https://cdn.example.com/photo.jpg",
      width: 375,
      height: 361,
      widths: [600, 300, 472],
    }
    const srcSet = await sunImageService.getSrcSet?.(options, imageConfigWith())
    expect(srcSet).toHaveLength(3)
    // Sorted ascending by width
    expect(srcSet?.[0]).toMatchObject({ descriptor: "300w" })
    expect(srcSet?.[0]?.transform).toMatchObject({ width: 300 })
    expect(srcSet?.[1]).toMatchObject({ descriptor: "472w" })
    expect(srcSet?.[1]?.transform).toMatchObject({ width: 472, height: 454 })
    expect(srcSet?.[2]).toMatchObject({ descriptor: "600w" })
    expect(srcSet?.[2]?.transform).toMatchObject({ width: 600, height: 578 })
  })

  it("computes height via aspect ratio when widths are used", async () => {
    const options: ImageTransform = {
      src: "https://cdn.example.com/photo.jpg",
      width: 400,
      height: 300,
      widths: [600],
    }
    const srcSet = await sunImageService.getSrcSet?.(options, imageConfigWith())
    expect(srcSet?.[0]?.transform).toMatchObject({
      width: 600,
      height: 450,
    })
  })

  it("returns undefined height per entry when height is omitted", async () => {
    const options: ImageTransform = {
      src: "https://cdn.example.com/photo.jpg",
      width: 400,
      widths: [600, 800],
    }
    const srcSet = await sunImageService.getSrcSet?.(options, imageConfigWith())
    expect(srcSet).toHaveLength(2)
    expect(srcSet?.[0]?.transform).toMatchObject({
      width: 600,
      height: undefined,
    })
    expect(srcSet?.[1]?.transform).toMatchObject({
      width: 800,
      height: undefined,
    })
  })

  it("prefers densities over widths when both are present", async () => {
    const options: ImageTransform = {
      src: "https://cdn.example.com/photo.jpg",
      width: 400,
      height: 300,
      widths: [600],
      densities: [2],
    }
    const srcSet = await sunImageService.getSrcSet?.(options, imageConfigWith())
    // Should use densities branch (2x descriptor, not w descriptor)
    expect(srcSet).toHaveLength(1)
    expect(srcSet?.[0]).toMatchObject({ descriptor: "2x" })
    expect(srcSet?.[0]?.transform).toMatchObject({
      width: 800,
      height: 600,
    })
  })

  it("preserves other transform options like format and quality with widths", async () => {
    const options: ImageTransform = {
      src: "https://cdn.example.com/photo.jpg",
      width: 400,
      height: 300,
      format: "avif",
      quality: 85,
      fit: "cover",
      widths: [600],
    }
    const srcSet = await sunImageService.getSrcSet?.(options, imageConfigWith())
    expect(srcSet?.[0]?.transform).toMatchObject({
      src: "https://cdn.example.com/photo.jpg",
      width: 600,
      height: 450,
      format: "avif",
      quality: 85,
      fit: "cover",
    })
  })
})

describe("getPlaceholderUrl", () => {
  it("builds a passthrough placeholder URL for the given source", () => {
    expect(
      getPlaceholderUrl(
        "https://images.example.com",
        "https://cdn.example.com/photo.jpg"
      )
    ).toBe(
      "https://images.example.com/_/https%3A%2F%2Fcdn.example.com%2Fphoto.jpg?placeholder"
    )
  })

  it("strips trailing slashes from baseUrl", () => {
    expect(
      getPlaceholderUrl(
        "https://images.example.com/",
        "https://cdn.example.com/photo.jpg"
      )
    ).toBe(
      "https://images.example.com/_/https%3A%2F%2Fcdn.example.com%2Fphoto.jpg?placeholder"
    )
  })
})
