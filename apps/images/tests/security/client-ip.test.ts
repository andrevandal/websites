import { describe, expect, test } from "bun:test"
import { getClientIp, isCloudflareIp, isValidCidr } from "@/security/client-ip"

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

describe("getClientIp behind a trusted reverse proxy", () => {
  const proxy = { trustedProxyCidrs: ["172.16.0.0/12"] }

  test("identifies the visitor by the hop the proxy saw, not the proxy itself", () => {
    const ip = getClientIp("::ffff:172.18.0.13", undefined, true, {
      ...proxy,
      forwardedFor: "203.0.113.7",
    })
    expect(ip).toBe("203.0.113.7")
  })

  test("trusts CF-Connecting-IP when the proxy saw a Cloudflare edge", () => {
    const ip = getClientIp("172.18.0.13", "203.0.113.7", true, {
      ...proxy,
      forwardedFor: "173.245.48.1",
    })
    expect(ip).toBe("203.0.113.7")
  })

  test("ignores a forged CF-Connecting-IP when the proxy did not see Cloudflare", () => {
    const ip = getClientIp("172.18.0.13", "198.51.100.99", true, {
      ...proxy,
      forwardedFor: "203.0.113.7",
    })
    expect(ip).toBe("203.0.113.7")
  })

  test("uses only the last X-Forwarded-For entry, which a client cannot set", () => {
    const ip = getClientIp("172.18.0.13", undefined, true, {
      ...proxy,
      forwardedFor: "198.51.100.99, 203.0.113.7",
    })
    expect(ip).toBe("203.0.113.7")
  })

  test("falls back to the proxy address when X-Forwarded-For is missing or invalid", () => {
    const missing = getClientIp("172.18.0.13", undefined, true, proxy)
    const invalid = getClientIp("172.18.0.13", undefined, true, {
      ...proxy,
      forwardedFor: "not-an-ip",
    })
    expect(missing).toBe("172.18.0.13")
    expect(invalid).toBe("172.18.0.13")
  })

  test("does not trust X-Forwarded-For from a peer outside the trusted CIDRs", () => {
    const ip = getClientIp("198.51.100.9", "203.0.113.7", true, {
      ...proxy,
      forwardedFor: "192.0.2.1",
    })
    expect(ip).toBe("198.51.100.9")
  })

  test("keeps the old behavior when no proxy CIDRs are configured", () => {
    const ip = getClientIp("172.18.0.13", undefined, true, {
      forwardedFor: "203.0.113.7",
    })
    expect(ip).toBe("172.18.0.13")
  })
})

describe("isValidCidr", () => {
  test("accepts IPv4 and IPv6 CIDRs", () => {
    expect(isValidCidr("172.16.0.0/12")).toBe(true)
    expect(isValidCidr("fd00::/8")).toBe(true)
  })

  test("rejects malformed CIDRs", () => {
    expect(isValidCidr("172.16.0.0")).toBe(false)
    expect(isValidCidr("172.16.0.0/33")).toBe(false)
    expect(isValidCidr("nope/8")).toBe(false)
    expect(isValidCidr("10.0.0.0/8/1")).toBe(false)
  })
})
