// oxlint-disable import/group-exports
import type { APIRoute } from "astro"
import { GITHUB_CLIENT_ID } from "astro:env/server"

export const GET: APIRoute = context => {
  try {
    if (!GITHUB_CLIENT_ID) {
      return new Response("GITHUB_CLIENT_ID not found", {
        status: 500,
      })
    }
    const url = new URL(context.url)
    const redirectUrl = new URL("https://github.com/login/oauth/authorize")
    redirectUrl.searchParams.set("client_id", GITHUB_CLIENT_ID)
    redirectUrl.searchParams.set("redirect_uri", `${url.origin}/api/callback`)
    redirectUrl.searchParams.set("scope", "repo user")
    redirectUrl.searchParams.set(
      "state",
      crypto.getRandomValues(new Uint8Array(12)).join("")
    )

    return context.redirect(redirectUrl.href, 301)
  } catch (error) {
    const e = error instanceof Error ? error : new Error(String(error))
    return new Response(e.message, {
      status: 500,
    })
  }
}

export const prerender = false
