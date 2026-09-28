// Enforces per-project coverage thresholds from coverage.config.ts. Runs from
// the project root (moon's `coverage` task) and reads the lcov report the
// project's moon `test` task wrote (coverage/lcov.info); it never runs
// `bun test` itself. It filters the report down to the project's own in-scope
// files (so one project's files never inflate another's number), and fails if
// an in-scope, non-allowlisted file is missing from the report, if an
// allowlisted file now meets the thresholds, or if either threshold is not met.
import { existsSync, readFileSync } from "node:fs"
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import { coverageConfig } from "../coverage.config.ts"

type Args = { project: string }

const parseArgs = (argv: string[]): Args =>
  yargs(hideBin(argv))
    .scriptName("coverage")
    .version(false)
    .option("project", {
      type: "string",
      demandOption: true,
      describe: "moon project id, as keyed in coverage.config.ts",
    })
    .usage("Usage: $0 --project <id>")
    .example(
      "$0 --project images",
      "enforce coverage thresholds for apps/images"
    )
    .epilogue("Reads no environment variables.")
    .help()
    .strict()
    .parseSync() as unknown as Args

type LcovRecord = {
  file: string
  fnf: number
  fnh: number
  lf: number
  lh: number
}

const toProjectRelative = (cwd: string, sfPath: string): string => {
  const cwdPosix = cwd.replaceAll("\\", "/")
  let file = sfPath.replaceAll("\\", "/")
  if (file.startsWith(`${cwdPosix}/`)) file = file.slice(cwdPosix.length + 1)

  if (file.startsWith("./")) file = file.slice(2)

  return file
}

const parseLcov = (text: string, cwd: string): Map<string, LcovRecord> => {
  const records = new Map<string, LcovRecord>()
  let current: LcovRecord | null = null
  for (const line of text.split("\n")) {
    if (line.startsWith("SF:")) {
      current = {
        file: toProjectRelative(cwd, line.slice(3).trim()),
        fnf: 0,
        fnh: 0,
        lf: 0,
        lh: 0,
      }
    } else if (current && line.startsWith("FNF:"))
      current.fnf = Number(line.slice(4))
    else if (current && line.startsWith("FNH:"))
      current.fnh = Number(line.slice(4))
    else if (current && line.startsWith("LF:"))
      current.lf = Number(line.slice(3))
    else if (current && line.startsWith("LH:"))
      current.lh = Number(line.slice(3))
    else if (line.startsWith("end_of_record") && current) {
      records.set(current.file, current)
      current = null
    }
  }
  return records
}

const percent = (hit: number, found: number): number =>
  found === 0 ? 100 : (100 * hit) / found

const run = async (args: Args): Promise<number> => {
  const project = coverageConfig.projects[args.project]
  if (!project) {
    console.error(
      `coverage: project "${args.project}" is not in coverage.config.ts`
    )
    return 1
  }

  const excluded = new Set<string>()
  for (const pattern of project.exclude)
    for (const file of new Bun.Glob(pattern).scanSync(".")) excluded.add(file)

  const inScope = new Set<string>()
  for (const pattern of project.include) {
    for (const file of new Bun.Glob(pattern).scanSync("."))
      if (!excluded.has(file)) inScope.add(file)
  }

  // An include that matches nothing means the config drifted from the tree;
  // passing here would turn the gate into a silent no-op.
  if (inScope.size === 0) {
    console.error(
      `coverage: ${args.project} include patterns match no files under ${process.cwd()}`
    )
    return 1
  }
  for (const entry of project.allowlist) {
    if (!inScope.has(entry.file)) {
      console.error(
        `coverage: allowlist entry "${entry.file}" (${entry.issue}) matches no in-scope file — remove it`
      )
      return 1
    }
  }

  const allowlisted = new Set(project.allowlist.map(entry => entry.file)),
    enforced = [...inScope].filter(file => !allowlisted.has(file)).sort()

  if (enforced.length === 0) {
    console.log(
      `coverage: ${args.project} — every in-scope file is allowlisted (${inScope.size} files)`
    )
    return 0
  }

  const cwd = process.cwd(),
    // An absent report means `test` did not run for this project. Treat every
    // enforced file as missing rather than throwing ENOENT, so the failure
    // reads as a coverage gap, not tooling breakage.
    records = existsSync("coverage/lcov.info")
      ? parseLcov(readFileSync("coverage/lcov.info", "utf8"), cwd)
      : parseLcov("", cwd),
    { thresholds } = coverageConfig

  const stale = project.allowlist.filter(entry => {
    const record = records.get(entry.file)
    return (
      record !== undefined &&
      percent(record.fnh, record.fnf) >= thresholds.functions &&
      percent(record.lh, record.lf) >= thresholds.lines
    )
  })
  if (stale.length > 0) {
    for (const entry of stale) {
      console.error(
        `coverage: allowlist entry "${entry.file}" (${entry.issue}) now meets the thresholds - remove it`
      )
    }
    return 1
  }

  const missing = enforced.filter(file => !records.has(file))
  if (missing.length > 0) {
    for (const file of missing) {
      console.error(
        `coverage: ${file} is not imported by any test (add a test, or allowlist it with an issue)`
      )
    }
    return 1
  }

  let fnf = 0,
    fnh = 0,
    lf = 0,
    lh = 0
  const perFile = enforced.map(file => {
    // Every enforced file has a record: `missing` above returned already if not.
    const record = records.get(file)
    if (!record) throw new Error(`coverage: unreachable — missing ${file}`)

    fnf += record.fnf
    fnh += record.fnh
    lf += record.lf
    lh += record.lh
    return {
      file,
      functions: percent(record.fnh, record.fnf),
      lines: percent(record.lh, record.lf),
    }
  })

  const functions = percent(fnh, fnf),
    lines = percent(lh, lf),
    summary = `coverage: ${args.project} functions ${functions.toFixed(1)}% / lines ${lines.toFixed(1)}% (need ${thresholds.functions}% / ${thresholds.lines}%)`

  if (functions < thresholds.functions || lines < thresholds.lines) {
    for (const entry of perFile.sort(
      (a, b) => a.functions - b.functions || a.lines - b.lines
    )) {
      console.log(
        `  ${entry.file}: functions ${entry.functions.toFixed(1)}% / lines ${entry.lines.toFixed(1)}%`
      )
    }
    console.error(summary)
    return 1
  }

  console.log(summary)
  return 0
}

process.exit(await run(parseArgs(process.argv)))
