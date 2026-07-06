import { describe, expect, test } from "bun:test"
import { app } from "@/app"
import { config } from "@/config/env"

describe("GET /", () => {
  test("returns 200 with the home page HTML", async () => {
    const response = await app.request("/")

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toContain("text/html")
    const body = await response.text()
    expect(body).toContain("Hello world")
  })
})

describe("GET /healthy", () => {
  test("returns 200 with ok status", async () => {
    const response = await app.request("/healthy")

    expect(response.status).toBe(200)
    const data = (await response.json()) as Record<string, unknown>
    expect(data.status).toBe("ok")
  })
})

describe("GET /favicon.ico", () => {
  test("returns 200 with static file", async () => {
    const response = await app.request("/favicon.ico")

    expect(response.status).toBe(200)
    const contentType = response.headers.get("content-type")
    expect(contentType).toBeTruthy()
    expect(
      contentType?.includes("image") ||
        contentType?.includes("x-icon") ||
        contentType?.includes("vnd.microsoft.icon")
    ).toBe(true)
  })

  test("returns favicon with appropriate content-type", async () => {
    const response = await app.request("/favicon.ico")

    const contentType = response.headers.get("content-type")
    expect(contentType).toBeTruthy()
  })
})

describe("Route matching priority", () => {
  test("matches /favicon.ico before catch-all route", async () => {
    const response = await app.request("/favicon.ico")

    expect(response.status).toBe(200)
    const contentType = response.headers.get("content-type")
    expect(contentType).toBeTruthy()
  })

  test("matches /healthy before catch-all route", async () => {
    const response = await app.request("/healthy")

    expect(response.status).toBe(200)
    const data = (await response.json()) as Record<string, unknown>
    expect(data.status).toBe("ok")
  })

  test("catch-all /* route returns 400 for malformed path without source", async () => {
    // "/" is no longer a catch-all case — it now routes to the home page
    // handler (apps/images/src/handlers/home.ts, unrelated WIP). A single
    // path segment with no "/" separator still reaches the catch-all and
    // fails RIAPI parsing the same way.
    const response = await app.request("/malformed")

    expect(response.status).toBe(400)
    const data = (await response.json()) as Record<string, unknown>
    expect(data.status).toBe(400)
    expect(typeof data.error).toBe("string")
  })

  test("catch-all /* route processes valid image paths", async () => {
    // This tests that the catch-all route is reached and processes the request
    // A request with missing source should fail at source resolution stage
    const response = await app.request("/_/nonexistent")

    // Should get a response from the image handler (400 or 404 depending on the source resolution)
    expect([400, 404]).toContain(response.status)
    const data = (await response.json()) as Record<string, unknown>
    expect(data.status).toBeDefined()
  })
})

describe("GET /robots.txt", () => {
  test("disallows all crawling", async () => {
    const response = await app.request("/robots.txt")

    expect(response.status).toBe(200)
    const body = await response.text()
    expect(body).toContain("Disallow: /")
  })
})

describe("bot defense: blocklist", () => {
  test("blocks a known exploit-probe path without touching source resolution", async () => {
    const response = await app.request("/.git/config")

    expect(response.status).toBe(404)
    // Discriminates from the natural fs-source-not-found 404 (message "not
    // found" / "fs source disabled: ..."), which this path would ALSO hit
    // if the blocklist middleware weren't wired in ahead of it.
    const data = (await response.json()) as Record<string, unknown>
    expect(data.error).toBe("Not Found")
  })
})

describe("bot defense: ban escalation", () => {
  const mockServer = (ip: string) => ({
    requestIP: () => ({ address: ip, family: "IPv4" as const, port: 41000 }),
  })

  test("bans the client IP after enough blocklist strikes, blocking subsequent requests", async () => {
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 10}`
    const env = mockServer(ip)

    for (let i = 0; i < config.banStrikeThreshold; i++) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- strikes must land in order to trip the threshold deterministically
      const response = await app.request("/.git/config", undefined, env)
      expect(response.status).toBe(404)
    }

    const bannedResponse = await app.request("/malformed", undefined, env)
    expect(bannedResponse.status).toBe(403)
  })
})

describe("bot defense: rate limiting", () => {
  const mockServer = (ip: string) => ({
    requestIP: () => ({ address: ip, family: "IPv4" as const, port: 41001 }),
  })

  test("returns 429 once a single client exceeds the configured request limit", async () => {
    const env = mockServer(`198.51.100.${Math.floor(Math.random() * 200) + 10}`)
    let lastStatus = 0

    for (let i = 0; i < config.rateLimitMax + 1; i++) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- hits must be counted in order against the shared window
      const response = await app.request("/malformed", undefined, env)
      lastStatus = response.status
    }

    expect(lastStatus).toBe(429)
  })
})
