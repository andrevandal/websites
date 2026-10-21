import { describe, expect, test } from "bun:test"
import { assetUrl, runtimeEnv, s3PublicUrl } from "./runtime-env"

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

describe("s3PublicUrl", () => {
  test("returns explicit S3_PUBLIC_URL if non-empty", () => {
    const result = s3PublicUrl(
      reader({ S3_PUBLIC_URL: "https://files.example.com/bucket" })
    )
    expect(result).toBe("https://files.example.com/bucket")
  })

  test("derives from S3_ENDPOINT and S3_BUCKET when S3_PUBLIC_URL absent", () => {
    const result = s3PublicUrl(
      reader({
        S3_ENDPOINT: "https://s3.example.com",
        S3_BUCKET: "mybucket",
      })
    )
    expect(result).toBe("https://s3.example.com/mybucket")
  })

  test("returns undefined when S3_PUBLIC_URL, S3_ENDPOINT, and S3_BUCKET all absent", () => {
    const result = s3PublicUrl(reader({}))
    expect(result).toBeUndefined()
  })

  test("returns undefined when only one of S3_ENDPOINT/S3_BUCKET exists", () => {
    expect(
      s3PublicUrl(reader({ S3_ENDPOINT: "https://s3.example.com" }))
    ).toBeUndefined()
    expect(s3PublicUrl(reader({ S3_BUCKET: "mybucket" }))).toBeUndefined()
  })

  test("joins with exactly one slash, removing trailing/leading slashes", () => {
    expect(
      s3PublicUrl(
        reader({
          S3_ENDPOINT: "https://s3.example.com/",
          S3_BUCKET: "/mybucket",
        })
      )
    ).toBe("https://s3.example.com/mybucket")
  })

  test("treats empty S3_PUBLIC_URL as unset for derivation", () => {
    const result = s3PublicUrl(
      reader({
        S3_PUBLIC_URL: "",
        S3_ENDPOINT: "https://s3.example.com",
        S3_BUCKET: "mybucket",
      })
    )
    expect(result).toBe("https://s3.example.com/mybucket")
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

  test("uses defaultBase when s3PublicUrl unavailable", () => {
    const result = assetUrl(
      reader({}),
      "images/logo.png",
      "https://fallback.com"
    )
    expect(result).toBe("https://fallback.com/images/logo.png")
  })

  test("prefers s3PublicUrl over defaultBase", () => {
    const result = assetUrl(
      reader({ S3_PUBLIC_URL: "https://files.example.com" }),
      "images/logo.png",
      "https://fallback.com"
    )
    expect(result).toBe("https://files.example.com/images/logo.png")
  })

  test("uses derived s3PublicUrl over defaultBase when endpoint/bucket present", () => {
    const result = assetUrl(
      reader({
        S3_ENDPOINT: "https://s3.example.com",
        S3_BUCKET: "mybucket",
      }),
      "images/logo.png",
      "https://fallback.com"
    )
    expect(result).toBe("https://s3.example.com/mybucket/images/logo.png")
  })

  test("empty S3_PUBLIC_URL with valid endpoint+bucket derives and beats defaultBase", () => {
    const result = assetUrl(
      reader({
        S3_PUBLIC_URL: "",
        S3_ENDPOINT: "https://s3.example.com",
        S3_BUCKET: "mybucket",
      }),
      "images/logo.png",
      "https://fallback.com"
    )
    expect(result).toBe("https://s3.example.com/mybucket/images/logo.png")
  })
})
