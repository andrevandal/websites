import type { IntegrationResolvedRoute } from "astro"

const SITEMAP_PATH = "/sitemap-index.xml"
const ERROR_PAGES: Record<string, true> = { "/404": true, "/500": true }
const XML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
}

// Crawling is allowed only on the canonical host; Workers Preview and other
// hosts serving the same Worker are disallowed.
const generateRobotsTxt = (
  requestOrigin: string,
  canonicalHost: string,
  sitemapPath: string
): string => {
  const canonical = new URL(canonicalHost).origin
  const rule =
    new URL(requestOrigin).origin === canonical ? "Allow: /" : "Disallow: /"

  return `User-agent: *\n${rule}\n\nSitemap: ${canonical}${sitemapPath}\n`
}

const generateSitemapXml = (
  canonicalHost: string,
  paths: readonly string[]
): string => {
  const canonical = new URL(canonicalHost).origin
  const urls = [...new Set(paths)]
    .toSorted()
    .map(
      path =>
        `<url><loc>${`${canonical}${path}`.replace(/[&<>"']/g, char => XML_ENTITIES[char] ?? char)}</loc></url>`
    )

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n")
}

const selectSitemapPaths = (
  routes: readonly IntegrationResolvedRoute[]
): string[] =>
  routes
    .filter(
      route =>
        route.origin === "project" &&
        route.type === "page" &&
        route.params.length === 0 &&
        !ERROR_PAGES[route.pattern]
    )
    .map(route => route.pattern)

export {
  generateRobotsTxt,
  generateSitemapXml,
  selectSitemapPaths,
  SITEMAP_PATH,
}
