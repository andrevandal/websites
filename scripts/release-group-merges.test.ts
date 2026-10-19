import { afterAll, describe, expect, test } from "bun:test"
import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { childrenByMerge, groupMergeEntries } from "./release-group-merges.ts"

const dir = mkdtempSync(join(tmpdir(), "release-group-"))
// Pin git to the temp repo through an explicit env. Git hooks (lefthook runs
// this suite pre-push) export GIT_DIR and friends; unpinned, the commits below
// landed on the real branch.
const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_"))
)
env["GIT_DIR"] = join(dir, ".git")
env["GIT_WORK_TREE"] = dir
afterAll(() => rmSync(dir, { recursive: true, force: true }))

const git = (...args: string[]) =>
  execFileSync("git", args, { cwd: dir, env, encoding: "utf-8" }).trim()

git("init", "-q", "-b", "main")
if (git("rev-parse", "--absolute-git-dir") !== join(dir, ".git"))
  throw new Error("test git is not pinned to the temp repo")
git("config", "user.email", "t@example.com")
git("config", "user.name", "t")
git("config", "commit.gpgsign", "false")
git("commit", "-q", "--allow-empty", "-m", "chore: base")
const baseSha = git("rev-parse", "HEAD")
git("switch", "-q", "-c", "feature")
git("commit", "-q", "--allow-empty", "-m", "feat(x): add thing")
const sameSha = git("rev-parse", "HEAD")
git("commit", "-q", "--allow-empty", "-m", "fix(x): other thing")
const otherSha = git("rev-parse", "HEAD")
git("switch", "-q", "main")
git(
  "merge",
  "--no-ff",
  "-q",
  "feature",
  "-m",
  "Merge pull request #1",
  "-m",
  "feat(x): add thing"
)
const mergeSha = git("rev-parse", "HEAD")

const entry = (sha: string, text: string) =>
  `* **x:** ${text} ([${sha.slice(0, 7)}](https://github.com/o/r/commit/${sha}))`

describe("release changelog merge-commit grouping", () => {
  test("a merge's children are its branch commits only", () => {
    expect(
      childrenByMerge([entry(mergeSha, "a"), entry(baseSha, "b")], dir, env)
    ).toEqual(new Map([[mergeSha, new Set([sameSha, otherSha])]]))
  })

  test("nests branch commits under their merge, dropping one worded like it", () => {
    const text = [
      "<details><summary>x: 1.0.0</summary>",
      "",
      "## [1.0.0](https://example.com) (2026-10-18)",
      "",
      "",
      "### Features",
      "",
      entry(mergeSha, "add thing"),
      entry(sameSha, "add thing"),
      "",
      "",
      "### Bug Fixes",
      "",
      entry(otherSha, "other thing"),
      "",
      "</details>",
    ].join("\n")

    expect(
      groupMergeEntries(
        text,
        new Map([[mergeSha, new Set([sameSha, otherSha])]])
      )
    ).toBe(
      [
        "<details><summary>x: 1.0.0</summary>",
        "",
        "## [1.0.0](https://example.com) (2026-10-18)",
        "",
        "",
        "### Features",
        "",
        entry(mergeSha, "add thing"),
        `  ${entry(otherSha, "other thing")}`,
        "",
        "",
        "</details>",
      ].join("\n")
    )
  })

  test("leaves a branch commit alone when its merge is not in the same section", () => {
    const text = [
      "## [1.0.0](u)",
      "",
      "### Features",
      "",
      entry(sameSha, "add thing"),
    ].join("\n")
    expect(
      groupMergeEntries(text, new Map([[mergeSha, new Set([sameSha])]]))
    ).toBe(text)
  })
})
