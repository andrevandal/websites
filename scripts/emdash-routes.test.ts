import { expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { dirname, join } from "node:path"

test("every EmDash site owns its robots and sitemap routes", async () => {
  const robots = "src/pages/robots.txt.ts"
  const sitemaps = [
    "src/pages/sitemap.xml.ts",
    "src/pages/sitemap-index.xml.ts",
  ]
  let emdashSiteCount = 0

  for await (const packagePath of new Bun.Glob("websites/*/package.json").scan({
    cwd: process.cwd(),
  })) {
    const manifest = (await Bun.file(packagePath).json()) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    if (
      !(
        "emdash" in (manifest.dependencies ?? {}) ||
        "emdash" in (manifest.devDependencies ?? {})
      )
    )
      continue

    emdashSiteCount += 1
    const dir = dirname(packagePath)
    expect(existsSync(join(dir, robots))).toBeTrue()
    expect(sitemaps.some(route => existsSync(join(dir, route)))).toBeTrue()
  }

  expect(emdashSiteCount).toBeGreaterThan(0)
})
