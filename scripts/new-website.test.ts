import { afterEach, describe, expect, test } from "bun:test"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createWebsite, envVarNameForSlug, validateSlug } from "./new-website"

const fixtures: string[] = []

const fixtureRepo = async () => {
  const root = await mkdtemp(join(tmpdir(), "websites-website-"))
  fixtures.push(root)

  await Promise.all([
    writeFile(join(root, "package.json"), '{"name":"websites"}\n'),
    writeFile(
      join(root, "release-please-config.json"),
      `${JSON.stringify(
        {
          packages: {
            ".": {
              "changelog-path": "CHANGELOG.md",
              "release-type": "node",
              "include-component-in-tag": true,
            },
            "websites/brunabraz": {
              "changelog-path": "CHANGELOG.md",
              "release-type": "node",
              "include-component-in-tag": true,
            },
          },
        },
        null,
        2
      )}\n`
    ),
    writeFile(
      join(root, ".release-please-manifest.json"),
      `${JSON.stringify(
        { ".": "1.2.0", "websites/brunabraz": "1.2.0" },
        null,
        2
      )}\n`
    ),
    writeFile(
      join(root, ".github-workflow-main.yml"),
      [
        "env:",
        `  ENV_VARS_BRUNABRAZ: \${{ vars.ENV_VARS_BRUNABRAZ }}`,
        `  ENV_VARS_VANDALLABS: \${{ vars.ENV_VARS_VANDALLABS }}`,
        "",
      ].join("\n")
    ),
    writeFile(
      join(root, ".github-workflow-manual.yml"),
      [
        "options: [images, web, brunabraz, vandallabs]",
        "env:",
        `  ENV_VARS_BRUNABRAZ: \${{ vars.ENV_VARS_BRUNABRAZ }}`,
        `  ENV_VARS_VANDALLABS: \${{ vars.ENV_VARS_VANDALLABS }}`,
        "",
      ].join("\n")
    ),
    writeFile(
      join(root, ".github-workflow-release.yml"),
      [
        "jobs:",
        "  release:",
        "    steps:",
        "      - name: Compute released websites",
        "        id: websites",
        "        shell: bash",
        "        run: |",
        "          json=$(jq -nc \\",
        `            --argjson br "$([ "\${{ steps.release.outputs['websites/brunabraz--release_created'] }}" = "true" ] && echo true || echo false)" \\`,
        `            '[if $br then "brunabraz" else empty end]')`,
        '          echo "released=$json" >> "$GITHUB_OUTPUT"',
        "  deploy-websites-production:",
        "    env:",
        `      ENV_VARS_BRUNABRAZ: \${{ vars.ENV_VARS_BRUNABRAZ }}`,
        "",
      ].join("\n")
    ),
    writeFile(
      join(root, "README.md"),
      [
        "# websites",
        "",
        "### Websites",
        "",
        "- **`websites/brunabraz`** - Astro site, deployed to Cloudflare Workers.",
        "- **`websites/vandallabs`** - Astro site, deployed to Cloudflare Workers.",
        "",
        "### Packages",
        "",
      ].join("\n")
    ),
  ])

  return root
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

describe("envVarNameForSlug", () => {
  test("matches build-env target convention", () => {
    expect(envVarNameForSlug("acme-consulting.com.br")).toBe("ENV_VARS_ACME")
  })
})

describe("createWebsite", () => {
  test("creates a CSS-first Astro Cloudflare site and all registrations", async () => {
    const root = await fixtureRepo()

    await createWebsite(root, { slug: "acme-consulting" })

    const packageJson = await readFile(
      join(root, "websites/acme-consulting/package.json"),
      "utf8"
    )
    expect(packageJson).toContain('"@vandal-websites/sun-ui": "workspace:*"')
    expect(packageJson).toContain('"@astrojs/svelte": "catalog:svelte"')
    expect(packageJson).toContain('"svelte": "catalog:svelte"')
    expect(
      await readFile(
        join(root, "websites/acme-consulting/astro.config.js"),
        "utf8"
      )
    ).toContain("svelte: true")
    expect(
      await readFile(
        join(root, "websites/acme-consulting/astro.config.js"),
        "utf8"
      )
    ).toContain('output: "server"')
    expect(
      await readFile(join(root, "websites/acme-consulting/moon.yml"), "utf8")
    ).toContain('  - "cloudflare"')
    expect(
      await readFile(
        join(root, "websites/acme-consulting/src/styles/global.css"),
        "utf8"
      )
    ).toContain('@source "../../../../packages/sun-ui/src";')

    const releaseConfig = await readFile(
      join(root, "release-please-config.json"),
      "utf8"
    )
    const manifest = await readFile(
      join(root, ".release-please-manifest.json"),
      "utf8"
    )
    const ciWorkflow = await readFile(
      join(root, ".github-workflow-main.yml"),
      "utf8"
    )
    const manualWorkflow = await readFile(
      join(root, ".github-workflow-manual.yml"),
      "utf8"
    )
    const releaseWorkflow = await readFile(
      join(root, ".github-workflow-release.yml"),
      "utf8"
    )
    const readme = await readFile(join(root, "README.md"), "utf8")

    expect(releaseConfig).toContain('"websites/acme-consulting"')
    expect(manifest).toContain('"websites/acme-consulting": "0.1.0"')
    expect(ciWorkflow).toContain("ENV_VARS_ACME")
    expect(manualWorkflow).toContain("ENV_VARS_ACME")
    expect(manualWorkflow).toContain("acme-consulting")
    expect(packageJson).toContain(
      '"@tailwindcss/typography": "catalog:tailwind"'
    )
    expect(releaseWorkflow).toContain(
      "websites/acme-consulting--release_created"
    )
    expect(releaseWorkflow).toContain("if $site_acme_consulting then")
    expect(releaseWorkflow).toContain("ENV_VARS_ACME")
    expect(readme).toContain("`websites/acme-consulting`")
  })

  test("keeps scaffold markup free of hydration directives", async () => {
    const root = await fixtureRepo()

    await createWebsite(root, { slug: "acme-consulting" })

    expect(
      await readFile(
        join(root, "websites/acme-consulting/src/pages/index.astro"),
        "utf8"
      )
    ).not.toContain("client:")
  })

  test("escapes title, description, and font before rendering generated code", async () => {
    const root = await fixtureRepo()

    await createWebsite(root, {
      slug: "acme-consulting",
      title: 'Acme "Brasil"',
      description: 'A "fast" consultant',
      font: 'Noto "Sans"',
    })

    const astroConfig = await readFile(
      join(root, "websites/acme-consulting/astro.config.js"),
      "utf8"
    )
    const index = await readFile(
      join(root, "websites/acme-consulting/src/pages/index.astro"),
      "utf8"
    )
    const moon = await readFile(
      join(root, "websites/acme-consulting/moon.yml"),
      "utf8"
    )

    expect(astroConfig).toContain('name: "Noto \\"Sans\\""')
    expect(moon).toContain('description: "A \\"fast\\" consultant"')
    expect(index).toContain('const title = "Acme \\"Brasil\\""')
    expect(index).toContain("<Layout title={title} description={description}>")
    expect(index).toContain(">{title}</h1>")
  })

  test("rejects a slug that would share another website's environment variable", async () => {
    const root = await fixtureRepo()

    await expect(
      createWebsite(root, { slug: "brunabraz-consulting" })
    ).rejects.toThrow("ENV_VARS_BRUNABRAZ")
  })

  test("rejects an existing release configuration registration without a site directory", async () => {
    const root = await fixtureRepo()
    await writeFile(
      join(root, "release-please-config.json"),
      `${JSON.stringify(
        {
          packages: {
            "websites/acme-consulting": {
              "changelog-path": "CHANGELOG.md",
              "release-type": "node",
              "include-component-in-tag": true,
            },
          },
        },
        null,
        2
      )}\n`
    )

    await expect(
      createWebsite(root, { slug: "acme-consulting" })
    ).rejects.toThrow("already registered")
  })

  test("rejects an existing release manifest registration without changing its version", async () => {
    const root = await fixtureRepo()
    const manifestPath = join(root, ".release-please-manifest.json")
    await writeFile(
      manifestPath,
      `${JSON.stringify({ "websites/acme-consulting": "4.5.6" }, null, 2)}\n`
    )

    await expect(
      createWebsite(root, { slug: "acme-consulting" })
    ).rejects.toThrow("already registered")
    expect(await readFile(manifestPath, "utf8")).toContain(
      '"websites/acme-consulting": "4.5.6"'
    )
  })

  test("does not mutate a repository when the site already exists", async () => {
    const root = await fixtureRepo()
    await createWebsite(root, { slug: "acme-consulting" })

    await expect(
      createWebsite(root, { slug: "acme-consulting" })
    ).rejects.toThrow("already exists")
  })

  test("reports the full write set without writing in dry-run mode", async () => {
    const root = await fixtureRepo()

    const result = await createWebsite(root, {
      slug: "acme-consulting",
      dryRun: true,
    })

    expect(result).toContain("websites/acme-consulting/package.json")
    await expect(
      readFile(join(root, "websites/acme-consulting/package.json"), "utf8")
    ).rejects.toThrow()
  })
})
