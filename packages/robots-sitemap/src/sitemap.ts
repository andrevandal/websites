import type { APIRoute } from "astro"
import { canonicalHost, paths } from "virtual:@vandal-websites/robots-sitemap/config"
import { generateSitemapXml } from "./generate"

const GET: APIRoute = () =>
  new Response(
    generateSitemapXml(
      canonicalHost,
      paths.map(path => ({ path }))
    ),
    { headers: { "Content-Type": "application/xml; charset=utf-8" } }
  )

export { GET }
