// Local reverse proxy that adds a Cloudflare Access service token to every
// request it forwards to one origin, so a browser can audit an Access-protected
// preview without ever holding the token.
//
// Lighthouse's `extraHeaders` setting puts the headers on every request the
// page makes, so each origin the page loads (images, fonts, analytics) receives
// the token, and Lighthouse copies it into the report it uploads. Pointing the
// browser at this proxy instead keeps the token in this process: the browser
// only ever sees `http://127.0.0.1:<port>`, and subresources on other origins
// are fetched directly, with no credentials.
//
//   ACCESS_PROXY_TARGET=https://pr-1-site.example.workers.dev \
//   CF_ACCESS_CLIENT_ID=... CF_ACCESS_CLIENT_SECRET=... \
//   ACCESS_PROXY_PORT=8788 bun scripts/ci/access-proxy.ts

type AccessProxyOptions = {
  target: string
  clientId: string
  clientSecret: string
  port?: number
}

// Hop-by-hop or body-describing headers that no longer match once the body
// has been decoded and re-streamed.
const DROPPED_RESPONSE_HEADERS = [
  "content-encoding",
  "content-length",
  "transfer-encoding",
]

const createAccessProxy = ({
  target,
  clientId,
  clientSecret,
  port = 0,
}: AccessProxyOptions) => {
  const upstreamOrigin = new URL(target).origin

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port,
    async fetch(request, bun) {
      let requestUrl: URL
      try {
        requestUrl = new URL(request.url)
      } catch {
        return new Response(null, { status: 400 })
      }
      const { pathname, search } = requestUrl
      // Reject paths that attempt authority manipulation (backslash, //, @, etc.)
      if (
        pathname.includes("\\") ||
        pathname.startsWith("//") ||
        !pathname.startsWith("/")
      )
        return new Response(null, { status: 400 })

      // Absolute-form requests must not supply an authority different from Host.
      // Host itself is untrusted and never selects the upstream.
      if (requestUrl.host !== request.headers.get("host"))
        return new Response(null, { status: 400 })

      const targetUrl = new URL(pathname + search, upstreamOrigin)
      if (targetUrl.origin !== upstreamOrigin)
        return new Response(null, { status: 400 })

      const headers = new Headers(request.headers)
      headers.delete("host")
      headers.set("CF-Access-Client-Id", clientId)
      headers.set("CF-Access-Client-Secret", clientSecret)

      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: request.body,
        redirect: "manual",
      })

      const out = new Headers(response.headers)
      for (const name of DROPPED_RESPONSE_HEADERS) out.delete(name)
      const location = out.get("location")
      if (location) {
        try {
          const redirectUrl = new URL(location, targetUrl)
          // Rewrite only same-origin URLs back to the proxy
          if (redirectUrl.origin === upstreamOrigin) {
            out.set(
              "location",
              `http://127.0.0.1:${bun.port}${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
            )
          }
          // External redirects pass through unchanged
        } catch {
          // Malformed location header, leave it unchanged
        }
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: out,
      })
    },
  })

  return server
}

if (import.meta.main) {
  const target = process.env["ACCESS_PROXY_TARGET"]
  const clientId = process.env["CF_ACCESS_CLIENT_ID"]
  const clientSecret = process.env["CF_ACCESS_CLIENT_SECRET"]
  if (!target || !clientId || !clientSecret) {
    console.error(
      "ACCESS_PROXY_TARGET, CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET are required"
    )
    process.exit(1)
  }

  const server = createAccessProxy({
    target,
    clientId,
    clientSecret,
    port: Number(process.env["ACCESS_PROXY_PORT"] ?? 0),
  })
  console.log(`access proxy on http://127.0.0.1:${server.port} -> ${target}`)
}

export { createAccessProxy }
export type { AccessProxyOptions }
