import { v } from "./utils/schemas"
import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

import yargs from "yargs"
import { hideBin } from "yargs/helpers"

import { consola } from "consola"
import { execa } from "execa"
import { parseEnvFileKeys, repoRoot } from "./env"
import { queryTargets } from "./utils"
import {
  deleteKvNamespaceByTitle,
  findOrCreateKvNamespace,
} from "./utils/cloudflare"

const envChoices = ["production", "staging", "preview"] as const

const availableTargets = await queryTargets()

const parseArgs = (argv: string[]) =>
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
    .command("cleanup <target>", "Tear down a PR preview deployment", builder =>
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
      describe: "Pull request number (required for preview deploys/cleanup)",
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

type WranglerConfig = {
  name: string
  compatibility_date: string
  compatibility_flags?: string[]
  assets?: { directory: string }
  kv_namespaces?: { binding: string; id?: string }[]
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
}

try {
  if (!import.meta.main) {
    throw new Error(
      "This script is not meant to be imported. Please run it directly with `node deploy.js`."
    )
  }

  const args = await parseArgs(process.argv)
  const { env, pr, debug: isDebug, target, dryRun, _: command } = args

  if (isDebug) consola.level = 5

  const isCleanup = command[0] === "cleanup"

  const project = availableTargets[`${target}`]

  if (!project) throw new Error(`Target not found.`)

  const siteDir = resolve(repoRoot, ...project.location)
  const wranglerConfigPath = resolve(siteDir, "wrangler.json")
  const wranglerConfig = JSON.parse(
    await readFile(wranglerConfigPath, "utf-8")
  ) as WranglerConfig

  const name = workerName(wranglerConfig.name, isCleanup ? "preview" : env, pr)

  if (isCleanup) {
    if (!pr)
      throw new Error("Cleanup requires --pr <N> (the pull request number).")

    if (dryRun) {
      consola.info(
        `[DRY-MODE] Would delete worker "${name}" and its KV namespace`
      )
    } else {
      consola.info(`Deleting worker "${name}"...`)
      await execa("bunx", ["wrangler", "delete", name, "--force", "-y"], {
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

  const envVarsFilePath = resolve(repoRoot, ...project.location, ".env.example")
  const ENV_VARS_KEYS = parseEnvFileKeys(envVarsFilePath)
  const envVarName = `ENV_VARS_${project.id.toUpperCase().split(/[.-]/)[0]}`
  const ENV_VARS_VALUES_RAW = process.env[envVarName]

  if (!ENV_VARS_VALUES_RAW)
    consola.warn(`${envVarName} not set — deploying with no custom env vars`)

  const envVars =
    ENV_VARS_KEYS.length > 0 && ENV_VARS_VALUES_RAW
      ? v.parse(
          v.pipe(
            v.string(),
            v.parseJson(),
            v.record(v.picklist(ENV_VARS_KEYS), v.string())
          ),
          ENV_VARS_VALUES_RAW.replaceAll("\\", "").replace(/^\uFEFF/, "")
        )
      : {}

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
  )
  const generatedConfig = JSON.parse(
    await readFile(generatedConfigPath, "utf-8")
  ) as WranglerConfig

  if (!generatedConfig.kv_namespaces?.length) {
    throw new Error(
      `${generatedConfigPath} has no kv_namespaces entry — did the build run?`
    )
  }

  generatedConfig.kv_namespaces[0]!.id = namespace.id
  await writeFile(generatedConfigPath, JSON.stringify(generatedConfig, null, 2))

  consola.info("Deploying...", `worker "${name}"`)
  console.debug("With environment variables:", envVars)

  const proc = execa("bunx", ["wrangler", "deploy", "--name", name], {
    cwd: siteDir,
    env: { ...process.env, ...envVars },
    all: true,
  })

  proc.all?.pipe(process.stdout)

  const { all: output } = await proc

  const url = output?.match(/https:\/\/\S+/g)?.at(-1)

  if (url) consola.success(`Deployed to: ${url}`)
} catch (err) {
  consola.error((err as Error).message)
  process.exit(1)
}
