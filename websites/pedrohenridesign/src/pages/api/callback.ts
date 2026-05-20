import type { APIRoute } from "astro"
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from "astro:env/server"

const prerender = false

const renderBody = (status: string, content: Record<string, string>) => {
  const html = `
  <script>
    const receiveMessage = (message) => {
      window.opener.postMessage(
        'authorization:github:${status}:${JSON.stringify(content)}',
        message.origin
      );
      window.removeEventListener("message", receiveMessage, false);
    }
    window.addEventListener("message", receiveMessage, false);
    window.opener.postMessage("authorizing:github", "*");
  </script>
  `
  const blob = new Blob([html])
  return blob
}

const GET: APIRoute = async context => {
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    return new Response("GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not found", {
      status: 500,
    })
  }

  try {
    const url = new URL(context.url)
    const code = url.searchParams.get("code")
    const response = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "cloudflare-functions-github-oauth-login",
          accept: "application/json",
        },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        }),
      }
    )
    const result = (await response.json()) as Record<string, string>
    if (result.error) {
      return new Response(renderBody("error", result), {
        headers: {
          "content-type": "text/html;charset=UTF-8",
        },
        status: 401,
      })
    }
    const token = result.access_token
    const provider = "github"
    const responseBody = renderBody("success", {
      token,
      provider,
    })
    return new Response(responseBody, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
      status: 200,
    })
  } catch (error) {
    const e = error instanceof Error ? error : new Error(String(error))
    return new Response(e.message, {
      headers: {
        "content-type": "text/html;charset=UTF-8",
      },
      status: 500,
    })
  }
}

export { prerender, GET }
