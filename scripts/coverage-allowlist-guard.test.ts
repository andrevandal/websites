import { describe, expect, test } from "bun:test"
import type { CoverageConfig } from "../coverage.config.ts"
import { findContractRegressions } from "./coverage-allowlist-guard"

type ProjectSpec = {
  include?: string[]
  exclude?: string[]
  allowlist?: string[]
}

const config = (
  projects: Record<string, ProjectSpec>,
  thresholds = { functions: 80, lines: 80 }
): CoverageConfig => ({
  thresholds,
  projects: Object.fromEntries(
    Object.entries(projects).map(([id, spec]) => [
      id,
      {
        include: spec.include ?? ["src/**/*.ts"],
        exclude: spec.exclude ?? [],
        allowlist: (spec.allowlist ?? []).map(file => ({ file, issue: "#1" })),
      },
    ])
  ),
})

describe("findContractRegressions", () => {
  test.each([
    {
      name: "unchanged",
      current: config({ web: { allowlist: ["a.ts"] } }),
      baseline: config({ web: { allowlist: ["a.ts"] } }),
      expected: [],
    },
    {
      name: "allowlist shrunk",
      current: config({ web: {} }),
      baseline: config({ web: { allowlist: ["a.ts"] } }),
      expected: [],
    },
    {
      name: "allowlisted file renamed",
      current: config({ web: { allowlist: ["b.ts"] } }),
      baseline: config({ web: { allowlist: ["a.ts"] } }),
      expected: [],
    },
    {
      name: "allowlist grew by one",
      current: config({ web: { allowlist: ["a.ts", "b.ts"] } }),
      baseline: config({ web: { allowlist: ["a.ts"] } }),
      expected: ["web allowlist grew from 1 to 2 entries"],
    },
    {
      name: "new project with one entry",
      current: config({ web: {}, images: { allowlist: ["x.ts"] } }),
      baseline: config({ web: {} }),
      expected: ["images allowlist grew from 0 to 1 entries"],
    },
    {
      name: "functions threshold lowered",
      current: config({ web: {} }, { functions: 70, lines: 80 }),
      baseline: config({ web: {} }),
      expected: ["thresholds.functions lowered from 80 to 70"],
    },
    {
      name: "project removed, still a live workspace member",
      current: config({}),
      baseline: config({ web: {} }),
      expected: ["project web was removed"],
      projectExists: () => true,
    },
    {
      name: "project removed, workspace member deleted outright",
      current: config({}),
      baseline: config({ web: {} }),
      expected: [],
      projectExists: () => false,
    },
    {
      name: "exclude added",
      current: config({ web: { exclude: ["src/x.ts"] } }),
      baseline: config({ web: {} }),
      expected: ['web exclude added "src/x.ts"'],
    },
    {
      name: "include dropped",
      current: config({ web: { include: ["src/**/*.ts"] } }),
      baseline: config({ web: { include: ["src/**/*.ts", "src/**/*.tsx"] } }),
      expected: ['web include dropped "src/**/*.tsx"'],
    },
  ])("$name", ({ current, baseline, expected, projectExists }) => {
    expect(findContractRegressions(current, baseline, projectExists)).toEqual(
      expected
    )
  })
})
