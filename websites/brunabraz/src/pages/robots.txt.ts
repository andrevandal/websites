import type { APIRoute } from "astro"
import { generateRobotsTxt } from "@vandal-websites/robots-sitemap"
import { getSiteSettings } from "emdash"
import { robotsRules } from "@/cms/robots"
import { SITEMAP_URL_PATH } from "@/cms/sitemap"

// A project route makes EmDash skip its own /robots.txt. Rules typed in the
// admin (Settings > SEO > robots.txt) apply on the canonical host only.
const GET: APIRoute = async ({ request }) => {
  const adminText = await getSiteSettings()
    .then(settings => settings.seo?.robotsTxt)
    .catch((error: unknown) => {
      console.error("robots.txt: site settings unavailable", error)
      return undefined
    })
  return new Response(
    generateRobotsTxt(
      new URL(request.url).origin,
      import.meta.env.SITE,
      SITEMAP_URL_PATH,
      robotsRules(adminText)
    ),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } }
  )
}

export { GET }
