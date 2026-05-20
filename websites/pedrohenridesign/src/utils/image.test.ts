import { describe, expect, it } from "@jest/globals"
import {
  getImageUrl,
  parseSizes,
  generateSrcSet,
  generateSizesString,
  generateImageProps,
} from "@utils/image"

describe("getImageUrl", () => {
  it("should return the correct URL", () => {
    expect.hasAssertions()
    const url = getImageUrl("images/footer.png", "f_auto,q_90,w_540")
    expect(url).toMatchSnapshot()
  })
})

describe("parseSizes", () => {
  it("should parse the sizes with default fallback", () => {
    expect.hasAssertions()
    const sizes = "xs:540px sm:640px lg:1024px xl:1280px"
    const parsedSizes = parseSizes(sizes)
    expect(parsedSizes).toStrictEqual({
      default: "1280px",
      xs: "540px",
      sm: "640px",
      lg: "1024px",
      xl: "1280px",
    })
  })

  it("should parse the with default fallback (smaller than xs)", () => {
    expect.hasAssertions()
    const sizes = "xs:540px sm:300px lg:1024px xl:1280px"
    const parsedSizes = parseSizes(sizes)
    expect(parsedSizes).toStrictEqual({
      default: "1280px",
      xs: "540px",
      sm: "300px",
      lg: "1024px",
      xl: "1280px",
    })
  })

  it("should parse the sizes with all screen", () => {
    expect.hasAssertions()
    const sizes = "540px sm:640px lg:1024px xl:1280px"
    const parsedSizes = parseSizes(sizes)
    expect(parsedSizes).toStrictEqual({
      default: "540px",
      sm: "640px",
      lg: "1024px",
      xl: "1280px",
    })
  })
})

describe("generateSrcSet", () => {
  it("should generate the srcSet", () => {
    expect.hasAssertions()
    const src = "images/footer.png"
    const sizes = "xs:540px sm:640px lg:1024px xl:1280px"
    const srcSet = generateSrcSet(src, parseSizes(sizes))
    expect(srcSet).toMatchSnapshot()
  })
})

describe("generateSizesString", () => {
  it("should generate the sizes string", () => {
    expect.hasAssertions()
    const sizes = "sm:640px lg:1024px xl:1280px"
    const sizesString = generateSizesString(parseSizes(sizes))
    expect(sizesString).toBe(
      "(min-width: 1280px) 1280px, (min-width: 1024px) 1024px, (min-width: 640px) 640px, 1280px"
    )
  })
})

describe("generateImageProps", () => {
  it("should generate the image props", () => {
    expect.hasAssertions()
    const src = "images/footer.png"
    const sizes = "xs:540px sm:640px lg:1024px xl:1280px"
    const imageProps = generateImageProps(src, sizes)
    expect(imageProps).toMatchSnapshot()
  })

  it("should change the format if src is gif", () => {
    expect.hasAssertions()
    const src = "images/footer.gif"
    const sizes = "xs:540px sm:640px lg:1024px xl:1280px"
    const imageProps = generateImageProps(src, sizes)
    expect(imageProps).toMatchSnapshot()
  })
})
