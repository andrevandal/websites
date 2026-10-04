import { describe, expect, test } from "bun:test"
import type { AstroIntegration, IntegrationResolvedRoute } from "astro"
import {
  generateRobotsTxt,
  generateSitemapXml,
  robotsSitemap,
  selectSitemapPaths,
} from "./index"

type VirtualModulePlugin = {
  resolveId: (id: string) => string | undefined
  load: (id: string) => string | undefined
}
type SetupOptions = Parameters<
  NonNullable<AstroIntegration["hooks"]["astro:config:setup"]>
>[0]
type RoutesOptions = Parameters<
  NonNullable<AstroIntegration["hooks"]["astro:routes:resolved"]>
>[0]

const CANONICAL = "https://example.com.br"

const route = (
  pattern: string,
  overrides: Partial<IntegrationResolvedRoute> = {}
): IntegrationResolvedRoute =>
  ({
    pattern,
    type: "page",
    origin: "project",
    params: [],
    ...overrides,
  }) as IntegrationResolvedRoute

describe("generateRobotsTxt", () => {
  test("allows crawling on the canonical origin and names the canonical sitemap", () => {
    expect(
      generateRobotsTxt(
        "https://example.com.br",
        `${CANONICAL}/`,
        "/sitemap-index.xml"
      )
    ).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://example.com.br/sitemap-index.xml\n"
    )
  })

  test("disallows crawling on a Workers Preview origin but keeps the canonical sitemap", () => {
    expect(
      generateRobotsTxt(
        "https://pr-12-transportugal.account.workers.dev",
        CANONICAL,
        "/sitemap-index.xml"
      )
    ).toBe(
      "User-agent: *\nDisallow: /\n\nSitemap: https://example.com.br/sitemap-index.xml\n"
    )
  })
})

describe("generateSitemapXml", () => {
  test("emits a urlset under the canonical host, sorted and deduplicated", () => {
    expect(generateSitemapXml(`${CANONICAL}/`, ["/sobre", "/", "/sobre"])).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        "<url><loc>https://example.com.br/</loc></url>",
        "<url><loc>https://example.com.br/sobre</loc></url>",
        "</urlset>",
        "",
      ].join("\n")
    )
  })

  test("escapes XML special characters in a path", () => {
    expect(generateSitemapXml(CANONICAL, [`/a&b<c>"d'`])).toContain(
      "<loc>https://example.com.br/a&amp;b&lt;c&gt;&quot;d&apos;</loc>"
    )
  })
})

describe("selectSitemapPaths", () => {
  test("keeps only static project pages", () => {
    expect(
      selectSitemapPaths([
        route("/"),
        route("/contato"),
        route("/blog/[slug]", { params: ["slug"] }),
        route("/api/search", { type: "endpoint" }),
        route("/antigo", { type: "redirect" }),
        route("/404"),
        route("/500"),
        route("/_image", { origin: "internal", type: "endpoint" }),
        route("/robots.txt", { origin: "external", type: "endpoint" }),
      ])
    ).toEqual(["/", "/contato"])
  })
})

describe("robotsSitemap", () => {
  test("injects both endpoints as request-time routes and serves captured paths through its virtual module", async () => {
    const integration = robotsSitemap({ canonicalHost: CANONICAL })
    const injected: unknown[] = []
    const plugins: VirtualModulePlugin[] = []

    await integration.hooks["astro:config:setup"]?.({
      injectRoute: (injectedRoute: unknown) => injected.push(injectedRoute),
      updateConfig: (config: {
        vite?: { plugins?: VirtualModulePlugin[] }
      }) => {
        plugins.push(...(config.vite?.plugins ?? []))
        return config
      },
    } as unknown as SetupOptions)
    await integration.hooks["astro:routes:resolved"]?.({
      routes: [
        route("/sobre"),
        route("/"),
        route("/x/[id]", { params: ["id"] }),
      ],
    } as unknown as RoutesOptions)

    expect(injected).toEqual([
      {
        pattern: "/robots.txt",
        entrypoint: "@vandal-websites/robots-sitemap/robots",
        prerender: false,
      },
      {
        pattern: "/sitemap-index.xml",
        entrypoint: "@vandal-websites/robots-sitemap/sitemap",
        prerender: false,
      },
    ])

    const [plugin] = plugins
    const resolved = plugin?.resolveId(
      "virtual:@vandal-websites/robots-sitemap/config"
    )
    expect(resolved).toBeString()

    const source = plugin?.load(resolved ?? "") ?? ""
    // The module source is generated at runtime, so only a data URL import can evaluate it.
    const virtualModule = await import(
      `data:text/javascript;base64,${btoa(source)}`
    )
    expect(virtualModule).toMatchObject({
      canonicalHost: "https://example.com.br",
      paths: ["/", "/sobre"],
    })
  })
})
