import type { APIRoute } from "astro"
import { generateRobotsTxt, SITEMAP_PATH } from "@vandal-websites/robots-sitemap"

// A project route makes EmDash skip its own /robots.txt. Crawling is allowed
// only on the canonical host.
const GET: APIRoute = ({ request }) =>
  new Response(
    generateRobotsTxt(
      new URL(request.url).origin,
      import.meta.env.SITE,
      SITEMAP_PATH
    ),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  )

export { GET }
