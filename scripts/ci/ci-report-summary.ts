import { appendFileSync, existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { consola } from "consola"

// Turns `moon ci`'s .moon/cache/ciReport.json into a GITHUB_STEP_SUMMARY
// table: status counts (including remote cache hits) and the slowest tasks.
// This is the data source behind ADR 0022's test-time budget guardrail.

type Duration = { secs: number; nanos: number }

type Action = {
  status: string
  duration: Duration | null
  node: { action: string; params?: { target?: string } }
}

type Report = {
  actions: Action[]
  duration: Duration | null
  comparisonEstimate?: { percent?: number } | null
}

const repoRoot = resolve(import.meta.dirname, "../..")

const reportPath = resolve(
  repoRoot,
  process.argv[2] ?? ".moon/cache/ciReport.json"
)

const toSeconds = (duration: Duration | null) =>
  duration ? duration.secs + duration.nanos / 1_000_000_000 : 0

const format = (duration: Duration | null) =>
  `${toSeconds(duration).toFixed(2)}s`

const render = (report: Report) => {
  const tasks = report.actions.filter(entry => entry.node.action === "run-task")

  const counts = new Map<string, number>()
  for (const task of tasks)
    counts.set(task.status, (counts.get(task.status) ?? 0) + 1)

  const remoteHits = counts.get("cached-from-remote") ?? 0
  const localHits = counts.get("cached") ?? 0
  const misses = tasks.filter(
    task => !["cached", "cached-from-remote", "skipped"].includes(task.status)
  ).length

  const slowest = [...tasks]
    .sort((a, b) => toSeconds(b.duration) - toSeconds(a.duration))
    .slice(0, 5)

  const lines = [
    `### moon ci: ${tasks.length} tasks in ${format(report.duration)}`,
    "",
    "| Status | Count |",
    "| --- | --- |",
    ...[...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([status, count]) => `| ${status} | ${count} |`),
    "",
    "#### Cache",
    "",
    "| Result | Count |",
    "| --- | --- |",
    `| Remote hits | ${remoteHits} |`,
    `| Local hits | ${localHits} |`,
    `| Misses / executed | ${misses} |`,
    "",
    "#### Slowest tasks",
    "",
    "| Target | Duration | Status |",
    "| --- | --- | --- |",
    ...slowest.map(
      task =>
        `| \`${task.node.params?.target ?? "?"}\` | ${format(task.duration)} | ${task.status} |`
    ),
    "",
  ]

  const percent = report.comparisonEstimate?.percent
  if (typeof percent === "number") {
    lines.push(
      `Estimated saving vs. running everything serially: ${percent.toFixed(1)}%`,
      ""
    )
  }

  return `${lines.join("\n")}\n`
}

const run = () => {
  // oxlint-disable-next-line node/no-sync
  if (!existsSync(reportPath)) {
    consola.warn(`No moon ci report at ${reportPath} - nothing to summarize`)
    return 0
  }

  let summary: string
  try {
    // oxlint-disable-next-line node/no-sync
    const report = JSON.parse(readFileSync(reportPath, "utf-8")) as Report
    summary = render(report)
  } catch (error) {
    // This step runs with `if: always()` so it must never fail the job,
    // even against a truncated/corrupted report.
    consola.warn(
      `Could not parse ${reportPath} as a moon ci report - nothing to summarize`,
      error
    )
    return 0
  }

  const target = process.env["GITHUB_STEP_SUMMARY"]
  if (target) {
    // oxlint-disable-next-line node/no-sync
    appendFileSync(target, summary)
    return 0
  }

  consola.log(summary)
  return 0
}

process.exit(run())
