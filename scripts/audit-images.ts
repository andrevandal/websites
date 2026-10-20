// Checks that the source images of any page are large enough for the widest
// size they render at. Not part of CI; run it by hand against a dev server or
// a deployed URL when a page gets new images or layout:
//
//   bun scripts/audit-images.ts <url...> [--viewports 390 768 1280] [--factor 3]
//
// The image service serves 1x, 1.5x, 2x, 2.5x and 3x from one source and never
// upscales, so a bucket original should be at least `factor` (default 3) times
// the widest CSS width it renders at. For each viewport the page is loaded in
// Chromium and every `<img>` is measured; the original behind an
// image-service or Astro `/_image` URL is fetched and its intrinsic width read.

import { consola } from "consola"
import { chromium } from "playwright"
import sharp from "sharp"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"

const DEFAULT_VIEWPORTS = [390, 640, 1024, 1280, 1440]
const DEFAULT_FACTOR = 3
const VIEWPORT_HEIGHT = 900

type Sighting = { src: string; width: number; viewport: number; page: string }
type Intrinsic = { width: number; height: number } | "vector"
type Finding = {
  original: string
  width: number
  height: number
  rendered: number
  viewport: number
  page: string
  ratio: number
}

// The image behind an Astro `/_image?href=` URL or an image-service URL
// (`<base>/<modifiers>/<source>`, source encoded or raw); anything else is
// already the original.
const originalUrl = (src: string, pageUrl: string): string => {
  const url = new URL(src, pageUrl)
  const href = url.searchParams.get("href")
  if (url.pathname === "/_image" && href) return new URL(href, url).toString()

  const embedded = decodeURIComponent(url.pathname + url.search).match(
    /\/(?<target>https?:\/\/.+)$/
  )
  return embedded?.groups?.["target"] ?? url.toString()
}

// For every original, the widest rendering seen across pages and viewports,
// compared with its intrinsic width. Vector and unreadable originals are left
// out: they have no intrinsic raster size to compare.
const findings = (
  sightings: Sighting[],
  intrinsic: Map<string, Intrinsic>
): Finding[] => {
  const widest = new Map<string, Sighting>()
  for (const sighting of sightings) {
    const original = originalUrl(sighting.src, sighting.page)
    const seen = widest.get(original)
    if (!seen || sighting.width > seen.width) widest.set(original, sighting)
  }

  const result: Finding[] = []
  for (const [original, sighting] of widest) {
    const size = intrinsic.get(original)
    if (!size || size === "vector") continue
    result.push({
      original,
      ...size,
      rendered: sighting.width,
      viewport: sighting.viewport,
      page: sighting.page,
      ratio: size.width / sighting.width,
    })
  }
  return result.sort((a, b) => a.ratio - b.ratio)
}

const describe = (finding: Finding): string =>
  `${finding.ratio.toFixed(2)}x  ${finding.width}x${finding.height} for ${Math.round(finding.rendered)}px @${finding.viewport}vw  ${finding.original}  (${new URL(finding.page).pathname})`

const measure = async (url: string): Promise<Intrinsic> => {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(`${response.status}`)
  const metadata = await sharp(
    new Uint8Array(await response.arrayBuffer())
  ).metadata()
  if (metadata.format === "svg") return "vector"
  if (!metadata.width || !metadata.height) throw new Error("no dimensions")
  return { width: metadata.width, height: metadata.height }
}

const CONCURRENCY = 6
const IMAGE_WAIT_MS = 3_000

const collect = async (
  urls: string[],
  viewports: number[],
  executablePath?: string
): Promise<Sighting[]> => {
  const browser = await chromium.launch({ executablePath })
  const sightings: Sighting[] = []
  const jobs = urls.flatMap(page =>
    viewports.map(viewport => ({ page, viewport }))
  )

  const worker = async () => {
    for (let job = jobs.pop(); job; job = jobs.pop()) {
      const { page, viewport } = job
      // oxlint-disable-next-line eslint/no-await-in-loop -- browser context setup must be sequential
      const context = await browser.newContext({
        viewport: { width: viewport, height: VIEWPORT_HEIGHT },
      })
      // oxlint-disable-next-line eslint/no-await-in-loop -- new page must await context creation
      const tab = await context.newPage()
      // not "networkidle": analytics and streams keep real pages from settling;
      // the evaluate below waits for the images itself, briefly: a broken or
      // slow image service must not stall the audit, the layout box is what counts
      // oxlint-disable-next-line eslint/no-await-in-loop -- page load must complete before evaluation
      await tab.goto(page, { waitUntil: "load", timeout: 60_000 })
      // oxlint-disable-next-line eslint/no-await-in-loop -- image load evaluation must complete per page
      const images = await tab.evaluate(async wait => {
        for (const img of document.images) img.loading = "eager"
        await Promise.all(
          [...document.images].map(
            img =>
              img.complete ||
              (() => {
                const { promise, resolve } = Promise.withResolvers<void>()
                img.addEventListener("load", () => resolve(), { once: true })
                img.addEventListener("error", () => resolve(), { once: true })
                setTimeout(resolve, wait)
                return promise
              })()
          )
        )
        return [...document.images]
          .map(img => ({
            src: img.currentSrc || img.src,
            width: img.getBoundingClientRect().width,
          }))
          .filter(img => img.width > 0 && !img.src.startsWith("data:"))
      }, IMAGE_WAIT_MS)
      for (const image of images) sightings.push({ ...image, viewport, page })
      consola.info(`${page} @${viewport}: ${images.length} images`)
      // oxlint-disable-next-line eslint/no-await-in-loop -- context cleanup must complete before next job
      await context.close()
    }
  }

  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
  } finally {
    await browser.close()
  }
  return sightings
}

const parseArgs = (argv: string[]) =>
  yargs(hideBin(argv))
    .scriptName("audit-images")
    .usage("Usage: $0 <url...> [options]")
    .command("$0 <urls..>", "Audit the source size of every image on a page")
    .positional("urls", {
      describe: "Page URLs to load",
      type: "string",
      array: true,
    })
    .option("viewports", {
      alias: "v",
      type: "number",
      array: true,
      default: DEFAULT_VIEWPORTS,
      describe: "Viewport widths in CSS px",
    })
    .option("factor", {
      alias: "f",
      type: "number",
      default: DEFAULT_FACTOR,
      describe: "Recommended source width / widest rendered width",
    })
    .option("chrome", {
      type: "string",
      describe:
        "Chromium executable (default: CHROME_PATH, else Playwright's own; install it with `bunx playwright install chromium`)",
    })
    .option("strict", {
      type: "boolean",
      default: false,
      describe: "Exit 1 when any source is below the factor",
    })
    .example(
      "$0 http://localhost:4321/ http://localhost:4321/posts/x/ -v 390 1280",
      "Two pages at two widths"
    )
    .help()
    .parse()

type Args = {
  urls?: string[]
  viewports: number[]
  factor: number
  chrome?: string
  strict: boolean
}

const run = async (args: Args) => {
  const urls = (args.urls ?? []).map(String)
  const sightings = await collect(
    urls,
    args.viewports.map(Number),
    args.chrome ?? process.env.CHROME_PATH
  )

  const intrinsic = new Map<string, Intrinsic>()
  const unreadable: string[] = []
  const originals = [
    ...new Set(sightings.map(({ src, page }) => originalUrl(src, page))),
  ]
  consola.info(`measuring ${originals.length} originals`)
  // one at a time: concurrent sharp metadata reads stalled the process
  for (const original of originals) {
    try {
      // oxlint-disable-next-line no-await-in-loop
      intrinsic.set(original, await measure(original))
    } catch (error) {
      unreadable.push(`${original}: ${(error as Error).message}`)
    }
  }

  const all = findings(sightings, intrinsic)
  const upscaled = all.filter(finding => finding.ratio < 1)
  const short = all.filter(
    finding => finding.ratio >= 1 && finding.ratio < args.factor
  )

  console.log(
    `${all.length} raster images, ${urls.length} page(s), viewports ${args.viewports.join(", ")}`
  )
  console.log(`\nnarrower than rendered (upscaled): ${upscaled.length}`)
  for (const finding of upscaled) console.log(`  ${describe(finding)}`)
  console.log(`\nbelow ${args.factor}x of rendered: ${short.length}`)
  for (const finding of short) console.log(`  ${describe(finding)}`)
  console.log(
    `\n${args.factor}x or more: ${all.length - upscaled.length - short.length}`
  )
  for (const line of unreadable) console.log(`unreadable: ${line}`)

  return unreadable.length > 0 ||
    (args.strict && upscaled.length + short.length > 0)
    ? 1
    : 0
}

if (import.meta.main) {
  try {
    process.exit(await run(await parseArgs(process.argv)))
  } catch (error) {
    consola.error((error as Error).message)
    process.exit(1)
  }
}

export { findings, originalUrl }
export type { Finding, Intrinsic, Sighting }
