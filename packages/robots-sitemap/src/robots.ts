import type { APIRoute } from "astro"
import {
  canonicalHost,
  sitemapPath,
} from "virtual:@vandal-websites/robots-sitemap/config"
import { generateRobotsTxt } from "./generate"

const GET: APIRoute = ({ request }) =>
  new Response(
    generateRobotsTxt(new URL(request.url).origin, canonicalHost, sitemapPath),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  )

export { GET }
