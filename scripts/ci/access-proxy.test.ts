import { afterEach, describe, expect, test } from "bun:test"
import { createAccessProxy } from "./access-proxy"

type RecordedRequest = { url: string; headers: Record<string, string> }
type RawRequestData = { response: string }
const servers: { stop: (force?: boolean) => void }[] = []
afterEach(() => {
  for (const server of servers.splice(0)) server.stop(true)
})

// Read the status/headers, not a body whose framing is irrelevant to rejection.
const rawHttpRequest = async (
  port: number,
  target: string,
  headers: Record<string, string> = {}
): Promise<string> => {
  const { promise, resolve, reject } = Promise.withResolvers<string>()
  const socket = await Bun.connect<RawRequestData>({
    hostname: "127.0.0.1",
    port,
    data: { response: "" },
    socket: {
      open: sock => {
        sock.write(
          [
            `GET ${target} HTTP/1.1`,
            `Host: ${headers.Host ?? `127.0.0.1:${port}`}`,
            "Connection: close",
            ...Object.entries(headers)
              .filter(([key]) => key !== "Host")
              .map(([key, value]) => `${key}: ${value}`),
            "",
            "",
          ].join("\r\n")
        )
      },
      data: (sock, data) => {
        sock.data.response += Buffer.from(data).toString("utf8")
        if (sock.data.response.includes("\r\n\r\n")) resolve(sock.data.response)
      },
      close: sock => resolve(sock.data.response),
      error: (_socket, error) => reject(error),
    },
  })
  const timer = setTimeout(
    () => reject(new Error("Raw HTTP response timed out")),
    2000
  )
  try {
    return await promise
  } finally {
    clearTimeout(timer)
    socket.terminate()
  }
}

const fixture = () => {
  const received: RecordedRequest[] = []
  const external: RecordedRequest[] = []
  const second = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: request => {
      external.push({
        url: request.url,
        headers: Object.fromEntries(request.headers),
      })
      return new Response("external")
    },
  })
  const upstream = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: request => {
      const record = {
        url: request.url,
        headers: Object.fromEntries(request.headers),
      }
      received.push(record)
      const path = new URL(request.url).pathname
      const locations: Record<string, string> = {
        "/relative": "../ok?x=1#anchor",
        "/same": `${upstream.url.origin}/ok?x=2`,
        "/external": `//127.0.0.1:${second.port}/capture`,
        "/prefix": `${upstream.url.origin}.evil.test/capture`,
        "/userinfo": `http://127.0.0.1:${upstream.port}@127.0.0.1:${second.port}/capture`,
      }
      const location = locations[path]
      return location
        ? new Response(null, { status: 302, headers: { location } })
        : Response.json(record)
    },
  })
  const proxy = createAccessProxy({
    target: upstream.url.origin,
    clientId: "server-id.access",
    clientSecret: "server-secret",
  })
  servers.push(proxy, upstream, second)
  return { proxy, upstream, second, received, external }
}

describe("Access audit proxy", () => {
  test("forwards a normal raw target with server credentials and no forged Host", async () => {
    const { proxy, upstream, received } = fixture()
    const raw = await rawHttpRequest(proxy.port!, "/ok?x=1", {
      Host: "forged.invalid",
      "CF-Access-Client-Id": "forged-id",
      "CF-Access-Client-Secret": "forged-secret",
    })
    expect(raw).toStartWith("HTTP/1.1 200")
    expect(received).toHaveLength(1)
    expect(received[0]!.url).toBe(`${upstream.url.origin}/ok?x=1`)
    expect(received[0]!.headers.host).toBe(upstream.url.host)
    expect(received[0]!.headers["cf-access-client-id"]).toBe("server-id.access")
    expect(received[0]!.headers["cf-access-client-secret"]).toBe(
      "server-secret"
    )
    const response = await fetch(`${proxy.url.origin}/ok?x=1`)
    expect(response.status).toBe(200)
    expect((await response.json()).url).toBe(`${upstream.url.origin}/ok?x=1`)
  })

  test("rejects raw authority-selecting targets before either origin receives a request", async () => {
    const { proxy, upstream, second, received, external } = fixture()
    for (const target of [
      `//127.0.0.1:${second.port}/capture`,
      `/\\127.0.0.1:${second.port}/capture`,
      `\\\\127.0.0.1:${second.port}/capture`,
    ]) {
      const raw = await rawHttpRequest(proxy.port!, target)
      expect(raw).toStartWith("HTTP/1.1 400")
    }
    expect(received).toEqual([])
    expect(external).toEqual([])

    // Bun rewrites an absolute-form target onto the Host authority, so the proxy
    // cannot reject it; it must still be pinned to the configured upstream.
    await rawHttpRequest(proxy.port!, `http://127.0.0.1:${second.port}/capture`)
    expect(received.map(r => r.url)).toEqual([`${upstream.url.origin}/capture`])
    expect(external).toEqual([])
  })

  test("rewrites only exact same-origin redirects and external follow-up has no token", async () => {
    const { proxy, upstream, second, received, external } = fixture()
    for (const [path, expected] of [
      ["relative", `${proxy.url.origin}/ok?x=1#anchor`],
      ["same", `${proxy.url.origin}/ok?x=2`],
      ["external", `//127.0.0.1:${second.port}/capture`],
      ["prefix", `${upstream.url.origin}.evil.test/capture`],
      [
        "userinfo",
        `http://127.0.0.1:${upstream.port}@127.0.0.1:${second.port}/capture`,
      ],
    ]) {
      const response = await fetch(`${proxy.url.origin}/${path}`, {
        redirect: "manual",
      })
      expect(response.status).toBe(302)
      expect(response.headers.get("location")).toBe(expected)
    }
    expect(received).toHaveLength(5)
    expect(external).toEqual([])
    const redirect = await fetch(`${proxy.url.origin}/external`, {
      redirect: "manual",
    })
    const followed = await fetch(
      new URL(redirect.headers.get("location")!, proxy.url.origin)
    )
    expect(await followed.text()).toBe("external")
    expect(external).toHaveLength(1)
    expect(external[0]!.headers["cf-access-client-id"]).toBeUndefined()
    expect(external[0]!.headers["cf-access-client-secret"]).toBeUndefined()
  })
})
