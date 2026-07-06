import { describe, expect, test } from "bun:test"
import { getClientIp, isCloudflareIp } from "@/security/client-ip"

describe("isCloudflareIp", () => {
  test("recognizes an IPv4 address inside a published Cloudflare range", () => {
    expect(isCloudflareIp("173.245.48.1")).toBe(true)
  })

  test("rejects an IPv4 address outside all Cloudflare ranges", () => {
    expect(isCloudflareIp("8.8.8.8")).toBe(false)
  })

  test("recognizes an IPv6 address inside a published Cloudflare range", () => {
    expect(isCloudflareIp("2400:cb00::1")).toBe(true)
  })

  test("rejects an IPv6 address outside all Cloudflare ranges", () => {
    expect(isCloudflareIp("2001:4860:4860::8888")).toBe(false)
  })
})

describe("getClientIp", () => {
  test("trusts CF-Connecting-IP when the peer is a real Cloudflare edge IP", () => {
    const ip = getClientIp("173.245.48.1", "203.0.113.7", true)
    expect(ip).toBe("203.0.113.7")
  })

  test("ignores a spoofed CF-Connecting-IP when the peer is not Cloudflare", () => {
    const ip = getClientIp("198.51.100.9", "203.0.113.7", true)
    expect(ip).toBe("198.51.100.9")
  })

  test("ignores the header entirely when trustCloudflareIps is disabled", () => {
    const ip = getClientIp("173.245.48.1", "203.0.113.7", false)
    expect(ip).toBe("173.245.48.1")
  })

  test("falls back to the raw peer address when no header is present", () => {
    const ip = getClientIp("198.51.100.9", undefined, true)
    expect(ip).toBe("198.51.100.9")
  })

  test("falls back to the header when the peer address is unknown", () => {
    const ip = getClientIp(undefined, "203.0.113.7", true)
    expect(ip).toBe("203.0.113.7")
  })
})
