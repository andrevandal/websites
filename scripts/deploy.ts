import { v } from "./utils/schemas"
import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

import yargs from "yargs"
import { hideBin } from "yargs/helpers"

import { consola } from "consola"
import { execa } from "execa"
import { repoRoot, resolveTargetEnvVars } from "./env"
import { queryTargets } from "./utils"
import {
  deleteKvNamespaceByTitle,
  findOrCreateKvNamespace,
} from "./utils/cloudflare"

const envChoices = ["production", "staging", "preview"] as const

type WranglerConfig = {
  name: string
  compatibility_date: string
  compatibility_flags?: string[]
  assets?: { directory: string }
  kv_namespaces?: { binding: string; id?: string }[]
  vars?: Record<string, string>
}

const workerName = (baseName: string, env: string, pr?: number) => {
    if (env === "preview") {
      if (!pr) {
        throw new Error(
          "Preview deploys require --pr <N> (the pull request number)."
        )
      }

      return `${baseName}-pr-${pr}`
    }

    if (env === "staging") return `${baseName}-staging`

    return baseName
  },
  // Only production workers can have a Cloudflare Custom Domain bound in the
  // dashboard (see websites/vandallabs/README.md) — PR-preview and staging
  // workers are always plain `*.workers.dev`. Keyed by the worker's base name
  // (wrangler.json's `name` field), not the CLI target string.
  CUSTOM_DOMAINS: Record<string, string> = {
    vandallabs: "https://vandallabs.com.br",
  },
  // wrangler's combined stdout/stderr contains its own deploy-confirmation
  // line (`https://<name>.<subdomain>.workers.dev`) but may also print other
  // https:// URLs (docs links, warnings, etc.) before or after it. Anchor
  // specifically on the `.workers.dev` suffix instead of grabbing the last
  // https:// token in the whole output, and prefer a match containing the
  // deployed worker name so an unrelated workers.dev URL can't be picked up.
  resolvePreviewUrl = (
    output: string | undefined,
    workerNameDeployed: string
  ): string | undefined => {
    const matches = output?.match(/https:\/\/\S+\.workers\.dev\S*/g) ?? []
    return (
      matches.find(url => url.includes(`${workerNameDeployed}.`)) ??
      matches.at(-1)
    )
  }

if (import.meta.main) {
  const availableTargets = await queryTargets(),
    parseArgs = (argv: string[]) =>
      yargs(hideBin(argv))
        .scriptName("deploy")
        .version("1.0.0")
        .command("$0 <target>", "Deploy a target", builder =>
          builder.positional("target", {
            describe: "The command target name",
            type: "string",
            choices: Object.keys(availableTargets),
            required: true,
          })
        )
        .command(
          "cleanup <target>",
          "Tear down a PR preview deployment",
          builder =>
            builder.positional("target", {
              describe: "The command target name",
              type: "string",
              choices: Object.keys(availableTargets),
              required: true,
            })
        )
        .option("env", {
          type: "string",
          alias: "e",
          default: "preview",
          describe: "Deploy environment",
          coerce: input => v.parse(v.picklist(envChoices), input),
          choices: envChoices,
          required: false,
        })
        .option("pr", {
          type: "number",
          describe:
            "Pull request number (required for preview deploys/cleanup)",
          required: false,
        })
        .option("dry-run", {
          type: "boolean",
          default: false,
          describe: "Print commands without executing.",
        })
        .option("debug", {
          type: "boolean",
          default: false,
          describe: "Enable verbose debug logging",
        })
        .usage("Usage: $0 <target> [options]")
        .example("$0 <target> --env preview --pr 123", "Deploy a PR preview")
        .example("$0 <target> --env staging", "Deploy staging")
        .example("$0 <target> --env production", "Deploy production")
        .example("$0 cleanup <target> --pr 123", "Tear down a PR preview")
        .help()
        .demandCommand(1, "You must provide a <target> argument.")
        .parse()

  try {
    const args = await parseArgs(process.argv),
      { env, pr, debug: isDebug, target, dryRun, _: command } = args

    if (isDebug) consola.level = 5

    const isCleanup = command[0] === "cleanup",
      project = availableTargets[`${target}`]

    if (!project) throw new Error(`Target not found.`)

    const siteDir = resolve(repoRoot, ...project.location),
      wranglerConfigPath = resolve(siteDir, "wrangler.json"),
      wranglerConfig = JSON.parse(
        await readFile(wranglerConfigPath, "utf-8")
      ) as WranglerConfig,
      name = workerName(wranglerConfig.name, isCleanup ? "preview" : env, pr)

    if (isCleanup) {
      if (!pr)
        throw new Error("Cleanup requires --pr <N> (the pull request number).")

      if (dryRun) {
        consola.info(
          `[DRY-MODE] Would delete worker "${name}" and its KV namespace`
        )
      } else {
        consola.info(`Deleting worker "${name}"...`)
        await execa("bunx", ["wrangler", "delete", name, "--force"], {
          cwd: siteDir,
          reject: false,
          stdio: "inherit",
        })

        consola.info(`Deleting KV namespace "${name}"...`)
        const deleted = await deleteKvNamespaceByTitle(name)

        consola[deleted ? "success" : "info"](
          deleted
            ? `Deleted KV namespace "${name}".`
            : `KV namespace "${name}" not found, nothing to delete.`
        )
      }

      process.exit(0)
    }

    const envVars = resolveTargetEnvVars(
      project.location,
      env as "preview" | "staging" | "production"
    )

    if (dryRun) {
      consola.info(
        "[DRY-MODE] Deploying...",
        `worker "${name}" (find-or-create KV namespace "${name}")`
      )
      console.debug("With environment variables:", envVars)
      process.exit(0)
    }

    consola.info(`Resolving KV namespace "${name}"...`)
    const { namespace, created } = await findOrCreateKvNamespace(name)

    consola[created ? "success" : "info"](
      created
        ? `Created KV namespace "${name}" (${namespace.id}).`
        : `Reusing existing KV namespace "${name}" (${namespace.id}).`
    )

    const generatedConfigPath = resolve(
        repoRoot,
        ...project.location,
        "dist/server/wrangler.json"
      ),
      generatedConfig = JSON.parse(
        await readFile(generatedConfigPath, "utf-8")
      ) as WranglerConfig

    if (!generatedConfig.kv_namespaces?.length) {
      throw new Error(
        `${generatedConfigPath} has no kv_namespaces entry — did the build run?`
      )
    }

    generatedConfig.kv_namespaces[0]!.id = namespace.id
    generatedConfig.vars = { ...generatedConfig.vars, ...envVars }
    await writeFile(
      generatedConfigPath,
      JSON.stringify(generatedConfig, null, 2)
    )

    consola.info("Deploying...", `worker "${name}"`)
    console.debug("With environment variables:", envVars)

    const proc = execa("bunx", ["wrangler", "deploy", "--name", name], {
      cwd: siteDir,
      env: { ...process.env, ...envVars },
      all: true,
    })

    proc.all?.pipe(process.stdout)

    const { all: output } = await proc,
      url = resolvePreviewUrl(output, name),
      customDomain =
        env === "production" ? CUSTOM_DOMAINS[wranglerConfig.name] : undefined

    if (url) {
      consola.success(`Deployed to: ${url}`)
      if (customDomain) {
        consola.info(
          `Production custom domain (dashboard-managed): ${customDomain}`
        )
      }

      if (process.env["GITHUB_OUTPUT"]) {
        await writeFile(
          process.env["GITHUB_OUTPUT"]!,
          `deploy-url=${url}\n${customDomain ? `custom-domain=${customDomain}\n` : ""}`,
          { flag: "a" }
        )
      }

      if (process.env["GITHUB_STEP_SUMMARY"]) {
        const summaryLines = [
          `### Deploy: \`${name}\``,
          `- Preview URL: ${url}`,
          ...(customDomain ? [`- Production domain: ${customDomain}`] : []),
          "",
        ]
        await writeFile(
          process.env["GITHUB_STEP_SUMMARY"]!,
          `${summaryLines.join("\n")}\n`,
          { flag: "a" }
        )
      }
    } else {
      consola.warn(
        "Could not find a workers.dev deploy URL in wrangler's output."
      )
    }
  } catch (err) {
    consola.error((err as Error).message)
    process.exit(1)
  }
}

export { resolvePreviewUrl }
