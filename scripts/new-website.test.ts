import { afterEach, describe, expect, test } from "bun:test"
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { execa } from "execa"
import { createWebsite, validateSlug } from "./new-website"

const REPO_ROOT = join(import.meta.dir, "..")
const SLUG = "acme-consulting.com.br"
const WORKER = "acme-consulting"
const SITE = join("websites", SLUG)

// Every root file the generator registers a website in, copied from this
// repository so the tests exercise the real shapes, not hand-written fixtures.
const REGISTRATION_FILES = [
  "release-please-config.json",
  ".release-please-manifest.json",
  ".github/workflows/deploy-manual.yml",
  ".github/workflows/pr-preview-cleanup.yml",
  ".github/workflows/release.yml",
  "README.md",
  "scripts/site-config.ts",
  "scripts/deploy.ts",
]

type Workflow = {
  on: { workflow_dispatch: { inputs: { target: { options: string[] } } } }
  jobs: Record<
    string,
    {
      strategy?: { matrix: { target: string[] } }
      steps?: { id?: string; run?: string }[]
    }
  >
}

const fixtures: string[] = []

const repoCopy = async () => {
  const root = await mkdtemp(join(tmpdir(), "websites-website-"))
  fixtures.push(root)
  const sites = await readdir(join(REPO_ROOT, "websites"))

  await Promise.all([
    ...REGISTRATION_FILES.map(path =>
      cp(join(REPO_ROOT, path), join(root, path))
    ),
    ...sites.map(site =>
      cp(
        join(REPO_ROOT, "websites", site, "wrangler.json"),
        join(root, "websites", site, "wrangler.json")
      )
    ),
  ])

  return root
}

const read = (root: string, path: string) => readFile(join(root, path), "utf8")

const readJson = async <T = unknown>(root: string, path: string) =>
  JSON.parse(await read(root, path)) as T

const readYaml = async <T = unknown>(root: string, path: string) =>
  Bun.YAML.parse(await read(root, path)) as T

const snapshot = async (root: string) =>
  Promise.all(REGISTRATION_FILES.map(path => read(root, path)))

const arrayLiteral = (source: string, name: string) =>
  [
    ...(source
      .match(new RegExp(`const ${name} = \\[(?<items>[^\\]]*)\\]`))
      ?.groups?.["items"]?.matchAll(/"(?<item>[^"]+)"/g) ?? []),
  ].map(match => match.groups?.["item"])

// Runs release.yml's real "Compute released websites" step with only `slug`
// reported as released by release-please.
const releasedWebsites = async (root: string, slug: string) => {
  const workflow = await readYaml<Workflow>(
    root,
    ".github/workflows/release.yml"
  )
  const step = Object.values(workflow.jobs)
    .flatMap(job => job.steps ?? [])
    .find(candidate => candidate.id === "websites")
  const script = (step?.run ?? "").replaceAll(
    /\$\{\{ steps\.release\.outputs\['websites\/(?<site>[^']+)--release_created'\] \}\}/g,
    (_match, site: string) => (site === slug ? "true" : "false")
  )
  const output = join(root, "github-output")
  await writeFile(output, "")
  await execa("bash", ["-c", script], { env: { GITHUB_OUTPUT: output } })
  const released = (await readFile(output, "utf8")).match(
    /^released=(?<json>.*)$/m
  )
  return JSON.parse(released?.groups?.["json"] ?? "null") as string[]
}

const generatedFiles = async (root: string) => {
  const entries = await readdir(join(root, SITE), {
    recursive: true,
    withFileTypes: true,
  })
  return Promise.all(
    entries
      .filter(entry => entry.isFile())
      .map(entry => readFile(join(entry.parentPath, entry.name), "utf8"))
  )
}

afterEach(async () => {
  await Promise.all(
    fixtures.splice(0).map(path => rm(path, { recursive: true }))
  )
})

describe("validateSlug", () => {
  test("accepts repository-compatible website names", () => {
    expect(() => validateSlug("acme-consulting")).not.toThrow()
    expect(() => validateSlug("acme-consulting.com.br")).not.toThrow()
  })

  test("rejects unsafe and malformed names", () => {
    expect(() => validateSlug("Acme")).toThrow("lowercase")
    expect(() => validateSlug("acme--consulting")).toThrow("slug")
    expect(() => validateSlug("acme/consulting")).toThrow("slug")
  })
})

describe("createWebsite", () => {
  test("emits a site configured per Stage at request time", async () => {
    const root = await repoCopy()

    await createWebsite(root, { slug: SLUG })

    const stageVars = {
      IMAGES_BASE_URL: "",
      PUBLIC_GOOGLE_ANALYTICS_ID: "",
      PUBLIC_GOOGLE_ADS_CONVERSION_ID: "",
      PUBLIC_GOOGLE_ADS_CONVERSION_LABEL: "",
      ENABLE_PARTYTOWN: "false",
    }
    expect(
      await readJson<Record<string, unknown>>(root, `${SITE}/config.json`)
    ).toEqual({
      siteId: SLUG,
      canonicalHost: `https://${SLUG}`,
      vars: { preview: stageVars, staging: stageVars, production: stageVars },
      secretKeys: [],
    })
    expect(
      await readJson<Record<string, unknown>>(root, `${SITE}/wrangler.json`)
    ).toMatchObject({
      name: WORKER,
    })

    const { dependencies } = await readJson<{
      dependencies: Record<string, string>
    }>(root, `${SITE}/package.json`)
    expect(dependencies).toMatchObject({
      "@vandal-websites/robots-sitemap": "workspace:*",
      "@vandal-websites/sun-ui": "workspace:*",
    })
    expect(dependencies).not.toHaveProperty("@astrojs/sitemap")
    expect(dependencies).not.toHaveProperty("valibot")

    const moon = await readYaml<{
      tasks: Record<string, { inputs?: string[] }>
    }>(root, `${SITE}/moon.yml`)
    expect(moon.tasks).not.toHaveProperty("deploy")
    expect(
      moon.tasks["build"]?.inputs?.filter(input => input.startsWith("$"))
    ).toEqual([])

    const astroConfig = await read(root, `${SITE}/astro.config.js`)
    expect(astroConfig).toContain(
      `const CANONICAL_SITE_URL = "https://${SLUG}"`
    )
    expect(astroConfig).toContain('imageService: "passthrough"')
    expect(astroConfig).toContain(
      "robotsSitemap({ canonicalHost: CANONICAL_SITE_URL })"
    )
    expect(astroConfig).toMatch(/^ {4}partytown\(\{$/m)

    const layout = await read(root, `${SITE}/src/layouts/Layout.astro`)
    expect(layout).toContain('import { getSecret } from "astro:env/server"')
    expect(layout).toContain("gtag={runtimeGtag(getSecret)}")

    for (const content of await generatedFiles(root)) {
      for (const forbidden of [
        "ENV_VARS_",
        "loadEnv",
        "imageServiceBaseUrl",
        "@astrojs/sitemap",
        "wrangler deploy",
        `${WORKER}-staging`,
        "Astro.locals.runtime",
      ])
        expect(content).not.toContain(forbidden)
      expect(content).not.toMatch(new RegExp(`${WORKER}-pr-(?!<N>)`))
      expect(content).not.toMatch(/\bSITE_URL\b/)
    }
  })

  test("registers the site everywhere deploys, releases, and docs enumerate websites", async () => {
    const root = await repoCopy()

    await createWebsite(root, { slug: SLUG })

    expect(
      arrayLiteral(await read(root, "scripts/site-config.ts"), "SITE_IDS")
    ).toContain(SLUG)
    expect(await read(root, "scripts/deploy.ts")).toContain(
      `"${WORKER}": "https://${SLUG}",`
    )

    const cleanup = await readYaml<Workflow>(
      root,
      ".github/workflows/pr-preview-cleanup.yml"
    )
    expect(Object.values(cleanup.jobs)[0]?.strategy?.matrix.target).toContain(
      SLUG
    )

    const manual = await readYaml<Workflow>(
      root,
      ".github/workflows/deploy-manual.yml"
    )
    expect(manual.on.workflow_dispatch.inputs.target.options).toContain(SLUG)

    expect(await releasedWebsites(root, SLUG)).toEqual([SLUG])
    expect(await releasedWebsites(root, "brunabraz")).toEqual(["brunabraz"])

    expect(
      await readJson<{ packages: Record<string, unknown> }>(
        root,
        "release-please-config.json"
      )
    ).toHaveProperty(["packages", `websites/${SLUG}`])
    expect(
      await readJson<Record<string, string>>(
        root,
        ".release-please-manifest.json"
      )
    ).toHaveProperty([`websites/${SLUG}`], "0.1.0")
    expect(await read(root, "README.md")).toContain(
      `- **\`websites/${SLUG}\`**`
    )
  })

  test("keeps scaffold markup free of hydration directives", async () => {
    const root = await repoCopy()

    await createWebsite(root, { slug: SLUG })

    expect(await read(root, `${SITE}/src/pages/index.astro`)).not.toContain(
      "client:"
    )
  })

  test("escapes title, description, and font before rendering generated code", async () => {
    const root = await repoCopy()

    await createWebsite(root, {
      slug: SLUG,
      title: 'Acme "Brasil"',
      description: 'A "fast" consultant',
      font: 'Noto "Sans"',
    })

    expect(await read(root, `${SITE}/astro.config.js`)).toContain(
      'name: "Noto \\"Sans\\""'
    )
    expect(await read(root, `${SITE}/moon.yml`)).toContain(
      'description: "A \\"fast\\" consultant"'
    )
    expect(await read(root, `${SITE}/src/pages/index.astro`)).toContain(
      'const title = "Acme \\"Brasil\\""'
    )
  })

  test.each([
    [
      "scripts/site-config.ts",
      (content: string) =>
        content.replace(
          "const SITE_IDS = [",
          `const SITE_IDS = [\n  "${SLUG}",`
        ),
    ],
    [
      ".github/workflows/pr-preview-cleanup.yml",
      (content: string) =>
        content.replace(" brunabraz,", ` ${SLUG}, brunabraz,`),
    ],
    [
      ".github/workflows/deploy-manual.yml",
      (content: string) =>
        content.replace("images,", `images,\n            ${SLUG},`),
    ],
    [
      ".release-please-manifest.json",
      (content: string) =>
        content.replace('".": ', `"websites/${SLUG}": "4.5.6",\n  ".": `),
    ],
  ])(
    "rejects a slug already registered in %s and writes nothing",
    async (path, register) => {
      const root = await repoCopy()
      await writeFile(join(root, path), register(await read(root, path)))
      const before = await snapshot(root)

      await expect(createWebsite(root, { slug: SLUG })).rejects.toThrow(
        `Website websites/${SLUG} is already registered`
      )
      expect(await snapshot(root)).toEqual(before)
      await expect(read(root, `${SITE}/package.json`)).rejects.toThrow()
    }
  )

  test("rejects a slug whose Worker name another website already uses", async () => {
    const root = await repoCopy()

    await expect(
      createWebsite(root, { slug: "brunabraz.com.br" })
    ).rejects.toThrow('Worker "brunabraz"')
  })

  test("does not mutate a repository when the site already exists", async () => {
    const root = await repoCopy()
    await createWebsite(root, { slug: SLUG })
    const before = await snapshot(root)

    await expect(createWebsite(root, { slug: SLUG })).rejects.toThrow(
      "already exists"
    )
    expect(await snapshot(root)).toEqual(before)
  })

  test("reports the full write set without writing in dry-run mode", async () => {
    const root = await repoCopy()
    const before = await snapshot(root)

    const result = await createWebsite(root, { slug: SLUG, dryRun: true })

    expect(result).toEqual(
      expect.arrayContaining([`${SITE}/config.json`, ...REGISTRATION_FILES])
    )
    expect(await snapshot(root)).toEqual(before)
    await expect(read(root, `${SITE}/package.json`)).rejects.toThrow()
  })
})
