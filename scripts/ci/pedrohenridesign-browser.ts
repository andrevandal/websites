// Run against an already-built disposable Preview with external, human-authorized
// Access storage state. No deployment, initialization, or CMS mutation occurs here.
// Run analytics separately after saving each of the three approved settings sets
// through the real admin; fixtures must contain the exact currently saved values.
// Content fixture preparation: the signed post and category must never have been
// published and must reference each other for the draft-leak assertions. Their
// actual article h1 / category section h2 must be nonempty fixture titles.
// The category MUST have no social_image and no SEO-panel image override. Run
// content separately with a valid site default social image, then an orphaned
// default reference, saved through the admin. The runner reports default/fallback
// output without changing CMS settings. Image-service-enabled staging candidate
// and density validation remains a separate, externally authorized audit.
import { readFile } from "node:fs/promises"
import { chromium } from "playwright"
import type { BrowserContext, BrowserContextOptions, Page } from "playwright"
import sharp from "sharp"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { findings, originalUrl } from "../audit-images"
import type { Intrinsic, Sighting } from "../audit-images"

type FixtureConfig = {
  postPreviewUrl: string
  categoryPreviewUrl: string
  renderingPath: string
  gtagId: string
  conversionId: string
  conversionLabel: string
}
type Args = {
  url: string
  "storage-state": string
  fixtures: string
  phase: "analytics" | "content"
}
type AnalyticsWindow = Window & {
  dataLayer?: ArrayLike<unknown>[]
  gtag?: (...args: unknown[]) => void
  gtag_report_conversion?: () => void
  issue197Injected?: number
}
type Check = (label: string, action: () => Promise<void>) => Promise<void>

const FIXTURE_KEYS = [
  "postPreviewUrl",
  "categoryPreviewUrl",
  "renderingPath",
  "gtagId",
  "conversionId",
  "conversionLabel",
] as const
const VIEWPORTS = [390, 640, 1024, 1280, 1440]
const CANONICAL = "https://pedrohenridesign.com.br"

const assert: (condition: unknown, message?: string) => asserts condition = (
  condition,
  message = "Assertion failed."
) => {
  if (!condition) throw new Error(message)
}

const validateFixtures = (raw: unknown): FixtureConfig => {
  assert(
    typeof raw === "object" && raw !== null && !Array.isArray(raw),
    "Invalid fixtures."
  )
  const obj = raw as Record<string, unknown>
  assert(Object.keys(obj).length === FIXTURE_KEYS.length, "Invalid fixtures.")
  for (const key of FIXTURE_KEYS)
    assert(typeof obj[key] === "string", "Invalid fixtures.")
  const fixtures = obj as FixtureConfig
  assert(
    fixtures.renderingPath === "/posts/issue-197-rendering/",
    "Invalid fixtures."
  )
  for (const key of ["postPreviewUrl", "categoryPreviewUrl"] as const) {
    const url = new URL(fixtures[key])
    assert(
      url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        Boolean(url.searchParams.get("_preview")),
      "Invalid fixtures."
    )
  }
  assert(
    Boolean(fixtures.gtagId) &&
      Boolean(fixtures.conversionId) &&
      Boolean(fixtures.conversionLabel),
    "Invalid fixtures."
  )
  return fixtures
}

const validateOrigin = (input: string, fixtures: FixtureConfig) => {
  const url = new URL(input)
  assert(
    url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash,
    "Invalid Preview origin."
  )
  assert(
    [fixtures.postPreviewUrl, fixtures.categoryPreviewUrl].every(
      value => new URL(value).origin === url.origin
    ),
    "Fixture origin mismatch."
  )
  return url.origin
}

const corruptPreviewUrl = (input: string) => {
  const url = new URL(input)
  const token = url.searchParams.get("_preview")
  assert(token, "Missing preview token.")
  const signatureStart = token.lastIndexOf(".") + 1
  assert(signatureStart < token.length, "Missing preview signature.")
  const character = token[signatureStart] === "a" ? "b" : "a"
  url.searchParams.set(
    "_preview",
    token.slice(0, signatureStart) + character + token.slice(signatureStart + 1)
  )
  return url.toString()
}

const isTransformedImage = (input: string, base: string) => {
  const url = new URL(input, base)
  // Only /_image is a transformed image (local image service).
  // IMAGES_BASE_URL transformations use dynamic hostnames from environment.
  return url.pathname === "/_image"
}

const parseCliArgs = async (argv: string[]) => {
  const args = await yargs(hideBin(argv))
    .scriptName("pedrohenridesign-browser")
    .option("url", { type: "string", demandOption: true })
    .option("storage-state", { type: "string", demandOption: true })
    .option("fixtures", { type: "string", demandOption: true })
    .option("phase", {
      type: "string",
      choices: ["analytics", "content"],
      demandOption: true,
    })
    .strict()
    .exitProcess(false)
    .showHelpOnFail(false)
    // Never include yargs' input-derived messages (an unknown flag can be secret).
    .fail(() => {
      throw new Error("Invalid command arguments.")
    })
    .parseAsync()
  return args as Args
}

const blockGoogle = async (page: Page) => {
  await page.route("**/*", async route => {
    const host = new URL(route.request().url()).hostname
    const blocked = [
      "google.com",
      "google-analytics.com",
      "googletagmanager.com",
      "doubleclick.net",
      "googleadservices.com",
      "googlesyndication.com",
    ].some(domain => host === domain || host.endsWith(`.${domain}`))
    if (blocked) await route.abort()
    else await route.continue()
  })
}

const analyticsPhase = async (
  page: Page,
  fixtures: FixtureConfig,
  origin: string,
  check: Check
) => {
  let errors = 0
  page.on("pageerror", () => {
    errors++
  })
  await page.addInitScript(() => {
    ;(window as AnalyticsWindow).issue197Injected = 0
  })
  // Three reloads exercise repeat installation. Different saved settings require
  // separate CLI invocations; this runner never substitutes mocked settings.
  for (let run = 1; run <= 3; run++) {
    await check(
      `analytics ${run}: built page and gtag installation`,
      async () => {
        const response = await page.goto(
          new URL(fixtures.renderingPath, origin).href
        )
        assert(response?.status() === 200)
        await page.waitForFunction(
          () => typeof (window as AnalyticsWindow).gtag === "function"
        )
      }
    )
    await check(`analytics ${run}: exact initial configuration`, async () => {
      const configured = await page.evaluate(
        id =>
          (window as AnalyticsWindow).dataLayer?.some(
            row => row[0] === "config" && row[1] === id
          ),
        fixtures.gtagId
      )
      assert(configured)
    })
    await check(`analytics ${run}: actual conversion callback`, async () => {
      const queued = await page.evaluate(target => {
        const win = window as AnalyticsWindow
        if (typeof win.gtag_report_conversion !== "function") return false
        const start = win.dataLayer?.length ?? 0
        win.gtag_report_conversion()
        return win.dataLayer
          ?.slice(start)
          .some(
            ([eventType, eventName, value]) =>
              eventType === "event" &&
              eventName === "conversion" &&
              typeof value === "object" &&
              value !== null &&
              "send_to" in value &&
              value.send_to === target
          )
      }, `${fixtures.conversionId}/${fixtures.conversionLabel}`)
      assert(queued)
    })
    await check(`analytics ${run}: after-swap configuration`, async () => {
      const queued = await page.evaluate(id => {
        const win = window as AnalyticsWindow
        const start = win.dataLayer?.length ?? 0
        document.dispatchEvent(new Event("astro:after-swap"))
        return win.dataLayer
          ?.slice(start)
          .some(row => row[0] === "config" && row[1] === id)
      }, fixtures.gtagId)
      assert(queued)
    })
    await check(
      `analytics ${run}: no injected code or page errors`,
      async () => {
        assert(
          await page.evaluate(
            () => (window as AnalyticsWindow).issue197Injected === 0
          )
        )
        assert((await page.locator("#issue197-injected").count()) === 0)
        assert(errors === 0)
      }
    )
  }
}

const previewPhase = async (
  page: Page,
  fixtures: FixtureConfig,
  origin: string,
  check: Check
) => {
  const urls = [fixtures.postPreviewUrl, fixtures.categoryPreviewUrl]
  const titles: string[] = []
  const categorySlug = decodeURIComponent(
    new URL(fixtures.categoryPreviewUrl).pathname
      .split("/")
      .filter(Boolean)
      .at(-1) ?? ""
  )
  const categorySection = `section[id=${JSON.stringify(categorySlug)}]`
  for (const [index, url] of urls.entries()) {
    await check(`draft ${index + 1}: matching signed preview`, async () => {
      const response = await page.goto(url)
      assert(response?.status() === 200)
      const heading = index === 0 ? "article h1" : `${categorySection} h2`
      const title = (await page.locator(heading).first().innerText()).trim()
      assert(title && !/404|not found|n[aã]o encontrad/i.test(title))
      titles[index] = title
    })
  }
  for (const [index, url] of urls.entries()) {
    const removed = new URL(url)
    removed.searchParams.delete("_preview")
    const swapped = new URL(url)
    swapped.searchParams.set(
      "_preview",
      new URL(urls[1 - index]).searchParams.get("_preview") ?? ""
    )
    for (const [kind, candidate] of [
      ["removed", removed.href],
      ["corrupted", corruptPreviewUrl(url)],
      ["swapped", swapped.href],
    ]) {
      await check(
        `draft ${index + 1}: ${kind} authorization denied`,
        async () => {
          assert(titles[index], "Matching draft did not render.")
          const response = await page.goto(candidate)
          assert(response?.status() === 404)
          assert(
            !(await page.locator("body").innerText()).includes(titles[index])
          )
        }
      )
    }
  }
  await check(
    "post preview: referenced draft category stays private",
    async () => {
      await page.goto(fixtures.postPreviewUrl)
      const leaked = await page
        .locator("a[href]")
        .evaluateAll(
          (links, categoryPath) =>
            links.some(
              link =>
                new URL((link as HTMLAnchorElement).href).pathname.replace(
                  /\/+$/,
                  ""
                ) === categoryPath
            ),
          new URL(fixtures.categoryPreviewUrl).pathname.replace(/\/+$/, "")
        )
      assert(!leaked)
      if (titles[1])
        assert(!(await page.locator("article").innerText()).includes(titles[1]))
    }
  )
  await check(
    "category preview: draft reference post stays private",
    async () => {
      await page.goto(fixtures.categoryPreviewUrl)
      assert((await page.locator(categorySection).count()) === 1)
      const leaked = await page
        .locator(`${categorySection} a[href]`)
        .evaluateAll(
          (links, postPath) =>
            links.some(
              link =>
                new URL((link as HTMLAnchorElement).href).pathname.replace(
                  /\/+$/,
                  ""
                ) === postPath
            ),
          new URL(fixtures.postPreviewUrl).pathname.replace(/\/+$/, "")
        )
      assert(!leaked)
      assert(
        titles[0] &&
          !(await page.locator(categorySection).innerText()).includes(titles[0])
      )
      // The public published listing must not reveal either never-published fixture.
      await page.goto(origin)
      const publishedPaths = await page
        .locator("body a[href]")
        .evaluateAll(links =>
          links.map(link =>
            new URL((link as HTMLAnchorElement).href).pathname.replace(
              /\/+$/,
              ""
            )
          )
        )
      for (const url of urls) {
        assert(
          !publishedPaths.includes(new URL(url).pathname.replace(/\/+$/, ""))
        )
      }
    }
  )
}

const renderingPhase = async (
  page: Page,
  fixtures: FixtureConfig,
  origin: string,
  check: Check
) => {
  const sightings: Sighting[] = []
  const fallbackSources = new Set<string>()
  const imageRequests = new Set<string>()
  page.on("request", request => {
    if (request.resourceType() === "image") imageRequests.add(request.url())
  })
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport, height: 900 })
    await check(
      `${viewport}px: rendering fixture and loaded originals`,
      async () => {
        const response = await page.goto(
          new URL(fixtures.renderingPath, origin).href
        )
        assert(response?.status() === 200)
        // Bring lazy images into view and wait for decoding before measuring.
        const images = await page.locator("article img").all()
        assert(images.length > 0)
        assert((await page.locator("article figure").count()) > 0)
        for (const image of images) {
          await image.scrollIntoViewIfNeeded()
          await image.evaluate(async element => {
            await (element as HTMLImageElement).decode()
          })
        }
      }
    )
    await check(`${viewport}px: no horizontal overflow`, async () => {
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth
        )
      )
    })
    const rows = await page.locator("article figure").evaluateAll(figures =>
      figures.flatMap(figure => {
        const img = figure.querySelector("img")
        if (!img || img.title !== "issue197 image") return []
        const rect = img.getBoundingClientRect()
        const box = figure.getBoundingClientRect()
        const parent = figure.parentElement?.getBoundingClientRect()
        const style = getComputedStyle(figure)
        const link = img.closest("a")
        let node: Element | null = figure.parentElement
        let context = "unknown"
        while (node) {
          if (node.classList.contains("max-w-[75ch]")) {
            context = "PostText"
            break
          }
          if (
            node.classList.contains("min-w-full") &&
            node.classList.contains("justify-center")
          ) {
            context = "PostSplit"
            break
          }
          node = node.parentElement
        }
        return [
          {
            context,
            src: img.currentSrc || img.src,
            alt: img.getAttribute("alt"),
            caption: figure.querySelector("figcaption")?.textContent?.trim(),
            width: rect.width,
            height: rect.height,
            declaredWidth: img.width,
            declaredHeight: img.height,
            boxWidth: box.width,
            parentWidth: parent?.width ?? 0,
            centerError: parent
              ? Math.abs(box.left + box.right - (parent.left + parent.right)) /
                2
              : Infinity,
            cap: parseFloat(style.getPropertyValue("--cap")),
            float: style.cssFloat,
            alignment: ["left", "center", "right", "wide", "full"].find(value =>
              figure.classList.contains(`image--align-${value}`)
            ),
            href: link?.getAttribute("href"),
            target: link?.getAttribute("target"),
            rel: link?.rel ?? "",
          },
        ]
      })
    )
    for (const context of ["PostText", "PostSplit"]) {
      const group = rows.filter(row => row.context === context)
      await check(
        `${viewport}px ${context}: required Portable Text fixtures`,
        async () => {
          assert(group.length > 0)
          assert(group.some(row => row.alt === ""))
          assert(group.some(row => row.alt === "stored-alt-197"))
          assert(group.every(row => row.caption === "issue197 caption"))
          assert(group.some(row => !row.href && Boolean(row.caption)))
          assert(
            group.every(
              // eslint-disable-next-line eslint/no-script-url -- testing that href values don't start with javascript:
              row => !row.href?.trim().toLowerCase().startsWith("javascript:")
            )
          )
          const safe = group.find(row => row.href === "https://example.com/")
          assert(
            safe &&
              safe.target === "_blank" &&
              safe.rel.split(/\s+/).includes("noopener") &&
              safe.rel.split(/\s+/).includes("noreferrer")
          )
          assert(
            group.some(row => row.href === "#issue197-target" && !row.target)
          )
        }
      )
      for (const [width, height] of [
        [240, 160],
        [120, 80],
        [240, 120],
      ]) {
        await check(
          `${viewport}px ${context}: ${width}x${height} display geometry`,
          async () => {
            const row = group.find(
              value =>
                value.cap === width &&
                Math.abs(
                  value.declaredWidth / value.declaredHeight - width / height
                ) < 0.01
            )
            assert(
              row &&
                row.width > 0 &&
                Math.abs(row.height - (row.width * height) / width) <= 1
            )
            assert(row.boxWidth <= width + 1 && row.width <= width + 1)
          }
        )
      }
      for (const alignment of ["left", "center", "right", "wide", "full"]) {
        await check(
          `${viewport}px ${context}: ${alignment} alignment`,
          async () => {
            const aligned = group.filter(row => row.alignment === alignment)
            assert(aligned.length > 0)
            for (const row of aligned) {
              if (alignment === "left" || alignment === "right") {
                assert(row.float === (viewport <= 640 ? "none" : alignment))
                assert(
                  row.boxWidth <=
                    row.parentWidth * (viewport <= 640 ? 1 : 0.5) + 1
                )
              } else if (alignment === "center") assert(row.centerError <= 1)
              else {
                assert(
                  Math.abs(
                    row.boxWidth -
                      Math.min(row.parentWidth, row.cap || Infinity)
                  ) <= 1
                )
              }
              if (Number.isFinite(row.cap)) assert(row.boxWidth <= row.cap + 1)
            }
          }
        )
      }
    }
    for (const row of rows)
      if (row.alt === "stored-alt-197") fallbackSources.add(row.src)
    const images = await page.locator("img").evaluateAll(elements =>
      elements
        .map(img => ({
          src: img.currentSrc || img.src,
          width: img.getBoundingClientRect().width,
        }))
        .filter(img => Boolean(img.src) && img.width > 0)
    )
    for (const image of images)
      sightings.push({ ...image, viewport, page: page.url() })
    await check(
      `${viewport}px: Preview image DOM and requests use originals`,
      async () => {
        assert(images.length > 0)
        assert(
          [...images.map(image => image.src), ...imageRequests].every(
            src => !isTransformedImage(src, origin)
          )
        )
        assert(
          await page
            .locator("article img")
            .evaluateAll(
              elements =>
                elements.length > 0 && elements.every(img => !img.srcset)
            )
        )
      }
    )
  }
  return { sightings, fallbackSources }
}

const navigationPhase = async (page: Page, origin: string, check: Check) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto(origin)
  const button = page.locator("button#menu-button")
  await check(
    "mobile navigation: keyboard reaches button and skips closed links",
    async () => {
      assert((await button.getAttribute("aria-label")) === "Menu principal")
      assert((await button.getAttribute("aria-expanded")) === "false")
      let reached = false
      for (let count = 0; count < 50; count++) {
        await page.keyboard.press("Tab")
        assert(
          !(await page.evaluate(() =>
            Boolean(document.activeElement?.closest("#menu"))
          ))
        )
        if (
          await button.evaluate(element => document.activeElement === element)
        ) {
          reached = true
          break
        }
      }
      assert(reached)
      for (let count = 0; count < 20; count++) {
        await page.keyboard.press("Tab")
        assert(
          !(await page.evaluate(() =>
            Boolean(document.activeElement?.closest("#menu"))
          ))
        )
      }
      // Reach the button again using only keyboard, never programmatic focus.
      for (let count = 0; count < 50; count++) {
        if (
          await button.evaluate(element => document.activeElement === element)
        )
          break
        await page.keyboard.press("Tab")
      }
      assert(
        await button.evaluate(element => document.activeElement === element)
      )
    }
  )
  for (const key of ["Enter", "Space"]) {
    await check(
      `mobile navigation: ${key} opens; Escape restores focus`,
      async () => {
        await page.keyboard.press(key)
        assert((await button.getAttribute("aria-expanded")) === "true")
        await page.keyboard.press("Tab")
        assert(
          await page.evaluate(() =>
            Boolean(document.activeElement?.closest("#menu a"))
          )
        )
        assert(await page.locator("#menu a:focus").isVisible())
        await page.keyboard.press("Escape")
        assert((await button.getAttribute("aria-expanded")) === "false")
        assert(
          await button.evaluate(element => document.activeElement === element)
        )
      }
    )
  }
  await check("mobile navigation: link and outside click close", async () => {
    await button.press("Enter")
    // Suppress navigation, not the real bubbling click/disclosure handler.
    await page.locator("#menu").evaluate(menu =>
      menu.addEventListener("click", event => event.preventDefault(), {
        once: true,
      })
    )
    await page.locator("#menu a").first().click()
    assert((await button.getAttribute("aria-expanded")) === "false")
    await button.press("Space")
    // The home route has no main element. This gutter is outside its header,
    // menu, content links, and footer links; dispatch a real outside click.
    assert(
      await page.evaluate(
        () => !document.elementFromPoint(2, innerHeight - 2)?.closest("header")
      )
    )
    await page.mouse.click(2, 898)
    assert((await button.getAttribute("aria-expanded")) === "false")
  })
  await check(
    "desktop navigation: closed disclosure still exposes links",
    async () => {
      await page.setViewportSize({ width: 1024, height: 900 })
      for (const link of await page.locator("#menu a").all())
        assert(await link.isVisible())
      let reached = false
      for (let count = 0; count < 50; count++) {
        await page.keyboard.press("Tab")
        if (
          await page.evaluate(() =>
            Boolean(document.activeElement?.closest("#menu a"))
          )
        ) {
          reached = true
          break
        }
      }
      assert(reached)
    }
  )
}

const seoPhase = async (
  page: Page,
  context: BrowserContext,
  fixtures: FixtureConfig,
  origin: string,
  check: Check
) => {
  for (const path of [
    `${fixtures.renderingPath.replace(/\/$/, "")}?utm_source=issue197`,
    fixtures.renderingPath,
  ]) {
    await check("SEO: canonical origin and trailing slash", async () => {
      await page.goto(new URL(path, origin).href)
      assert(
        (await page.locator('link[rel="canonical"]').getAttribute("href")) ===
          CANONICAL + fixtures.renderingPath
      )
      const paths = await page
        .locator("a[href]")
        .evaluateAll(links =>
          links.map(link => new URL((link as HTMLAnchorElement).href).pathname)
        )
      assert(
        paths
          .filter(value => /^\/(?:posts|categorias)\//.test(value))
          .every(value => value.endsWith("/"))
      )
    })
  }
  await check(
    "SEO: CMS sitemap published URLs use canonical trailing slashes",
    async () => {
      let response = await context.request.get(`${origin}/sitemap-index.xml`, {
        maxRedirects: 0,
      })
      if (response.status() === 404) {
        response = await context.request.get(`${origin}/sitemap.xml`, {
          maxRedirects: 0,
        })
      }
      assert(response.status() === 200)
      const xml = await response.text()
      const locations = (text: string) =>
        [...text.matchAll(/<loc>\s*(?<url>[^<]+?)\s*<\/loc>/g)].map(match =>
          match.groups!["url"]!.replaceAll("&amp;", "&")
        )
      let urls = locations(xml)
      if (/<sitemapindex[\s>]/.test(xml)) {
        const childUrls: string[] = []
        for (const location of urls) {
          const url = new URL(location)
          assert([CANONICAL, origin].includes(url.origin))
          const child = await context.request.get(
            origin + url.pathname + url.search,
            { maxRedirects: 0 }
          )
          assert(child.status() === 200)
          childUrls.push(...locations(await child.text()))
        }
        urls = childUrls
      }
      assert(urls.length > 0)
      assert(
        urls.some(value => new URL(value).pathname === fixtures.renderingPath)
      )
      for (const value of urls) {
        const url = new URL(value)
        assert(url.origin === CANONICAL)
        if (/^\/(?:posts|categorias)\//.test(url.pathname))
          assert(url.pathname.endsWith("/"))
        for (const draft of [
          fixtures.postPreviewUrl,
          fixtures.categoryPreviewUrl,
        ]) {
          assert(
            url.pathname.replace(/\/+$/, "") !==
              new URL(draft).pathname.replace(/\/+$/, "")
          )
        }
      }
    }
  )
  await check(
    "SEO: category without override uses default social image or bucket fallback",
    async () => {
      const categoryResponse = await page.goto(fixtures.categoryPreviewUrl)
      assert(categoryResponse?.status() === 200)
      const image = await page
        .locator('meta[property="og:image"]')
        .getAttribute("content")
      assert(image)
      const url = new URL(image, origin)
      assert(!isTransformedImage(url.href, origin))
      const fallback = url.pathname.endsWith("/images/imagem-social.png")
      const response = await context.request.get(url.href, { maxRedirects: 0 })
      assert(response.status() === 200 || fallback)
      console.log(
        `Social image: ${fallback ? "bucket fallback" : "resolved site default"} observed on category without override.`
      )
    }
  )
}

const measureProtectedImage = async (
  url: string,
  context: BrowserContext
): Promise<Intrinsic> => {
  const response = await context.request.get(url, { maxRedirects: 0 })
  assert(response.status() === 200, "Original image unreadable.")
  const metadata = await sharp(await response.body()).metadata()
  if (metadata.format === "svg") return "vector"
  assert(
    metadata.width && metadata.height,
    "Original image dimensions unreadable."
  )
  return { width: metadata.width, height: metadata.height }
}

const auditPhase = async (
  context: BrowserContext,
  sightings: Sighting[],
  fallbackSources: Set<string>,
  check: Check
) => {
  const intrinsic = new Map<string, Intrinsic>()
  const originals = [
    ...new Set(sightings.map(row => originalUrl(row.src, row.page))),
  ]
  assert(originals.length > 0, "No image sightings available.")
  for (const [index, url] of originals.entries()) {
    await check(`image audit: original ${index + 1} readable`, async () => {
      intrinsic.set(url, await measureProtectedImage(url, context))
    })
    if (!intrinsic.has(url))
      console.log(`Image audit: original ${index + 1} unreadable`)
  }
  for (const src of fallbackSources) {
    await check(
      "image audit: stored-alt fixture retains 3600x2400 source metadata",
      async () => {
        const size = intrinsic.get(originalUrl(src, sightings[0].page))
        assert(
          size &&
            size !== "vector" &&
            size.width === 3600 &&
            size.height === 2400
        )
      }
    )
  }
  for (const finding of findings(sightings, intrinsic)) {
    if (finding.ratio >= 3) continue
    // Numbered sources avoid exposing signed image query strings or path tokens.
    const index = originals.indexOf(finding.original) + 1
    console.log(
      `Image audit flag: original ${index}, ${finding.ratio.toFixed(2)}x, ${finding.width}x${finding.height}, rendered ${Math.round(finding.rendered)}px at ${finding.viewport}px`
    )
  }
  console.log(
    `Image audit: ${originals.length} originals, ${intrinsic.size} readable; sub-3x flags are report-only.`
  )
}

const run = async (args: Args) => {
  // Validate all input before launching Chromium. Never emit raw parser errors,
  // file paths, fixture values, page exceptions, signed URLs, or storage state.
  const fixtures = validateFixtures(
    JSON.parse(await readFile(args.fixtures, "utf8"))
  )
  const origin = validateOrigin(args.url, fixtures)
  const state = JSON.parse(
    await readFile(args["storage-state"], "utf8")
  ) as unknown
  assert(typeof state === "object" && state !== null && !Array.isArray(state))
  assert(
    "cookies" in state &&
      Array.isArray(state.cookies) &&
      "origins" in state &&
      Array.isArray(state.origins)
  )
  const storageState = state as Exclude<
    BrowserContextOptions["storageState"],
    string | undefined
  >
  const failures: string[] = []
  const check: Check = async (label, action) => {
    try {
      await action()
    } catch {
      failures.push(label)
    }
  }
  const browser = await chromium.launch()
  try {
    const context = await browser.newContext({
      storageState,
      serviceWorkers: "block",
    })
    context.setDefaultTimeout(10_000)
    const page = await context.newPage()
    // Both phases block analytics; rendering checks must never send conversions.
    await blockGoogle(page)
    if (args.phase === "analytics")
      await analyticsPhase(page, fixtures, origin, check)
    else {
      await check("draft authorization scenarios execute", async () => {
        await previewPhase(page, fixtures, origin, check)
      })
      await check(
        "rendering scenarios and authenticated original audit execute",
        async () => {
          const { sightings, fallbackSources } = await renderingPhase(
            page,
            fixtures,
            origin,
            check
          )
          await auditPhase(context, sightings, fallbackSources, check)
        }
      )
      await check("navigation scenarios execute", async () => {
        await navigationPhase(page, origin, check)
      })
      await check("SEO scenarios execute", async () => {
        await seoPhase(page, context, fixtures, origin, check)
      })
    }
    await page.close()
    await context.close()
  } finally {
    await browser.close()
  }
  for (const failure of failures) console.error(`FAIL: ${failure}`)
  console.log(`${args.phase}: ${failures.length} failed assertions.`)
  return failures.length ? 1 : 0
}

if (import.meta.main) {
  try {
    process.exitCode = await run(await parseCliArgs(process.argv))
  } catch {
    console.error(
      "Browser assertions could not run; check arguments, external fixtures/state, and browser availability."
    )
    process.exitCode = 1
  }
}

export {
  validateFixtures,
  validateOrigin,
  corruptPreviewUrl,
  isTransformedImage,
  parseCliArgs,
  measureProtectedImage,
  type FixtureConfig,
  type Args,
}
