import type { APIRoute } from "astro"
import { generateSitemapXml } from "@vandal-websites/robots-sitemap"
import { loadSitemapPaths } from "@/cms/sitemap"

// The site's only sitemap: the URLs it serves, on the canonical host, read
// from the CMS on every request.
const GET: APIRoute = async () =>
  new Response(
    generateSitemapXml(import.meta.env.SITE, await loadSitemapPaths()),
    { headers: { "Content-Type": "application/xml; charset=utf-8" } }
  )

export { GET }
