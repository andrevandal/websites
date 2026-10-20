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

type SitemapUrl = { path: string; lastmod?: Date }

// Crawling is allowed only on the canonical host; Workers Preview and other
// hosts serving the same Worker are disallowed.
const generateRobotsTxt = (
  requestOrigin: string,
  canonicalHost: string,
  sitemapPath: string,
  canonicalRules: readonly string[] = []
): string => {
  const canonical = new URL(canonicalHost).origin
  const rules =
    new URL(requestOrigin).origin === canonical
      ? ["User-agent: *", "Allow: /", ...canonicalRules]
      : ["User-agent: *", "Disallow: /"]

  return [...rules, "", `Sitemap: ${canonical}${sitemapPath}`, ""].join("\n")
}

const generateSitemapXml = (
  canonicalHost: string,
  sitemapUrls: readonly SitemapUrl[]
): string => {
  const canonical = new URL(canonicalHost).origin
  const urls = new Map<string, SitemapUrl>()

  for (const url of sitemapUrls)
    if (!urls.has(url.path)) urls.set(url.path, url)

  const xmlUrls = [...urls.values()]
    .toSorted((left, right) => left.path.localeCompare(right.path))
    .map(({ lastmod, path }) => {
      const location = `${canonical}${path}`.replace(
        /[&<>"']/g,
        char => XML_ENTITIES[char] ?? char
      )
      const timestamp = lastmod
        ? `<lastmod>${lastmod.toISOString()}</lastmod>`
        : ""

      return `<url><loc>${location}</loc>${timestamp}</url>`
    })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...xmlUrls,
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
export type { SitemapUrl }
