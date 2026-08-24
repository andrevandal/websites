import { expect, test } from "bun:test"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const repoRoot = resolve(import.meta.dirname, "../..")

const action = (
  target: string,
  status: string,
  secs: number,
  cacheType?: string
) => ({
  label: `RunTask(${target})`,
  status,
  duration: { secs, nanos: 0 },
  node: { action: "run-task", params: { target } },
  operations: [
    {
      meta: { type: "hash-generation", hash: `hash-${target}` },
      status: "passed",
    },
    ...(cacheType
      ? [{ meta: { type: "output-hydration", exitCode: 0 }, status: cacheType }]
      : []),
  ],
})

const REPORT = {
  actions: [
    {
      label: "SyncWorkspace",
      status: "passed",
      duration: { secs: 0, nanos: 0 },
      node: { action: "sync-workspace", params: {} },
      operations: [],
    },
    action("images:typecheck", "passed", 42),
    action("images:test", "passed", 31),
    action("utils:build", "cached-from-remote", 1, "cached"),
    action("sun-ui:build", "cached", 1, "cached"),
    action("images:lint", "skipped", 0),
  ],
  context: { primaryTargets: ["images:typecheck", "images:test"] },
  duration: { secs: 75, nanos: 500000000 },
  comparisonEstimate: {
    duration: { secs: 300, nanos: 0 },
    gain: { secs: 224, nanos: 500000000 },
    loss: null,
    percent: 74.8,
  },
  status: "completed",
}

const runSummary = (report: unknown | null) => {
  const dir = mkdtempSync(join(tmpdir(), "ci-summary-"))
  const reportPath = join(dir, "ciReport.json")
  if (report !== null) writeFileSync(reportPath, JSON.stringify(report))
  const summaryPath = join(dir, "summary.md")
  writeFileSync(summaryPath, "")
  const result = Bun.spawnSync(
    ["bun", "scripts/ci/ci-report-summary.ts", reportPath],
    { cwd: repoRoot, env: { ...process.env, GITHUB_STEP_SUMMARY: summaryPath } }
  )
  return {
    exitCode: result.exitCode,
    summary: readFileSync(summaryPath, "utf-8"),
    output: new TextDecoder().decode(result.stderr),
  }
}

test("counts task statuses and cache hits versus misses", () => {
  const result = runSummary(REPORT)
  expect(result.exitCode).toBe(0)
  expect(result.summary).toContain("5 tasks")
  expect(result.summary).toContain("| passed | 2 |")
  expect(result.summary).toContain("| cached | 1 |")
  expect(result.summary).toContain("| cached-from-remote | 1 |")
  expect(result.summary).toContain("| skipped | 1 |")
  expect(result.summary).toContain("| Remote hits | 1 |")
  expect(result.summary).toContain("| Local hits | 1 |")
  expect(result.summary).toContain("| Misses / executed | 2 |")
})

test("lists the slowest tasks first", () => {
  const result = runSummary(REPORT)
  const slowest = result.summary.slice(result.summary.indexOf("Slowest tasks"))
  expect(slowest.indexOf("images:typecheck")).toBeLessThan(
    slowest.indexOf("images:test")
  )
  expect(slowest).toContain("42.00s")
})

test("reports total duration and the estimated gain", () => {
  const result = runSummary(REPORT)
  expect(result.summary).toContain("75.50s")
  expect(result.summary).toContain("74.8%")
})

test("ignores non-task actions", () => {
  const result = runSummary(REPORT)
  expect(result.summary).not.toContain("SyncWorkspace")
})

test("a missing report never fails the job", () => {
  const result = runSummary(null)
  expect(result.exitCode).toBe(0)
  expect(result.summary).toBe("")
})

test("a malformed report never fails the job", () => {
  const dir = mkdtempSync(join(tmpdir(), "ci-summary-"))
  const reportPath = join(dir, "ciReport.json")
  writeFileSync(reportPath, "{ this is not valid json")
  const summaryPath = join(dir, "summary.md")
  writeFileSync(summaryPath, "")
  const result = Bun.spawnSync(
    ["bun", "scripts/ci/ci-report-summary.ts", reportPath],
    { cwd: repoRoot, env: { ...process.env, GITHUB_STEP_SUMMARY: summaryPath } }
  )
  expect(result.exitCode).toBe(0)
  expect(readFileSync(summaryPath, "utf-8")).toBe("")
})
