import { access, mkdir, readFile, writeFile } from "node:fs/promises"
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

const envVarNameForSlug = (slug: string): string =>
  `ENV_VARS_${slug.toUpperCase().split(/[.-]/)[0]}`

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
    "@astrojs/sitemap": "catalog:astro",
    "@astrojs/ts-plugin": "catalog:astro",
    "@vandal-websites/sun-ui": "workspace:*",
    "@tailwindcss/typography": "catalog:tailwind",
    "@tailwindcss/vite": "catalog:tailwind",
    astro: "catalog:astro",
    "astro-iconset": "catalog:astro",
    tailwindcss: "catalog:tailwind",
    typescript: "catalog:typescript",
    valibot: "catalog:utils",
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
      - "$SITE_URL"
      - "$IMAGES_BASE_URL"
      - "$ENABLE_PARTYTOWN"
      - "$PUBLIC_GOOGLE_ANALYTICS_ID"
      - "$PUBLIC_GOOGLE_ADS_CONVERSION_ID"
      - "$PUBLIC_GOOGLE_ADS_CONVERSION_LABEL"
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

  deploy:
    command: bunx wrangler deploy
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
      - "/happydom.ts"
      - "/packages/sun-ui/src/**/*"

  typecheck:
    inputs:
      - "@globs(typescript)"
      - "@globs(sources)"
      - "@globs(tests)"
      - "/packages/sun-ui/src/**/*"
    dependsOn:
      - check
`

const renderAstroConfig = (
  options: ResolvedOptions
) => `import { defineConfig, envField, fontProviders } from "astro/config"
import { loadEnv } from "vite"
import sunUIAstroIntegration from "@vandal-websites/sun-ui/astro-integration"
import sitemap from "@astrojs/sitemap"
import partytown from "@astrojs/partytown"
import cloudflare from "@astrojs/cloudflare"
import tailwindcss from "@tailwindcss/vite"
// oxlint-disable-next-line import/no-namespace
import * as v from "valibot"

const env = loadEnv(import.meta.env.MODE, process.cwd(), "")
if (env.IMAGES_BASE_URL === "") delete env.IMAGES_BASE_URL

const {
  SITE_URL,
  IMAGES_BASE_URL,
  ENABLE_PARTYTOWN: isPartytownEnabled,
} = v.parse(
  v.object({
    SITE_URL: v.optional(v.pipe(v.string(), v.url("SITE_URL must be a URL."))),
    IMAGES_BASE_URL: v.optional(
      v.pipe(v.string(), v.url("IMAGES_BASE_URL must be a URL."))
    ),
    ENABLE_PARTYTOWN: v.pipe(
      v.optional(v.string(), "false"),
      v.transform(value => value === "true")
    ),
  }),
  env
)

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    sessionKVBindingName: "SESSION",
    imageService: IMAGES_BASE_URL ? "custom" : "passthrough",
    prerenderEnvironment: "node",
  }),
  env: {
    schema: {
      SITE_URL: envField.string({ context: "client", access: "public", optional: true }),
      IMAGES_BASE_URL: envField.string({ context: "server", access: "secret", optional: true }),
      ENABLE_PARTYTOWN: envField.boolean({
        context: "server",
        access: "secret",
        optional: true,
        default: false,
      }),
      PUBLIC_GOOGLE_ANALYTICS_ID: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      PUBLIC_GOOGLE_ADS_CONVERSION_ID: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      PUBLIC_GOOGLE_ADS_CONVERSION_LABEL: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
    },
    validateSecrets: true,
  },
  fonts: [
    {
      name: ${JSON.stringify(options.font)},
      provider: fontProviders.google(),
      cssVariable: "--font-${options.font.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}",
      weights: ["400", "500", "600", "700"],
    },
  ],
  integrations: [
    sunUIAstroIntegration({
      imageServiceBaseUrl: IMAGES_BASE_URL,
      svelte: true,
    }),
    sitemap(),
    isPartytownEnabled &&
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
  site: SITE_URL,
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
      references: [{ path: "../../packages/sun-ui" }],
    },
    null,
    2
  )}\n`

const renderWrangler = (options: ResolvedOptions) =>
  `${JSON.stringify(
    {
      $schema: "./node_modules/wrangler/config-schema.json",
      name: options.slug,
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
  --font-sans: var(--font-${options.font.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}), ui-sans-serif, system-ui, sans-serif;
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
import { SunLayout } from "@vandal-websites/sun-ui/astro"

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
>
  <Font cssVariable="--font-${options.font.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}" preload slot="close-head" />
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

## Environment variables

| Variable | Purpose |
| --- | --- |
| \`SITE_URL\` | Absolute canonical URL and sitemap base. |
| \`IMAGES_BASE_URL\` | Optional \`apps/images\` transform-service base URL. |
| \`PUBLIC_GOOGLE_ANALYTICS_ID\` | Optional Google Analytics measurement ID. |
| \`PUBLIC_GOOGLE_ADS_CONVERSION_ID\` | Optional Google Ads conversion ID. |
| \`PUBLIC_GOOGLE_ADS_CONVERSION_LABEL\` | Optional Google Ads conversion label. |
| \`ENABLE_PARTYTOWN\` | Enables Partytown only when \`true\`. |

CI passes these through \`${envVarNameForSlug(options.slug)}\`.

## Client-side policy

Start with semantic HTML and CSS. Use \`details\`, \`dialog\`, form controls, \`:target\`, and CSS states before client JavaScript. A short inline script is allowed when native HTML cannot express a required state transition. Add a Svelte island only when a documented interaction needs hydrated, stateful behavior.

## Assets

Replace the scaffold favicon before release. Put brand images in \`public/\` or use Astro Image with \`IMAGES_BASE_URL\`; do not embed unoptimized bitmap data in components.

## Deployment

\`wrangler.json\` defines the stable worker name \`${options.slug}\`. The root deploy command provisions and binds \`SESSION\` KV:

\`\`\`sh
bun scripts/deploy.ts ${options.slug} --env preview --pr 123 --no-dry-run
bun scripts/deploy.ts ${options.slug} --env staging --no-dry-run
bun scripts/deploy.ts ${options.slug} --env production --no-dry-run
\`\`\`

Worker names are \`${options.slug}-pr-<N>\` for previews, \`${options.slug}-staging\` for staging, and \`${options.slug}\` for production. Add a production custom domain in Cloudflare first, then add its URL to \`CUSTOM_DOMAINS\` in \`scripts/deploy.ts\`.
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

const readExisting = async (root: string, paths: string[]) => {
  const candidates = await Promise.all(
    paths.map(async path => {
      const absolutePath = join(root, path)
      return { absolutePath, exists: await exists(absolutePath) }
    })
  )
  const candidate = candidates.find(entry => entry.exists)
  if (candidate) {
    return {
      path: candidate.absolutePath,
      content: await readFile(candidate.absolutePath, "utf8"),
    }
  }
  throw new Error(`Expected one of: ${paths.join(", ")}`)
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

const ensureUniqueEnvironmentVariable = (
  slug: string,
  releaseConfig: string
) => {
  const variable = envVarNameForSlug(slug)
  const conflictingSlug = registeredWebsiteSlugs(releaseConfig).find(
    registeredSlug =>
      registeredSlug !== slug && envVarNameForSlug(registeredSlug) === variable
  )
  if (conflictingSlug) {
    throw new Error(
      `Website slug "${slug}" conflicts with "${conflictingSlug}": both use ${variable}. Choose a distinct first dot or hyphen segment.`
    )
  }
}

const insertEnvVar = (content: string, variable: string) => {
  if (content.includes(`${variable}:`)) return content
  const lines = content.split("\n")
  const entries = lines.flatMap((line, index) => {
    const match = line.match(
      /^(?<indentation>\s*)(?<variable>ENV_VARS_[A-Z0-9_]+):/
    )
    if (!match?.groups) return []
    return [
      {
        index,
        indentation: match.groups.indentation,
        variable: match.groups.variable,
      },
    ]
  })
  if (entries.length === 0)
    throw new Error("Workflow has no ENV_VARS_* entries.")
  const [{ indentation }] = entries
  const insertion = entries.find(
    entry => entry.variable.localeCompare(variable) > 0
  )
  const index = insertion?.index ?? entries.at(-1)!.index + 1
  lines.splice(index, 0, `${indentation}${variable}: \${{ vars.${variable} }}`)
  return lines.join("\n")
}

const updateManualTargets = (content: string, slug: string) => {
  const match = content.match(/options:\s*\[(?<targets>[\s\S]*?)\]/)
  if (!match || match.index === undefined || !match.groups)
    throw new Error("Manual deploy workflow has no target options.")
  const targets = match.groups.targets
    .split(",")
    .map(value => value.trim())
    .filter(Boolean)
  if (!targets.includes(slug)) targets.push(slug)
  const fixed = targets.filter(
    target => target === "images" || target === "web"
  )
  const websites = targets
    .filter(target => target !== "images" && target !== "web")
    .sort((a, b) => a.localeCompare(b))
  const [matchedOptions] = match
  return `${content.slice(0, match.index)}options: [${[...fixed, ...websites].join(", ")}]${content.slice(match.index + matchedOptions.length)}`
}

const updateReleaseWorkflow = (content: string, slug: string) => {
  if (content.includes(`websites/${slug}--release_created`)) return content
  const match = content.match(/^(?<indentation>\s*)'(?<entries>\[.*\])'\)$/m)
  if (!match?.groups)
    throw new Error("Release workflow has no released websites list.")
  const alias = `site_${slug.replaceAll(/[^a-z0-9]/g, "_")}`
  const { indentation, entries } = match.groups
  const releaseArg = `${indentation}--argjson ${alias} "$([ "\${{ steps.release.outputs['websites/${slug}--release_created'] }}" = "true" ] && echo true || echo false)" \\`
  const releasedEntries = `${entries.slice(0, -1)}, if $${alias} then "${slug}" else empty end]`
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
  if (!entries.some(entry => entry.slug === slug)) {
    entries.push({
      slug,
      text: `- **\`websites/${slug}\`** - Astro site, deployed to Cloudflare Workers.`,
    })
  }
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

  const releaseConfig = await readExisting(root, ["release-please-config.json"])
  const manifest = await readExisting(root, [".release-please-manifest.json"])
  const registrationKey = `websites/${options.slug}`
  const manifestEntries = JSON.parse(manifest.content) as Record<string, string>
  if (
    registeredWebsiteSlugs(releaseConfig.content).includes(options.slug) ||
    Object.hasOwn(manifestEntries, registrationKey)
  ) {
    throw new Error(
      `Website ${registrationKey} is already registered without a site directory. Resolve the stale release registration first.`
    )
  }
  const ciWorkflow = await readExisting(root, [
    ".github/workflows/main.yml",
    ".github-workflow-main.yml",
  ])
  const manualWorkflow = await readExisting(root, [
    ".github/workflows/deploy-manual.yml",
    ".github-workflow-manual.yml",
  ])
  const readme = await readExisting(root, ["README.md"])
  const releaseWorkflow = await readExisting(root, [
    ".github/workflows/release.yml",
    ".github-workflow-release.yml",
  ])
  ensureUniqueEnvironmentVariable(options.slug, releaseConfig.content)
  const envVariable = envVarNameForSlug(options.slug)

  const writes: [string, string][] = [
    [join(siteRoot, "package.json"), renderPackageJson(options)],
    [join(siteRoot, "moon.yml"), renderMoon(options)],
    [join(siteRoot, "astro.config.js"), renderAstroConfig(options)],
    [join(siteRoot, "tsconfig.json"), renderTsConfig(options)],
    [join(siteRoot, "wrangler.json"), renderWrangler(options)],
    [
      join(siteRoot, ".env.example"),
      "SITE_URL=\nIMAGES_BASE_URL=\nPUBLIC_GOOGLE_ANALYTICS_ID=\nPUBLIC_GOOGLE_ADS_CONVERSION_ID=\nPUBLIC_GOOGLE_ADS_CONVERSION_LABEL=\nENABLE_PARTYTOWN=false\n",
    ],
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
    [ciWorkflow.path, insertEnvVar(ciWorkflow.content, envVariable)],
    [
      manualWorkflow.path,
      updateManualTargets(
        insertEnvVar(manualWorkflow.content, envVariable),
        options.slug
      ),
    ],
    [
      releaseWorkflow.path,
      insertEnvVar(
        updateReleaseWorkflow(releaseWorkflow.content, options.slug),
        envVariable
      ),
    ],
    [readme.path, updateReadme(readme.content, options.slug)],
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
      slug: args.slug,
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

export { createWebsite, envVarNameForSlug, validateSlug }
export type { WebsiteOptions }
