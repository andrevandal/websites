import { describe, expect, it } from "bun:test"
import { createImageUtils } from "./image"

const testConfig = {
  ipxEndpoint: "https://ipx.example.com",
  bucketEndpoint: "https://files.example.com",
  bucketName: "test-bucket",
}

describe("createImageUtils", () => {
  const utils = createImageUtils(testConfig)

  describe("getImageUrl", () => {
    it("should build URL from config", () => {
      const url = utils.getImageUrl("images/test.png", "f_auto,q_90,w_540")
      expect(url).toBe(
        "https://ipx.example.com/f_auto,q_90,w_540/https://files.example.com/test-bucket/images/test.png"
      )
    })

    it("uses _ as default transform", () => {
      const url = utils.getImageUrl("images/test.png")
      expect(url).toBe(
        "https://ipx.example.com/_/https://files.example.com/test-bucket/images/test.png"
      )
    })
  })

  describe("parseSizes", () => {
    it("parses breakpoint sizes with default fallback", () => {
      const result = utils.parseSizes("xs:540px sm:640px lg:1024px xl:1280px")
      expect(result).toStrictEqual({
        default: "1280px",
        xs: "540px",
        sm: "640px",
        lg: "1024px",
        xl: "1280px",
      })
    })

    it("parses sizes with explicit default", () => {
      const result = utils.parseSizes("540px sm:640px lg:1024px xl:1280px")
      expect(result).toStrictEqual({
        default: "540px",
        sm: "640px",
        lg: "1024px",
        xl: "1280px",
      })
    })
  })

  describe("generateSizesString", () => {
    it("generates sizes string in correct order", () => {
      const sizes = utils.parseSizes("sm:640px lg:1024px xl:1280px")
      const result = utils.generateSizesString(sizes)
      expect(result).toBe(
        "(min-width: 1280px) 1280px, (min-width: 1024px) 1024px, (min-width: 640px) 640px, 1280px"
      )
    })
  })

  describe("generateSrcSet", () => {
    it("generates srcset with multiple densities", () => {
      const sizes = utils.parseSizes("xl:100px")
      const result = utils.generateSrcSet("images/test.png", sizes)
      expect(result).toContain("100w")
      expect(result).toContain("150w")
      expect(result).toContain("200w")
    })

    it("uses gif format for gif sources", () => {
      const sizes = utils.parseSizes("xl:100px")
      const result = utils.generateSrcSet("images/test.gif", sizes)
      expect(result).toContain("f_gif")
    })
  })
})
