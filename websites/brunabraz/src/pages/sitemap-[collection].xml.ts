import type { APIRoute } from "astro"

// Owning this pattern stops EmDash injecting its per-collection sitemaps;
// /sitemap.xml is the site's only sitemap.
const GET: APIRoute = () => new Response(null, { status: 404 })

export { GET }
