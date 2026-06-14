import { v } from "./utils/schemas"
import { resolve } from "node:path"

import yargs from "yargs"
import { hideBin } from "yargs/helpers"

import { consola } from "consola"
import { execa } from "execa"
import { parseEnvFileKeys, repoRoot } from "./env"
import { queryTargets } from "./utils"

const envChoices = ["production", "staging", "preview"] as const

const availableTargets = await queryTargets()

const parseArgs = (argv: string[]) =>
  yargs(hideBin(argv))
    .scriptName("deploy")
    .version("1.0.0")
    .command("$0 <target>", "Run the tool for a target", builder =>
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
    .option("dry-run", {
      type: "boolean",
      default: true,
      describe: "Print commands without executing.",
    })
    .option("debug", {
      type: "boolean",
      default: false,
      describe: "Enable verbose debug logging",
    })
    .usage("Usage: $0 <target> [options]")
    .example("$0 <target>", "Deploy preview")
    .example("$0 <target> --env production", "Deploy production")
    .help()
    .demandCommand(1, "You must provide a <target> argument.")
    .parse()

try {
  if (!import.meta.main) {
    throw new Error(
      "This script is not meant to be imported. Please run it directly with `node deploy.js`."
    )
  }

  const args = await parseArgs(process.argv)
  const { env, debug: isDebug, target, dryRun } = args

  if (isDebug) {
    consola.level = 5
  }

  const project = availableTargets[`${target}`]

  if (!project) {
    throw new Error(`Target not found.`)
  }

  const envVarsFilePath = resolve(repoRoot, ...project.location, ".env.example")
  const ENV_VARS_KEYS = parseEnvFileKeys(envVarsFilePath)
  const ENV_VARS_VALUES_RAW =
    process.env[`ENV_VARS_${project.id.toUpperCase().split(/[.-]/)[0]}`]

  if (!ENV_VARS_VALUES_RAW) {
    throw new Error(`Missing environment variable: ${ENV_VARS_VALUES_RAW}`)
  }

  const envVars = v.parse(
    v.pipe(
      v.string(),
      v.parseJson(),
      v.record(v.picklist(ENV_VARS_KEYS), v.string())
    ),
    ENV_VARS_VALUES_RAW.replaceAll("\\", "")
  )

  if (dryRun) {
    consola.info(
      "Deploying in dry-run mode.",
      `moon run ${project.id}:deploy -- --env=${env}`
    )
    console.debug("With environment variables:", envVars)
  } else {
    await execa("moon", ["run", `${project.id}:deploy`, "--", `--env=${env}`], {
      stdio: "inherit",
      env: { ...process.env, ...envVars },
    })
  }
} catch (err) {
  consola.error((err as Error).message)
  process.exit(1)
}
