import { afterEach, describe, expect, test } from "bun:test"
import {
  cp,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
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
  await execa("bash", ["-e", "-o", "pipefail", "-c", script], {
    env: { GITHUB_OUTPUT: output },
  })
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

    await expect(read(root, `${SITE}/config.json`)).rejects.toThrow()
    expect(
      await readJson<Record<string, unknown>>(root, `${SITE}/wrangler.json`)
    ).toMatchObject({
      name: WORKER,
    })

    const { name, license, dependencies } = await readJson<{
      name: string
      license: string
      dependencies: Record<string, string>
    }>(root, `${SITE}/package.json`)
    expect(name).toBe(`@vandal-websites/${SLUG}`)
    expect(license).toBe("SEE LICENSE IN CONTENT-LICENSE.md")
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
    for (const task of ["build", "check"])
      expect(moon.tasks[task]?.inputs).toContain("$S3_PUBLIC_URL")

    const astroConfig = await read(root, `${SITE}/astro.config.js`)
    expect(astroConfig).toContain(
      `const CANONICAL_SITE_URL = "https://${SLUG}"`
    )
    expect(astroConfig).toContain('imageService: "passthrough"')
    expect(astroConfig).toContain(
      "robotsSitemap({ canonicalHost: CANONICAL_SITE_URL })"
    )
    expect(astroConfig).not.toContain("partytown")

    const layout = await read(root, `${SITE}/src/layouts/Layout.astro`)
    expect(layout).not.toContain("gtag=")

    for (const content of await generatedFiles(root)) {
      for (const forbidden of [
        "ENV_VARS_",
        "loadEnv",
        "imageServiceBaseUrl",
        "@astrojs/sitemap",
        "wrangler deploy",
        "Astro.locals.runtime",
      ])
        expect(content).not.toContain(forbidden)
      expect(content).not.toMatch(new RegExp(`${WORKER}-pr-(?!<N>)`))
      expect(content).not.toMatch(/\bSITE_URL\b/)
    }
  })

  test.each([undefined, "", "https://files.vandal.services/preview-bucket"])(
    "configures the generated public bucket with S3_PUBLIC_URL=%s",
    async publicUrl => {
      const root = await repoCopy()
      await createWebsite(root, { slug: SLUG })
      await symlink(join(REPO_ROOT, "node_modules"), join(root, "node_modules"))

      const { stdout } = await execa(
        process.execPath,
        [
          "--eval",
          `import config from ${JSON.stringify(join(root, SITE, "astro.config.js"))}
console.log(JSON.stringify({ base: process.env.S3_PUBLIC_URL, field: config.env?.schema?.S3_PUBLIC_URL }))`,
        ],
        { env: { S3_PUBLIC_URL: publicUrl } }
      )
      const expectedBase = publicUrl || `https://files.vandal.services/${SLUG}`
      expect(JSON.parse(stdout)).toEqual({
        base: expectedBase,
        field: {
          type: "string",
          context: "server",
          access: "public",
          default: expectedBase,
        },
      })
    }
  )

  test("uses the typed bucket default in generated layout and asset instructions", async () => {
    const root = await repoCopy()
    await createWebsite(root, { slug: SLUG })

    const layout = await read(root, `${SITE}/src/layouts/Layout.astro`)
    const readme = await read(root, `${SITE}/README.md`)
    for (const content of [layout, readme]) {
      expect(content).toMatch(
        /import\s*\{[^}]*\bS3_PUBLIC_URL\b[^}]*\}\s*from\s*["']astro:env\/server["']/
      )
    }
    expect(layout).toMatch(
      /image\s*=\s*assetUrl\(\s*getSecret\s*,\s*["']og-image\.png["']\s*,\s*S3_PUBLIC_URL\s*\)/
    )
    expect(readme).toMatch(
      /assetUrl\(\s*getSecret\s*,\s*path\s*,\s*S3_PUBLIC_URL\s*\)/
    )
    expect(readme).not.toMatch(/assetUrl\(\s*getSecret\s*,\s*path\s*\)/)
  })

  test("registers the site everywhere deploys, releases, and docs enumerate websites", async () => {
    const root = await repoCopy()

    await createWebsite(root, { slug: SLUG })

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
    ).toHaveProperty(["packages", `websites/${SLUG}`], {
      "changelog-path": "CHANGELOG.md",
      "release-type": "node",
      component: SLUG,
      "include-component-in-tag": true,
    })
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
      expect.arrayContaining([`${SITE}/package.json`, ...REGISTRATION_FILES])
    )
    expect(await snapshot(root)).toEqual(before)
    await expect(read(root, `${SITE}/package.json`)).rejects.toThrow()
  })
})
