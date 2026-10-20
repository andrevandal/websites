import { describe, expect, test } from "bun:test"
import { readdir } from "node:fs/promises"
import { waLink } from "@vandal-websites/sun-ui"
import { buildImageSrcSet } from "@vandal-websites/sun-ui/astro-image-service"
import { WA_NUMBER } from "#/data/contact"
import { heroDesktop, heroMobile, heroDensities } from "#/data/hero"

const siteFile = (path: string) => new URL(`../${path}`, import.meta.url)
const source = (path: string) => Bun.file(siteFile(path)).text()

describe("Belly Pão shared static integrations", () => {
  test("all six WhatsApp links use shared helper with site phone data", async () => {
    expect(WA_NUMBER).toBe("5511945488607")
    expect(waLink(WA_NUMBER)).toBe("https://wa.me/5511945488607")
    for (const [path, count] of [
      ["src/components/TheHeader.astro", 1],
      ["src/components/TheFooter.astro", 1],
      ["src/pages/index.astro", 4],
    ] as const) {
      const text = await source(path)
      expect(text).toContain('import { waLink } from "@vandal-websites/sun-ui"')
      expect(text).toContain('import { WA_NUMBER } from "#/data/contact"')
      expect(text.match(/href=\{waLink\(WA_NUMBER\)\}/g)).toHaveLength(count)
      expect(text).not.toContain("https://wa.me/")
    }
    expect(await source("src/components/TheFooter.astro")).toContain(
      "(11) 94548-8607"
    )
  })

  test("header delegates behavior without replacing native checkbox", async () => {
    const header = await source("src/components/TheHeader.astro")
    expect(header).toContain('useHeader("#topo .fixed")')
    expect(header).toContain('type="checkbox" id="menu-opened"')
    expect(header).toContain('for="menu-opened"')
    expect(header).toContain("#topo .fixed.actived")
    expect(header).not.toContain("addEventListener")
  })

  test("hero and preload share art direction and all default density tiers", async () => {
    expect(heroDensities).toEqual([1, 1.5, 2, 2.5, 3])
    expect(heroDesktop).toEqual({
      path: "images/primeira-dobra.png",
      width: 640,
      height: 276,
      breakpoints: [
        { minWidth: 1024, width: 960 },
        { minWidth: 1280, width: 1216 },
      ],
      media: "(min-width: 640px)",
    })
    expect(heroMobile).toEqual({
      path: "images/primeira-dobra_mobile.png",
      width: 375,
      height: 278,
      breakpoints: [{ minWidth: 640, width: 640 }],
      media: "(max-width: 639px)",
      sizes: "100vw",
    })
    for (const [image, expected] of [
      [
        heroDesktop,
        [
          640, 960, 1216, 1280, 1440, 1600, 1824, 1920, 2400, 2432, 2880, 3040,
          3648,
        ],
      ],
      [heroMobile, [375, 563, 640, 750, 938, 960, 1125, 1280, 1600, 1920]],
    ] as const) {
      const widths = new Set<number>()
      for (const width of [
        image.width,
        ...image.breakpoints.map(bp => bp.width),
      ]) {
        for (const entry of buildImageSrcSet({
          src: image.path,
          width,
          densities: heroDensities,
        }))
          widths.add(entry.transform.width as number)
      }
      const entries = buildImageSrcSet({
        src: image.path,
        width: image.width,
        height: image.height,
        quality: 90,
        format: "auto",
        widths: [...widths],
      })
      expect(entries.map(entry => entry.transform.width)).toEqual([...expected])
      for (const entry of entries) {
        expect(entry.transform.height).toBe(
          Math.round(
            ((entry.transform.width as number) * image.height) / image.width
          )
        )
      }
    }
    const header = await source("src/components/TheHeader.astro")
    const page = await source("src/pages/index.astro")
    for (const text of [header, page]) {
      expect(text).toContain('from "#/data/hero"')
      expect(text).toContain("heroDesktop")
      expect(text).toContain("heroMobile")
    }
    expect(header).toContain("sources={[")
    expect(header).toContain("sizes={heroMobile.sizes}")
    expect(header).toContain('loading="eager"')
    expect(header).toContain('fetchpriority="high"')
    expect(page).toContain('from "@vandal-websites/sun-ui/astro-image-service"')
    expect(page).toContain("height: entry.transform.height")
    expect(page).toContain("widths: [...widths]")
    expect(page).not.toContain("desktopWidths")
    expect(page).not.toContain("mobileWidths")
  })

  test("Astro registers all thirteen retained static font variants with swap", async () => {
    const config = await source("astro.config.js")
    const registrations = [
      ...config.matchAll(
        /src: \["\.\/public\/fonts\/(?<filename>[^"]+)"\],\s*weight: (?<weight>\d+),\s*style: "normal",\s*display: "swap"/g
      ),
    ]
    const expected = {
      "Fields-ExtraLight.woff2": 200,
      "Fields-Light.woff2": 300,
      "Fields-Regular.woff2": 400,
      "Fields-Medium.woff2": 500,
      "Fields-SemiBold.woff2": 600,
      "Fields-Bold.woff2": 700,
      "Fields-ExtraBold.woff2": 800,
      "Fields-Black.woff2": 900,
      "Quicksand-Light.woff2": 300,
      "Quicksand-Regular.woff2": 400,
      "Quicksand-Medium.woff2": 500,
      "Quicksand-SemiBold.woff2": 600,
      "Quicksand-Bold.woff2": 700,
    }
    expect(
      Object.fromEntries(
        registrations.map(match => [
          match.groups?.filename,
          Number(match.groups?.weight),
        ])
      )
    ).toEqual(expected)
    expect(registrations).toHaveLength(13)
    expect((await readdir(siteFile("public/fonts"))).sort()).toEqual(
      Object.keys(expected).sort()
    )
    expect(config.match(/provider: fontProviders\.local\(\)/g)).toHaveLength(2)
    const layout = await source("src/layouts/Layout.astro")
    const css = await source("src/styles/global.css")
    for (const family of ["fields", "quicksand"]) {
      expect(config).toContain(`cssVariable: "--belly-font-${family}"`)
      expect(layout).toContain(
        `<Font cssVariable="--belly-font-${family}" preload />`
      )
      expect(css).toContain(`var(--belly-font-${family})`)
    }
    expect(layout).not.toContain("/css/fonts.css")
    expect(layout).not.toContain("onload=")
  })
})
