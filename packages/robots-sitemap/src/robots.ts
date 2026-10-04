import type { APIRoute } from "astro"
import { canonicalHost } from "virtual:@vandal-websites/robots-sitemap/config"
import { generateRobotsTxt, SITEMAP_PATH } from "./generate"

const GET: APIRoute = ({ request }) =>
  new Response(
    generateRobotsTxt(new URL(request.url).origin, canonicalHost, SITEMAP_PATH),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  )

export { GET }
