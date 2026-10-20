import { describe, expect, test } from "bun:test"
import { assetUrl, runtimeEnv } from "./runtime-env"

const reader =
  (values: Record<string, string>) =>
  (key: string): string | undefined =>
    values[key]

describe("runtimeEnv", () => {
  test("returns the Worker variable read at request time", () => {
    expect(
      runtimeEnv(
        reader({ IMAGES_BASE_URL: "https://files.example.test/images" }),
        "IMAGES_BASE_URL"
      )
    ).toBe("https://files.example.test/images")
  })

  test("treats a missing or empty variable as unset", () => {
    expect(runtimeEnv(reader({}), "IMAGES_BASE_URL")).toBeUndefined()
    expect(
      runtimeEnv(reader({ IMAGES_BASE_URL: "" }), "IMAGES_BASE_URL")
    ).toBeUndefined()
  })
})

describe("assetUrl", () => {
  test("joins base URL and path with single slash when S3_PUBLIC_URL is set", () => {
    expect(
      assetUrl(
        reader({ S3_PUBLIC_URL: "https://files.example.com" }),
        "images/logo.png"
      )
    ).toBe("https://files.example.com/images/logo.png")
  })

  test("removes trailing slash from base and leading slash from path", () => {
    expect(
      assetUrl(
        reader({ S3_PUBLIC_URL: "https://files.example.com/" }),
        "/images/logo.png"
      )
    ).toBe("https://files.example.com/images/logo.png")
  })

  test("returns root-relative path when S3_PUBLIC_URL is unset", () => {
    expect(assetUrl(reader({}), "images/logo.png")).toBe("/images/logo.png")
  })

  test("handles empty S3_PUBLIC_URL as unset", () => {
    expect(assetUrl(reader({ S3_PUBLIC_URL: "" }), "images/logo.png")).toBe(
      "/images/logo.png"
    )
  })
})
