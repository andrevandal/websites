import { describe, expect, test } from "bun:test"
import { getDeepHealthStatus, getHealthStatus } from "@/handlers/health"
import type { DeepHealthDeps } from "@/handlers/health"

describe("getHealthStatus", () => {
  test("is ok with no bans", () => {
    expect(getHealthStatus()).toEqual({ status: "ok" })
  })

  test("is ok when only public visitors are banned", () => {
    expect(getHealthStatus(["203.0.113.7", "2001:db8::1"])).toEqual({
      status: "ok",
    })
  })

  test("is degraded when a private-range address is banned", () => {
    for (const ip of ["172.18.0.2", "10.1.2.3", "192.168.1.5", "127.0.0.1"]) {
      expect(getHealthStatus([ip])).toEqual({
        status: "degraded",
        reason: "proxy-banned",
      })
    }
  })

  test("is degraded when a trusted proxy CIDR address is banned", () => {
    expect(getHealthStatus(["100.64.0.9"], ["100.64.0.0/10"])).toEqual({
      status: "degraded",
      reason: "proxy-banned",
    })
  })

  test("one banned proxy among public bans degrades", () => {
    expect(getHealthStatus(["203.0.113.7", "172.18.0.2"]).status).toBe(
      "degraded"
    )
  })
})

describe("getDeepHealthStatus", () => {
  const png = new Uint8Array([1, 2, 3])
  const deps = (over: Partial<DeepHealthDeps> = {}): DeepHealthDeps => ({
    imageUrl: "https://files.example/x.png",
    loadImage: async () => png,
    decodeImage: async bytes => bytes as Uint8Array,
    ...over,
  })

  test("ok when no bans and the image loads and decodes", async () => {
    expect(await getDeepHealthStatus([], [], deps())).toEqual({
      status: "ok",
      checks: { proxy: "ok", image: "ok" },
    })
  })

  test("skips the image check when no image URL is configured", async () => {
    const result = await getDeepHealthStatus([], [], deps({ imageUrl: "" }))

    expect(result).toEqual({
      status: "ok",
      checks: { proxy: "ok", image: "skipped" },
    })
  })

  test("degraded when the source fetch fails", async () => {
    const loadImage = async () => {
      throw new Error("fetch failed: 403")
    }
    const result = await getDeepHealthStatus([], [], deps({ loadImage }))

    expect(result).toEqual({
      status: "degraded",
      checks: { proxy: "ok", image: "failed" },
    })
  })

  test("degraded when the bytes cannot be decoded", async () => {
    const decodeImage = async () => {
      throw new Error("bad image")
    }
    const result = await getDeepHealthStatus([], [], deps({ decodeImage }))

    expect(result.checks.image).toBe("failed")
    expect(result.status).toBe("degraded")
  })

  test("degraded when decoding yields no bytes", async () => {
    const decodeImage = async () => new Uint8Array(0)
    const result = await getDeepHealthStatus([], [], deps({ decodeImage }))

    expect(result.checks.image).toBe("failed")
  })

  test("reports the banned proxy even when the image is fine", async () => {
    const result = await getDeepHealthStatus(["172.18.0.2"], [], deps())

    expect(result).toEqual({
      status: "degraded",
      checks: { proxy: "banned", image: "ok" },
    })
  })
})
