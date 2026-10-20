import { execSync } from "node:child_process"
import { describe, test, expect } from "bun:test"

describe("hostname guard", () => {
  test("no example.invalid literal in source code (excluding tests, docs and seeds, which carry production media URLs)", () => {
    const output = execSync(
      "git ls-files -z | xargs -0 grep -l 'vandal\\.services' 2>/dev/null | grep -v '\\.test\\.ts$' | grep -v '\\.md$' | grep -v '/docs/' | grep -v '\\.env\\.example$' | grep -v 'docker/' | grep -v '/seed/seed\\.json$' || true",
      { encoding: "utf8", cwd: process.cwd() }
    ).trim()

    const violations = output ? output.split("\n").filter(Boolean) : []

    expect(violations).toEqual(
      [],
      `Found example.invalid in source (should use S3_PUBLIC_URL at runtime): ${violations.join(", ")}`
    )
  })
})
