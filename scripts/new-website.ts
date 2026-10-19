import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { dirname, join, relative } from "node:path"
import { consola } from "consola"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"

type WebsiteOptions = {
  slug: string
  title?: string
  description?: string
  font?: string
  dryRun?: boolean
}

type ResolvedOptions = Required<Omit<WebsiteOptions, "dryRun">> & {
  dryRun: boolean
}

const SLUG = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/

const validateSlug = (slug: string) => {
  if (slug !== slug.toLowerCase())
    throw new Error("Website slug must be lowercase.")
  if (!SLUG.test(slug)) {
    throw new Error(
      "Website slug must match lowercase letters/numbers separated by one dot or hyphen."
    )
  }
}

// Cloudflare Worker names allow only lowercase letters, digits, and hyphens, so
// a domain-style slug deploys as its first label (as clinicamauricioaraujo.com.br does).
const workerNameForSlug = (slug: string): string => slug.split(".")[0]!

const fontVariable = (font: string) =>
  `--font-${font.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`

const resolveOptions = (options: WebsiteOptions): ResolvedOptions => {
  validateSlug(options.slug)
  const title = options.title ?? options.slug.replaceAll(/[.-]/g, " ")
  return {
    slug: options.slug,
    title,
    description: options.description ?? `${title} website.`,
    font: options.font ?? "Inter",
    dryRun: options.dryRun ?? false,
  }
}

const sortObject = <T>(entries: Record<string, T>): Record<string, T> =>
  Object.fromEntries(
    Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))
  )

const renderPackageJson = (options: ResolvedOptions) => {
  const dependencies = sortObject({
    "@astrojs/check": "catalog:astro",
    "@astrojs/cloudflare": "catalog:astro",
    "@astrojs/partytown": "catalog:astro",
    "@vandal-websites/robots-sitemap": "workspace:*",
    "@astrojs/ts-plugin": "catalog:astro",
    "@vandal-websites/sun-ui": "workspace:*",
    "@tailwindcss/typography": "catalog:tailwind",
    "@tailwindcss/vite": "catalog:tailwind",
    astro: "catalog:astro",
    "astro-iconset": "catalog:astro",
    tailwindcss: "catalog:tailwind",
    typescript: "catalog:typescript",
  })
  const devDependencies = sortObject({
    "@astrojs/svelte": "catalog:svelte",
    svelte: "catalog:svelte",
    vite: "catalog:vite",
    wrangler: "catalog:tools",
  })

  return `${JSON.stringify(
    {
      name: `@websites/${options.slug}`,
      version: "0.1.0",
      private: true,
      type: "module",
      dependencies,
      devDependencies,
    },
    null,
    2
  )}\n`
}

const renderConfig = (options: ResolvedOptions) => {
  const stageVars = {
    IMAGES_BASE_URL: "",
    PUBLIC_GOOGLE_ANALYTICS_ID: "",
    PUBLIC_GOOGLE_ADS_CONVERSION_ID: "",
    PUBLIC_GOOGLE_ADS_CONVERSION_LABEL: "",
    ENABLE_PARTYTOWN: "false",
  }

  return `${JSON.stringify(
    {
      siteId: options.slug,
      canonicalHost: `https://${options.slug}`,
      vars: { preview: stageVars, staging: stageVars, production: stageVars },
      secretKeys: [],
    },
    null,
    2
  )}\n`
}

const renderMoon = (options: ResolvedOptions) => `layer: "application"
language: "astro"
tags:
  - "cloudflare"

project:
  title: ${JSON.stringify(options.slug)}
  description: ${JSON.stringify(options.description)}
tasks:
  astro:
    command: astro

  dev:
    command: astro dev
    preset: server
    dependsOn:
      - typegen
      - ^:build

  check:
    command: astro check
    inputs:
      - "@globs(typescript)"
      - "@globs(sources)"
      - "./astro.config.js"
      - "/packages/sun-ui/src/**/*"
    dependsOn:
      - ^:build

  build:
    command: astro build
    inputs:
      - "@globs(sources)"
      - "@globs(public)"
      - "@globs(typescript)"
      - "/packages/sun-ui/src/**/*"
      - "./astro.config.js"
    outputs:
      - dist
    dependsOn:
      - check

  preview:
    command: astro preview
    preset: server

  preview-wrangler:
    command: wrangler pages dev ./dist
    preset: server
    dependsOn:
      - build

  test:
    command: "bun test --isolate --pass-with-no-tests"
    inputs:
      - "@globs(tests)"
      - "@globs(typescript)"
      - "@globs(sources)"
      - "bunfig.toml"
      - "/bunfig.toml"
      - "/packages/sun-ui/src/**/*"

  typecheck:
    inputs:
      - "@globs(typescript)"
      - "@globs(sources)"
      - "@globs(tests)"
      - "/packages/sun-ui/src/**/*"
    dependsOn:
      - check

workspace:
  inheritedTasks:
    # Client sites are not in coverage.config.ts; their tests still run in \`test\`.
    exclude:
      - coverage
`

const renderAstroConfig = (
  options: ResolvedOptions
) => `import { defineConfig, fontProviders } from "astro/config"
import sunUIAstroIntegration from "@vandal-websites/sun-ui/astro-integration"
import { robotsSitemap } from "@vandal-websites/robots-sitemap"
import partytown from "@astrojs/partytown"
import cloudflare from "@astrojs/cloudflare"
import tailwindcss from "@tailwindcss/vite"

const CANONICAL_SITE_URL = "https://${options.slug}"

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    sessionKVBindingName: "SESSION",
    imageService: "passthrough",
    prerenderEnvironment: "node",
  }),
  fonts: [
    {
      name: ${JSON.stringify(options.font)},
      provider: fontProviders.google(),
      cssVariable: "${fontVariable(options.font)}",
      weights: ["400", "500", "600", "700"],
    },
  ],
  integrations: [
    sunUIAstroIntegration({
      svelte: true,
    }),
    robotsSitemap({ canonicalHost: CANONICAL_SITE_URL }),
    partytown({
      config: {
        forward: [
          ["dataLayer.push", { preserveBehavior: true }],
          ["gtag", { preserveBehavior: true }],
        ],
      },
    }),
  ],
  trailingSlash: "ignore",
  site: CANONICAL_SITE_URL,
  vite: {
    plugins: [tailwindcss()],
  },
})
`

const renderTsConfig = (options: ResolvedOptions) =>
  `${JSON.stringify(
    {
      extends: ["astro/tsconfigs/strict", "../../tsconfig.bundler.json"],
      compilerOptions: {
        paths: {
          "@components/*": ["./src/components/*"],
          "@assets/*": ["./src/assets/*"],
          "@styles/*": ["./src/styles/*"],
          "@layouts/*": ["./src/layouts/*"],
          "@pages/*": ["./src/pages/*"],
          "@utils": ["./src/utils"],
          "@utils/*": ["./src/utils/*"],
          "@/*": ["./src/*"],
        },
        outDir: `../../.moon/cache/types/websites/${options.slug}`,
        plugins: [{ name: "@astrojs/ts-plugin" }],
      },
      include: [".astro/types.d.ts", "**/*"],
      exclude: ["dist", "astro.config.js"],
      references: [
        { path: "../../packages/robots-sitemap" },
        { path: "../../packages/sun-ui" },
      ],
    },
    null,
    2
  )}\n`

const renderWrangler = (options: ResolvedOptions) =>
  `${JSON.stringify(
    {
      $schema: "./node_modules/wrangler/config-schema.json",
      name: workerNameForSlug(options.slug),
      compatibility_flags: ["nodejs_compat"],
      compatibility_date: "2025-01-01",
      assets: { directory: "./dist" },
    },
    null,
    2
  )}\n`

const renderGlobalCss = (options: ResolvedOptions) => `@import "tailwindcss";
@plugin "@tailwindcss/typography";
@source "../../../../packages/sun-ui/src";

@theme {
  --font-sans: var(${fontVariable(options.font)}), ui-sans-serif, system-ui, sans-serif;
}

@utility container {
  width: 100%;
  margin-inline: auto;
  padding-inline: --spacing(4);

  @variant lg {
    max-width: 1024px;
    padding-inline: --spacing(8);
  }

  @variant xl {
    max-width: 1280px;
  }
}
`

const renderLayout = (options: ResolvedOptions) => `---
import "@/styles/global.css"
import { Font } from "astro:assets"
import { getSecret } from "astro:env/server"
import { SunLayout, runtimeGtag } from "@vandal-websites/sun-ui/astro"

interface Props {
  title: string
  description?: string
  image?: string
}

const { title, description, image = "/og-image.png" } = Astro.props
---

<SunLayout
  title={title}
  description={description}
  image={new URL(image, Astro.url).toString()}
  url={Astro.url}
  gtag={runtimeGtag(getSecret)}
>
  <Font cssVariable="${fontVariable(options.font)}" preload slot="close-head" />
  <slot />
</SunLayout>
`

const renderIndex = (options: ResolvedOptions) => `---
import Layout from "@layouts/Layout.astro"

const title = ${JSON.stringify(options.title)}
const description = ${JSON.stringify(options.description)}
---

<Layout title={title} description={description}>
  <main class="container min-h-screen justify-center py-16">
    <h1 class="text-4xl font-semibold">{title}</h1>
  </main>
</Layout>
`

const renderReadme = (options: ResolvedOptions) => `# ${options.title} Website

Astro SSR website deployed to Cloudflare Workers.

## Stack

- Astro SSR on Cloudflare Workers + Assets
- Tailwind CSS v4 via \`@tailwindcss/vite\`
- \`@vandal-websites/sun-ui\` for shared layout, image, icon, and button primitives
- \`astro-iconset\` with local SVG icons in \`src/icons/\`
- Svelte 5 integration for isolated interactions that require hydration

## Structure

\`\`\`text
websites/${options.slug}/
├── public/favicon.svg
├── src/
│   ├── components/
│   ├── icons/
│   ├── layouts/Layout.astro
│   ├── pages/index.astro
│   └── styles/global.css
├── astro.config.js
├── config.json
├── moon.yml
├── tsconfig.json
└── wrangler.json
\`\`\`

## Local development

Run from repository root:

\`\`\`sh
moon run ${options.slug}:dev
moon run ${options.slug}:check
moon run ${options.slug}:typecheck
moon run ${options.slug}:build
\`\`\`

## Configuration

\`config.json\` holds the canonical host and the non-secret variables for each
Stage (\`preview\`, \`staging\`, \`production\`). Deploys attach the Stage's
values to the Worker, and the site reads them at request time through
\`getSecret\`, so one build serves every Stage.

| Variable | Purpose |
| --- | --- |
| \`IMAGES_BASE_URL\` | Optional \`apps/images\` transform-service base URL. |
| \`PUBLIC_GOOGLE_ANALYTICS_ID\` | Optional Google Analytics measurement ID. |
| \`PUBLIC_GOOGLE_ADS_CONVERSION_ID\` | Optional Google Ads conversion ID. |
| \`PUBLIC_GOOGLE_ADS_CONVERSION_LABEL\` | Optional Google Ads conversion label. |
| \`ENABLE_PARTYTOWN\` | Loads Gtag through Partytown only when \`true\`. |

List secret names in \`secretKeys\` and set their values with Wrangler, never in
\`config.json\`. The \`CANONICAL_SITE_URL\` constant in \`astro.config.js\`
matches \`canonicalHost\`. \`@vandal-websites/robots-sitemap\` serves \`/robots.txt\`
(crawlable only on that host) and \`/sitemap-index.xml\`.

## Client-side policy

Start with semantic HTML and CSS. Use \`details\`, \`dialog\`, form controls, \`:target\`, and CSS states before client JavaScript. A short inline script is allowed when native HTML cannot express a required state transition. Add a Svelte island only when a documented interaction needs hydrated, stateful behavior.

## Assets

Replace the scaffold favicon before release. Put brand images in \`public/\` or use Astro Image with \`IMAGES_BASE_URL\`; do not embed unoptimized bitmap data in components.

## Deployment

Every Stage is the one Cloudflare Worker \`${workerNameForSlug(options.slug)}\` (\`wrangler.json\`):

| Stage | Deployed as | KV namespace |
| --- | --- | --- |
| Pull request | Workers Preview \`pr-<N>\` of \`${workerNameForSlug(options.slug)}\` | \`${workerNameForSlug(options.slug)}-pr-<N>\` |
| Staging | Version of \`${workerNameForSlug(options.slug)}-staging\` at 100% | \`${workerNameForSlug(options.slug)}-staging\` |
| Production | The same build re-uploaded with production config, at 100% traffic | \`${workerNameForSlug(options.slug)}\` |

CI runs \`scripts/deploy.ts\`: pull requests create and delete the Preview, a push
to \`main\` builds once and uploads the staging Version, and a release promotes
that build to production without rebuilding.
`

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#18181b"/><path fill="#fff" d="M32 14 48 48H16z"/></svg>\n`

const exists = async (path: string) => {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

const readRoot = async (root: string, path: string) => ({
  path: join(root, path),
  content: await readFile(join(root, path), "utf8"),
})

const alreadyRegistered = (slug: string) =>
  new Error(
    `Website websites/${slug} is already registered without a site directory. Resolve the stale registration first.`
  )

const sortedWebsites = (websites: string[], slug: string) => {
  if (websites.includes(slug)) throw alreadyRegistered(slug)
  return [...websites, slug].toSorted((a, b) => a.localeCompare(b))
}

const sortWebsiteEntries = <T>(
  entries: Record<string, T>
): Record<string, T> => {
  const nonWebsiteEntries = Object.entries(entries).filter(
    ([key]) => !key.startsWith("websites/")
  )
  const websiteEntries = Object.entries(entries)
    .filter(([key]) => key.startsWith("websites/"))
    .sort(([a], [b]) => a.localeCompare(b))
  return Object.fromEntries([...nonWebsiteEntries, ...websiteEntries])
}

const updateReleaseConfig = (content: string, slug: string) => {
  const config = JSON.parse(content) as { packages: Record<string, unknown> }
  config.packages[`websites/${slug}`] = {
    "changelog-path": "CHANGELOG.md",
    "release-type": "node",
    "include-component-in-tag": true,
  }
  config.packages = sortWebsiteEntries(config.packages)
  return `${JSON.stringify(config, null, 2)}\n`
}

const updateManifest = (content: string, slug: string) => {
  const manifest = JSON.parse(content) as Record<string, string>
  manifest[`websites/${slug}`] = "0.1.0"
  return `${JSON.stringify(sortWebsiteEntries(manifest), null, 2)}\n`
}

const registeredWebsiteSlugs = (content: string) => {
  const { packages } = JSON.parse(content) as {
    packages: Record<string, unknown>
  }
  return Object.keys(packages).flatMap(path =>
    path.startsWith("websites/") ? [path.slice("websites/".length)] : []
  )
}

const ensureUniqueWorkerName = async (root: string, slug: string) => {
  const worker = workerNameForSlug(slug)
  const sites = await readdir(join(root, "websites"))
  const workers = await Promise.all(
    sites.map(async site => {
      const path = join(root, "websites", site, "wrangler.json")
      if (!(await exists(path))) return { site, name: undefined }
      const { name } = JSON.parse(await readFile(path, "utf8")) as {
        name: string
      }
      return { site, name }
    })
  )
  const conflict = workers.find(entry => entry.name === worker)
  if (conflict) {
    throw new Error(
      `Website slug "${slug}" would deploy as Worker "${worker}", which websites/${conflict.site} already uses. Choose a distinct first dot segment.`
    )
  }
}

const updateSiteIds = (content: string, slug: string) => {
  const match = content.match(/const SITE_IDS = \[(?<ids>[^\]]*)\]/)
  if (!match?.groups) throw new Error("site-config.ts has no SITE_IDS list.")
  const ids = [...match.groups["ids"]!.matchAll(/"(?<id>[^"]+)"/g)].map(
    entry => entry.groups!["id"]!
  )
  const list = sortedWebsites(ids, slug)
    .map(id => `  ${JSON.stringify(id)},`)
    .join("\n")
  return content.replace(match[0], `const SITE_IDS = [\n${list}\n]`)
}

const updateCustomDomains = (content: string, slug: string) => {
  const worker = workerNameForSlug(slug)
  const match = content.match(
    /const CUSTOM_DOMAINS: Record<string, string> = \{\n(?<entries>[\s\S]*?)\}/
  )
  if (!match?.groups) throw new Error("deploy.ts has no CUSTOM_DOMAINS record.")
  const key = /^[a-z_$][a-z0-9_$]*$/.test(worker)
    ? worker
    : JSON.stringify(worker)
  if (new RegExp(`^\\s*"?${worker}"?:`, "m").test(match.groups["entries"]!))
    throw alreadyRegistered(slug)
  return content.replace(
    match[0],
    `${match[0].slice(0, -1)}  ${key}: ${JSON.stringify(`https://${slug}`)},\n}`
  )
}

const replaceTargetList = (
  content: string,
  pattern: RegExp,
  slug: string,
  label: string
) => {
  const match = content.match(pattern)
  if (!match?.groups || match.index === undefined)
    throw new Error(`${label} has no target list.`)
  const targets = match.groups["targets"]!.split(",")
    .map(value => value.trim())
    .filter(Boolean)
  const fixed = targets.filter(target => target === "images")
  const websites = sortedWebsites(
    targets.filter(target => target !== "images"),
    slug
  )
  const [matched] = match
  return `${content.slice(0, match.index)}${match.groups["prefix"]}[${[...fixed, ...websites].join(", ")}]${content.slice(match.index + matched.length)}`
}

const updateManualTargets = (content: string, slug: string) =>
  replaceTargetList(
    content,
    /(?<prefix>target:[\s\S]*?options:\s*)\[(?<targets>[^\]]*)\]/,
    slug,
    "Manual deploy workflow"
  )

const updateCleanupMatrix = (content: string, slug: string) =>
  replaceTargetList(
    content,
    /(?<prefix>target:\s*)\[(?<targets>[^\]]*)\]/,
    slug,
    "Preview cleanup workflow"
  )

const updateReleaseWorkflow = (content: string, slug: string) => {
  if (content.includes(`websites/${slug}--release_created`))
    throw alreadyRegistered(slug)
  const match = content.match(/^(?<indentation>\s*)'(?<entries>\[.*\])'\)$/m)
  if (!match?.groups)
    throw new Error("Release workflow has no released websites list.")
  const alias = `site_${slug.replaceAll(/[^a-z0-9]/g, "_")}`
  const { indentation, entries } = match.groups
  const releaseArg = `${indentation}--argjson ${alias} "$([ "\${{ steps.release.outputs['websites/${slug}--release_created'] }}" = "true" ] && echo true || echo false)" \\`
  const releasedEntries = `${entries!.slice(0, -1)}, if $${alias} then "${slug}" else empty end]`
  return content.replace(
    match[0],
    `${releaseArg}\n${indentation}'${releasedEntries}')`
  )
}

const updateReadme = (content: string, slug: string) => {
  const heading = "### Websites"
  const start = content.indexOf(heading)
  if (start === -1) throw new Error("README has no Websites section.")
  const nextHeading = content.indexOf("\n### ", start + heading.length)
  const end = nextHeading === -1 ? content.length : nextHeading
  const section = content.slice(start, end)
  const entries = [
    ...section.matchAll(
      /^- \*\*`websites\/(?<siteSlug>[^`]+)`\*\*.*(?:\n  .*)*/gm
    ),
  ].map(match => ({ slug: match.groups?.siteSlug ?? "", text: match[0] }))
  if (entries.some(entry => entry.slug === slug)) throw alreadyRegistered(slug)
  entries.push({
    slug,
    text: `- **\`websites/${slug}\`** - Astro site, deployed to Cloudflare Workers.`,
  })
  entries.sort((a, b) => a.slug.localeCompare(b.slug))
  const replacement = `${heading}\n\n${entries.map(entry => entry.text).join("\n")}\n`
  return `${content.slice(0, start)}${replacement}${content.slice(end)}`
}

const createWebsite = async (root: string, rawOptions: WebsiteOptions) => {
  const options = resolveOptions(rawOptions)
  const siteRoot = join(root, "websites", options.slug)
  if (await exists(siteRoot)) {
    throw new Error(
      `Website directory already exists: websites/${options.slug}`
    )
  }

  const releaseConfig = await readRoot(root, "release-please-config.json")
  const manifest = await readRoot(root, ".release-please-manifest.json")
  const manifestEntries = JSON.parse(manifest.content) as Record<string, string>
  if (
    registeredWebsiteSlugs(releaseConfig.content).includes(options.slug) ||
    Object.hasOwn(manifestEntries, `websites/${options.slug}`)
  )
    throw alreadyRegistered(options.slug)
  await ensureUniqueWorkerName(root, options.slug)
  const [
    manualWorkflow,
    cleanupWorkflow,
    releaseWorkflow,
    readme,
    siteConfig,
    deployScript,
  ] = await Promise.all(
    [
      ".github/workflows/deploy-manual.yml",
      ".github/workflows/pr-preview-cleanup.yml",
      ".github/workflows/release.yml",
      "README.md",
      "scripts/site-config.ts",
      "scripts/deploy.ts",
    ].map(path => readRoot(root, path))
  )

  // Every registration is computed before anything is written, so a slug
  // already present in any of them leaves the repository untouched.
  const writes: [string, string][] = [
    [join(siteRoot, "package.json"), renderPackageJson(options)],
    [join(siteRoot, "config.json"), renderConfig(options)],
    [join(siteRoot, "moon.yml"), renderMoon(options)],
    [join(siteRoot, "astro.config.js"), renderAstroConfig(options)],
    [join(siteRoot, "tsconfig.json"), renderTsConfig(options)],
    [join(siteRoot, "wrangler.json"), renderWrangler(options)],
    [join(siteRoot, "src/styles/global.css"), renderGlobalCss(options)],
    [join(siteRoot, "src/layouts/Layout.astro"), renderLayout(options)],
    [join(siteRoot, "src/pages/index.astro"), renderIndex(options)],
    [join(siteRoot, "public/favicon.svg"), favicon],
    [join(siteRoot, "README.md"), renderReadme(options)],
    [
      releaseConfig.path,
      updateReleaseConfig(releaseConfig.content, options.slug),
    ],
    [manifest.path, updateManifest(manifest.content, options.slug)],
    [
      manualWorkflow!.path,
      updateManualTargets(manualWorkflow!.content, options.slug),
    ],
    [
      cleanupWorkflow!.path,
      updateCleanupMatrix(cleanupWorkflow!.content, options.slug),
    ],
    [
      releaseWorkflow!.path,
      updateReleaseWorkflow(releaseWorkflow!.content, options.slug),
    ],
    [readme!.path, updateReadme(readme!.content, options.slug)],
    [siteConfig!.path, updateSiteIds(siteConfig!.content, options.slug)],
    [
      deployScript!.path,
      updateCustomDomains(deployScript!.content, options.slug),
    ],
  ]

  const paths = writes.map(([path]) => relative(root, path))
  if (options.dryRun) return paths
  await Promise.all(
    writes.map(async ([path, content]) => {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, content)
    })
  )
  return paths
}

if (import.meta.main) {
  const args = await yargs(hideBin(process.argv))
    .scriptName("website:new")
    .command("$0 <slug>", "Create a website workspace", builder =>
      builder.positional("slug", {
        describe: "Lowercase worker and website slug",
        type: "string",
        demandOption: true,
      })
    )
    .option("title", {
      type: "string",
      describe: "HTML and starter-page title",
    })
    .option("description", {
      type: "string",
      describe: "Starter metadata description",
    })
    .option("font", {
      type: "string",
      default: "Inter",
      describe: "Google Font family",
    })
    .option("dry-run", {
      type: "boolean",
      default: false,
      describe: "List writes without changing files",
    })
    .strict()
    .parse()

  try {
    const root = join(import.meta.dir, "..")
    const writes = await createWebsite(root, {
      slug: `${args.slug}`,
      title: args.title,
      description: args.description,
      font: args.font,
      dryRun: args.dryRun,
    })
    for (const path of writes)
      consola.info(`${args.dryRun ? "Would write" : "Wrote"} ${path}`)
    consola.success(
      args.dryRun ? "Dry run complete." : `Created websites/${args.slug}.`
    )
  } catch (error) {
    consola.error((error as Error).message)
    process.exitCode = 1
  }
}

export { createWebsite, validateSlug }
export type { WebsiteOptions }
