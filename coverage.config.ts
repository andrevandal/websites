// The coverage contract: what each project must cover, and the files that are
// knowingly uncovered. scripts/coverage.ts enforces it from each project root
// against the lcov report the `test` task writes. The contract only tightens:
// scripts/coverage-allowlist-guard.ts fails a build that loosens it. Projects
// missing here exclude the `coverage` task in their moon.yml.

type CoverageAllowance = {
  // Project-relative path of an in-scope file below the thresholds.
  file: string
  // GitHub issue that removes it, e.g. "#79".
  issue: string
}

type ProjectCoverage = {
  // Project-relative globs that must be covered.
  include: string[]
  // Project-relative globs subtracted from `include`, commented by category.
  exclude: string[]
  allowlist: CoverageAllowance[]
}

type CoverageConfig = {
  // Minimum percentages, enforced per project over its non-allowlisted files.
  thresholds: { functions: number; lines: number }
  projects: Record<string, ProjectCoverage>
}

// Test files
const TESTS = ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"]
// Type-only modules: bun emits no lcov record for them
const TYPE_ONLY = ["**/*.d.ts", "**/types.ts", "**/*.props.ts"]

const coverageConfig: CoverageConfig = {
  thresholds: { functions: 80, lines: 80 },
  projects: {
    images: {
      include: ["src/**/*.ts"],
      exclude: [...TESTS, ...TYPE_ONLY],
      allowlist: [
        { file: "src/cache/backend.ts", issue: "#80" },
        { file: "src/cache/select.ts", issue: "#80" },
        { file: "src/handlers/image.ts", issue: "#80" },
        { file: "src/index.ts", issue: "#80" },
        { file: "src/transform/placeholder.ts", issue: "#80" },
      ],
    },
    "sun-ui": {
      include: ["src/**/*.ts"],
      exclude: [
        ...TESTS,
        ...TYPE_ONLY,
        // Pure re-export barrels
        "src/index.ts",
        "src/*/index.ts",
        "src/astro/*/index.ts",
      ],
      allowlist: [{ file: "src/config.ts", issue: "#83" }],
    },
  },
}

export { coverageConfig }
export type { CoverageAllowance, CoverageConfig, ProjectCoverage }
