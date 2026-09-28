// Fails a build whose coverage.config.ts loosens the contract relative to a
// base revision: it lowers a threshold, removes a project, grows an allowlist,
// adds an exclude, or drops an include. The contract only tightens.
import { execFileSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname } from "node:path"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { coverageConfig as currentConfig } from "../coverage.config.ts"
import type { CoverageConfig } from "../coverage.config.ts"

type Args = { base: string }

const parseArgs = (argv: string[]): Args =>
  yargs(hideBin(argv))
    .scriptName("coverage-allowlist-guard")
    .version(false)
    .option("base", {
      type: "string",
      default: "origin/main",
      describe: "git revision the contract must not have loosened against",
    })
    .usage("Usage: $0 [--base <revision>]")
    .example(
      "$0 --base origin/main",
      "fail if the coverage contract loosened since origin/main"
    )
    .epilogue("Reads no environment variables.")
    .help()
    .strict()
    .parseSync() as unknown as Args

const baselineCachePath =
  "node_modules/.cache/websites/coverage-baseline.config.ts"

// Returns one message per way `current` loosens the contract relative to `baseline`.
const findContractRegressions = (
  current: CoverageConfig,
  baseline: CoverageConfig
): string[] => {
  const messages: string[] = []
  for (const key of ["functions", "lines"] as const) {
    const b = baseline.thresholds[key],
      c = current.thresholds[key]
    if (c < b) messages.push(`thresholds.${key} lowered from ${b} to ${c}`)
  }
  for (const id of Object.keys(baseline.projects))
    if (!current.projects[id]) messages.push(`project ${id} was removed`)

  for (const [id, project] of Object.entries(current.projects)) {
    const base = baseline.projects[id] ?? {
      include: [],
      exclude: [],
      allowlist: [],
    }
    // Count-based, so renaming an allowlisted file passes.
    if (project.allowlist.length > base.allowlist.length) {
      messages.push(
        `${id} allowlist grew from ${base.allowlist.length} to ${project.allowlist.length} entries`
      )
    }
    for (const pattern of project.exclude) {
      if (!base.exclude.includes(pattern))
        messages.push(`${id} exclude added "${pattern}"`)
    }
    for (const pattern of base.include) {
      if (!project.include.includes(pattern))
        messages.push(`${id} include dropped "${pattern}"`)
    }
  }
  return messages
}

const run = async (args: Args): Promise<number> => {
  try {
    execFileSync("git", ["rev-parse", "--verify", `${args.base}^{commit}`], {
      stdio: "ignore",
    })
  } catch {
    console.error(`coverage-contract: ${args.base} is not a revision`)
    return 1
  }

  let baselineText: string
  try {
    baselineText = execFileSync(
      "git",
      ["show", `${args.base}:coverage.config.ts`],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    )
  } catch {
    console.log(
      `coverage-contract: no baseline at ${args.base}; nothing to compare`
    )
    return 0
  }

  mkdirSync(dirname(baselineCachePath), { recursive: true })
  writeFileSync(baselineCachePath, baselineText)
  // The baseline is a file whose path and content are only known at run
  // time — it is git-show output for an arbitrary revision, written to a
  // cache path, not a module known at author time. A static import cannot
  // name it.
  const { coverageConfig: baselineConfig } = (await import(
    `${process.cwd()}/${baselineCachePath}`
  )) as { coverageConfig: CoverageConfig }

  const regressions = findContractRegressions(currentConfig, baselineConfig)

  if (regressions.length > 0) {
    for (const message of regressions)
      console.error(`coverage-contract: ${message}`)

    return 1
  }

  const totalAllowed = Object.values(currentConfig.projects).reduce(
    (sum, project) => sum + project.allowlist.length,
    0
  )
  console.log(
    `coverage-contract: no loosening since ${args.base} (${totalAllowed} allowlisted files)`
  )
  return 0
}

if (import.meta.main) process.exit(await run(parseArgs(process.argv)))

export { findContractRegressions }
