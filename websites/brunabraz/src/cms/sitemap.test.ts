import { describe, expect, test } from "bun:test"
import type { TaxonomyTerm } from "emdash"
import { HOME_PAGE_SLUG } from "./pages"
import type { SitemapContent, SitemapEntry } from "./sitemap"
import { sitemapUrls } from "./sitemap"

const ORIGIN = "https://brunabraz.com.br"

const entry = (
  slug: string,
  updatedAt = "2026-10-01T00:00:00.000Z"
): SitemapEntry => ({
  id: `id-${slug}`,
  slug,
  updatedAt: new Date(updatedAt),
})

const term = (slug: string, children: TaxonomyTerm[] = []): TaxonomyTerm => ({
  id: `id-${slug}`,
  name: "category",
  slug,
  label: slug,
  children,
  locale: "pt-BR",
  translationGroup: null,
})

const content = (overrides: Partial<SitemapContent> = {}): SitemapContent => ({
  pages: [],
  posts: [],
  categories: [],
  seo: new Map(),
  ...overrides,
})

describe("sitemapUrls", () => {
  test("lists the home page at the root, not /inicio", () => {
    const urls = sitemapUrls(
      content({ pages: [entry(HOME_PAGE_SLUG)] }),
      ORIGIN
    )

    expect(urls).toEqual([
      { path: "/", lastmod: new Date("2026-10-01T00:00:00.000Z") },
    ])
    expect(urls.some(url => url.path.includes("/inicio"))).toBeFalse()
  })

  test("lists routed non-home pages", () => {
    expect(
      sitemapUrls(
        content({
          pages: [entry("aula-ingles-particular"), entry("blog")],
        }),
        ORIGIN
      ).map(url => url.path)
    ).toEqual(["/aula-ingles-particular", "/blog"])
  })

  test("lists a post with its update timestamp", () => {
    const updatedAt = new Date("2026-10-02T00:00:00.000Z")

    expect(
      sitemapUrls(content({ posts: [{ ...entry("x"), updatedAt }] }), ORIGIN)
    ).toEqual([{ path: "/blog/x", lastmod: updatedAt }])
  })

  test("lists every Category and Subcategory page, without a lastmod", () => {
    expect(
      sitemapUrls(
        content({
          categories: [term("category"), term("parent", [term("subcategory")])],
        }),
        ORIGIN
      )
    ).toEqual([
      { path: "/blog/categoria/category" },
      { path: "/blog/categoria/parent" },
      { path: "/blog/categoria/subcategory" },
    ])
  })

  test("leaves noindex pages and posts out", () => {
    expect(
      sitemapUrls(
        content({
          pages: [entry("page")],
          posts: [entry("post")],
          seo: new Map([
            ["pages/id-page", { noIndex: true, canonical: null }],
            ["posts/id-post", { noIndex: true, canonical: null }],
          ]),
        }),
        ORIGIN
      )
    ).toEqual([])
  })

  test("keeps only self-canonical entries and tolerates invalid canonicals", () => {
    expect(
      sitemapUrls(
        content({
          posts: [
            entry("other"),
            entry("relative"),
            entry("absolute"),
            entry("trailing"),
            entry("invalid"),
          ],
          seo: new Map([
            [
              "posts/id-other",
              { noIndex: false, canonical: "https://example.org/other" },
            ],
            [
              "posts/id-relative",
              { noIndex: false, canonical: "/blog/relative" },
            ],
            [
              "posts/id-absolute",
              {
                noIndex: false,
                canonical: "https://brunabraz.com.br/blog/absolute",
              },
            ],
            [
              "posts/id-trailing",
              {
                noIndex: false,
                canonical: "https://brunabraz.com.br/blog/trailing/",
              },
            ],
            ["posts/id-invalid", { noIndex: false, canonical: "http://" }],
          ]),
        }),
        ORIGIN
      ).map(url => url.path)
    ).toEqual([
      "/blog/relative",
      "/blog/absolute",
      "/blog/trailing",
      "/blog/invalid",
    ])
  })

  test("maps the seed's published sitemap entries", () => {
    const postSlugs = [
      "por-que-aprender-outra-lingua-na-era-da-ia",
      "lingua-nao-e-codigo",
      "cada-lingua-recorta-mundo",
      "novo-sistema-operacional-cognicao",
      "conexao-humana-onde-ia-nao-alcanca",
      "mercado-valorizar",
      "ato-radical-neuroplasticidade",
      "educacao-paciencia-humildade",
      "porque-mudou-presente",
    ]
    const categorySlugs = [
      "linguistics",
      "narratives",
      "culture",
      "the-english-language",
      "history",
      "grammar",
      "vocabulary",
      "pronunciation",
      "teaching",
      "travel",
    ]

    expect(
      sitemapUrls(
        content({
          pages: [
            entry(HOME_PAGE_SLUG),
            entry("blog"),
            entry("aula-ingles-particular"),
          ],
          posts: postSlugs.map(slug => entry(slug)),
          categories: categorySlugs.map(slug => term(slug)),
        }),
        ORIGIN
      )
        .map(url => url.path)
        .toSorted()
    ).toEqual([
      "/",
      "/aula-ingles-particular",
      "/blog",
      "/blog/ato-radical-neuroplasticidade",
      "/blog/cada-lingua-recorta-mundo",
      "/blog/categoria/culture",
      "/blog/categoria/grammar",
      "/blog/categoria/history",
      "/blog/categoria/linguistics",
      "/blog/categoria/narratives",
      "/blog/categoria/pronunciation",
      "/blog/categoria/teaching",
      "/blog/categoria/the-english-language",
      "/blog/categoria/travel",
      "/blog/categoria/vocabulary",
      "/blog/conexao-humana-onde-ia-nao-alcanca",
      "/blog/educacao-paciencia-humildade",
      "/blog/lingua-nao-e-codigo",
      "/blog/mercado-valorizar",
      "/blog/novo-sistema-operacional-cognicao",
      "/blog/por-que-aprender-outra-lingua-na-era-da-ia",
      "/blog/porque-mudou-presente",
    ])
  })
})
