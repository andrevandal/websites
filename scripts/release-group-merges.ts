import { execFileSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"

// release-please turns both a PR's merge commit (its body is the PR title) and
// the PR's branch commits into changelog lines, so one PR is listed twice.
// This groups them: the merge commit's line stays and the branch commits of
// that merge are nested under it. Used on the release PR's CHANGELOG.md files
// and body. No imports beyond node: release.yml runs a copy of this file from
// outside the release branch's checkout.

const ENTRY_COMMIT =
  /\(\[[0-9a-f]{7,40}\]\([^)]*\/commit\/([0-9a-f]{40})\)\)\s*$/

const commitOf = (line: string) =>
  line.startsWith("* ") ? ENTRY_COMMIT.exec(line)?.[1] : undefined

const messageOf = (line: string) => line.replace(ENTRY_COMMIT, "").trim()

const git = (env: NodeJS.ProcessEnv, cwd: string, ...args: string[]) =>
  execFileSync("git", args, { cwd, env, encoding: "utf-8" })
    .split("\n")
    .filter(Boolean)

// Branch commits (second parent side) of every merge commit named in `texts`.
const childrenByMerge = (
  texts: string[],
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env
): Map<string, Set<string>> => {
  const shas = [
    ...new Set(texts.flatMap(text => text.split("\n").map(commitOf))),
  ].filter((sha): sha is string => sha !== undefined)
  const children = new Map<string, Set<string>>()
  if (shas.length === 0) return children
  // --no-walk lists only the given commits; --merges keeps those with 2+ parents.
  for (const merge of git(
    env,
    cwd,
    "rev-list",
    "--no-walk",
    "--merges",
    ...shas
  )) {
    children.set(
      merge,
      new Set(git(env, cwd, "rev-list", `${merge}^1..${merge}^2`))
    )
  }
  return children
}

// Within one version section: nests each merge entry's branch-commit entries
// under it (dropping a child worded exactly like its merge), and removes them
// from where they were.
const groupSection = (
  lines: string[],
  children: Map<string, Set<string>>
): string[] => {
  const removed = new Set<number>()
  const nested = new Map<number, string[]>()
  lines.forEach((line, index) => {
    const own = children.get(commitOf(line) ?? "")
    if (!own) return
    lines.forEach((other, otherIndex) => {
      const sha = commitOf(other)
      if (!sha || !own.has(sha) || removed.has(otherIndex)) return
      removed.add(otherIndex)
      if (messageOf(other) !== messageOf(line))
        nested.set(index, [...(nested.get(index) ?? []), `  ${other}`])
    })
  })

  const out: string[] = []
  // A `### Section` heading is held back until a bullet follows it, so a
  // section emptied by the removals disappears with its heading.
  let pending: string[] = []
  lines.forEach((line, index) => {
    if (removed.has(index)) return
    if (line.startsWith("### ")) pending = [line]
    else if (pending.length > 0 && line.trim() === "") pending.push(line)
    else if (line.startsWith("* ")) {
      out.push(...pending, line, ...(nested.get(index) ?? []))
      pending = []
    } else {
      pending = []
      out.push(line)
    }
  })
  return out
}

const groupMergeEntries = (
  text: string,
  children: Map<string, Set<string>>
): string =>
  text
    .split("\n")
    // A version section starts at its `## ` heading or its <details> wrapper.
    .reduce<string[][]>((sections, line) => {
      if (/^(## |<details>)/.test(line) || sections.length === 0)
        sections.push([])

      sections.at(-1)!.push(line)
      return sections
    }, [])
    .flatMap(section => groupSection(section, children))
    .join("\n")

if (import.meta.main) {
  const files = process.argv.slice(2)
  const texts = files.map(file => readFileSync(file, "utf-8"))
  const children = childrenByMerge(texts)
  let changed = 0
  files.forEach((file, index) => {
    const next = groupMergeEntries(texts[index]!, children)
    if (next !== texts[index]) {
      writeFileSync(file, next)
      changed += 1
    }
  })
  console.log(
    `Grouped merge-commit entries in ${changed} of ${files.length} files.`
  )
}

export { childrenByMerge, groupMergeEntries }
