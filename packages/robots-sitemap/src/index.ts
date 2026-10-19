import type { AstroIntegration } from "astro"
import {
  generateRobotsTxt,
  generateSitemapXml,
  selectSitemapPaths,
  SITEMAP_PATH,
} from "./generate"
import type { SitemapUrl } from "./generate"

type RobotsSitemapOptions = {
  canonicalHost: string
  // A sitemap the site serves itself (a CMS site's own /sitemap.xml route).
  // When set, /sitemap-index.xml is not injected and robots.txt points here.
  sitemapPath?: string
  // false when src/pages/robots.txt.ts re-exports
  // "@vandal-websites/robots-sitemap/robots", so another integration's injected
  // /robots.txt (EmDash) defers to the project route.
  injectRobots?: boolean
}

const VIRTUAL_CONFIG_ID = "virtual:@vandal-websites/robots-sitemap/config"
const RESOLVED_VIRTUAL_CONFIG_ID = `\0${VIRTUAL_CONFIG_ID}`

const robotsSitemap = ({
  canonicalHost,
  sitemapPath,
  injectRobots = true,
}: RobotsSitemapOptions): AstroIntegration => {
  let paths: string[] = []

  return {
    name: "@vandal-websites/robots-sitemap",
    hooks: {
      "astro:config:setup": ({ injectRoute, updateConfig }) => {
        if (injectRobots) {
          injectRoute({
            pattern: "/robots.txt",
            entrypoint: "@vandal-websites/robots-sitemap/robots",
            prerender: false,
          })
        }
        if (sitemapPath === undefined) {
          injectRoute({
            pattern: SITEMAP_PATH,
            entrypoint: "@vandal-websites/robots-sitemap/sitemap",
            prerender: false,
          })
        }
        updateConfig({
          vite: {
            plugins: [
              {
                name: "@vandal-websites/robots-sitemap:config",
                resolveId: (id: string) =>
                  id === VIRTUAL_CONFIG_ID
                    ? RESOLVED_VIRTUAL_CONFIG_ID
                    : undefined,
                load: (id: string) =>
                  id === RESOLVED_VIRTUAL_CONFIG_ID
                    ? `export const canonicalHost = ${JSON.stringify(new URL(canonicalHost).origin)}\nexport const paths = ${JSON.stringify([...new Set(paths)].toSorted())}\nexport const sitemapPath = ${JSON.stringify(sitemapPath ?? SITEMAP_PATH)}\n`
                    : undefined,
              },
            ],
          },
        })
      },
      "astro:routes:resolved": ({ routes }) => {
        paths = selectSitemapPaths(routes)
      },
    },
  }
}

export {
  generateRobotsTxt,
  generateSitemapXml,
  robotsSitemap,
  selectSitemapPaths,
  SITEMAP_PATH,
}
export type { RobotsSitemapOptions, SitemapUrl }
