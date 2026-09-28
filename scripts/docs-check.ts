import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { basename, dirname, resolve } from "node:path"

type Finding = {
  file: string
  line: number
  message: string
}

const finding = (file: string, line: number, message: string): Finding => ({
  file,
  line,
  message,
})

// ---------------------------------------------------------------- utilities

const git = (args: string[]): string =>
  execFileSync("git", args, {
    encoding: "utf-8",
    cwd: process.cwd(),
  }).trim()

const isCalendarDate = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value

// ---------------------------------------------------------------- ADR checks

const ADR_WORD_CAP = 600

// Over the cap before the cap existed; issue #85 trims or retires each one and deletes this list.
const ADR_WORD_CAP_ALLOWLIST: Record<string, true> = {
  "docs/adr/2026-08-21-self-hosted-moon-remote-cache.md": true,
}

const ADR_FILENAME = /^(?<date>\d{4}-\d{2}-\d{2})-[a-z0-9-]+\.md$/

const checkAdrFilename = (file: string): Finding[] => {
  const findings: Finding[] = []
  const name = basename(file)

  if (!ADR_FILENAME.test(name)) {
    findings.push(
      finding(
        file,
        0,
        `ADR filename must match YYYY-MM-DD-slug.md, got ${name}`
      )
    )
    return findings
  }

  const match = name.match(ADR_FILENAME)!
  const { date } = match.groups!

  if (!isCalendarDate(date)) {
    findings.push(
      finding(file, 0, `ADR date ${date} is not a valid calendar date`)
    )
  }

  return findings
}

const checkAdrH1 = (file: string, text: string): Finding[] => {
  const findings: Finding[] = []
  const lines = text.split("\n")

  let found = false
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    if (lines[i].match(/^# /)) {
      found = true
      break
    }
  }

  if (!found) {
    findings.push(
      finding(file, 1, "ADR must start with an H1 heading (# Title)")
    )
  }

  return findings
}

const checkAdrNoStatus = (file: string, text: string): Finding[] => {
  const findings: Finding[] = []
  const lines = text.split("\n")

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^Status:\s*/i)) {
      findings.push(
        finding(
          file,
          i + 1,
          "ADR must not have a Status: line (its presence in the directory means it is in force)"
        )
      )
    }
  }

  return findings
}

const checkAdrWordCount = (file: string, text: string): Finding[] => {
  const findings: Finding[] = []
  const words = text.trim().split(/\s+/).length

  if (words > ADR_WORD_CAP && !ADR_WORD_CAP_ALLOWLIST[file]) {
    findings.push(
      finding(
        file,
        0,
        `ADR exceeds word cap of ${ADR_WORD_CAP}: ${words} words`
      )
    )
  }

  return findings
}

// ---------------------------------------------------------------- epic invariants

const EPIC_INV_FULL = /#\d+\s+INV-\d+/g
const EPIC_INV_BARE = /(?<![\w-#])INV-\d+(?![\w-])/g

const EPIC_INV_EXCLUSIONS = [
  "docs/agents/",
  ".github/ISSUE_TEMPLATE/",
  ".github/pull_request_template.md",
  ".agents/skills/",
]

const isEpicInvExcluded = (file: string): boolean =>
  EPIC_INV_EXCLUSIONS.some(excl => file.includes(excl))

const checkEpicInvariants = (file: string, text: string): Finding[] => {
  if (isEpicInvExcluded(file)) return []

  const findings: Finding[] = []
  const lines = text.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const fullMatches = [...line.matchAll(EPIC_INV_FULL)]
    const fullRanges = fullMatches.map(
      match => [match.index, match.index + match[0].length] as const
    )
    for (const match of fullMatches) {
      findings.push(
        finding(
          file,
          i + 1,
          `Epic invariant citation "${match[0]}" found in tracked file; invariants live only in issue/PR bodies`
        )
      )
    }

    const bareMatches = line.matchAll(EPIC_INV_BARE)
    for (const match of bareMatches) {
      if (
        fullRanges.some(
          ([start, end]) => match.index >= start && match.index < end
        )
      )
        continue
      findings.push(
        finding(
          file,
          i + 1,
          `Bare epic invariant "${match[0]}" found; cite as #<epic> INV-N only in issues/PRs`
        )
      )
    }
  }

  return findings
}

// ---------------------------------------------------------------- ADR citations

const NUMERIC_ADR_CITATION = /\bADRs?[ -]?0\d{3}\b|docs\/adr\/0\d{3}-/g

const checkAdrCitations = (file: string, text: string): Finding[] => {
  const findings: Finding[] = []
  const lines = text.split("\n")

  for (let i = 0; i < lines.length; i++) {
    for (const match of lines[i].matchAll(NUMERIC_ADR_CITATION)) {
      findings.push(
        finding(
          file,
          i + 1,
          `Numeric ADR citation "${match[0]}"; ADRs are named by date and slug, and code and docs never cite them`
        )
      )
    }
  }

  return findings
}

// ---------------------------------------------------------------- links

const LINK = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
const EXTERNAL = /^(?:https?|mailto):/

const checkLinks = (file: string, text: string): Finding[] => {
  const findings: Finding[] = []
  const lines = text.split("\n")
  const fileDir = dirname(file)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const matches = line.matchAll(LINK)

    for (const match of matches) {
      const target = match[2]

      if (EXTERNAL.test(target) || target.startsWith("mailto:")) continue

      const [path] = target.split("#")
      const resolved = path.startsWith("/")
        ? resolve(process.cwd(), `.${path}`)
        : resolve(fileDir, path)

      if (!existsSync(resolved)) {
        findings.push(
          finding(
            file,
            i + 1,
            `Link target does not exist: ${target} (resolved to ${resolved})`
          )
        )
      }
    }
  }

  return findings
}

// ---------------------------------------------------------------- prose paths

const CODE_SPAN = /`(?<token>[^`\n]+)`/g
const NOT_A_PATH = /[\s*{}<>|$()]/

const PATH_PREFIXES = [
  "docs/",
  ".agents/",
  "scripts/",
  "apps/",
  "packages/",
  "websites/",
  ".github/",
]

const checkPaths = (file: string, text: string): Finding[] => {
  const findings: Finding[] = []
  const lines = text.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const matches = line.matchAll(CODE_SPAN)

    for (const match of matches) {
      const { token } = match.groups!

      const startsWithPrefix = PATH_PREFIXES.some(p => token.startsWith(p))

      if (!startsWithPrefix) continue

      if (NOT_A_PATH.test(token)) continue

      if (!existsSync(resolve(process.cwd(), token))) {
        findings.push(
          finding(file, i + 1, `Backticked path does not exist: ${token}`)
        )
      }
    }
  }

  return findings
}

// ---------------------------------------------------------------- punctuation

const SMART_CHARS: Record<string, string> = {
  "\u2013": "en dash",
  "\u2014": "em dash",
  "\u2018": "left single quote",
  "\u2019": "right single quote",
  "\u201C": "left double quote",
  "\u201D": "right double quote",
}

const PUNCTUATION_DIRS = [
  "docs/agents/",
  "docs/adr/",
  ".github/ISSUE_TEMPLATE/",
  ".github/pull_request_template.md",
  ".agents/skills/",
]

const shouldCheckPunctuation = (file: string): boolean => {
  if (file.includes("AGENTS.md")) return true
  return PUNCTUATION_DIRS.some(dir => file.includes(dir))
}

const checkSmartPunctuation = (file: string, text: string): Finding[] => {
  if (!shouldCheckPunctuation(file)) return []

  const findings: Finding[] = []
  const lines = text.split("\n")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    for (const [char, name] of Object.entries(SMART_CHARS)) {
      if (line.includes(char)) {
        findings.push(
          finding(
            file,
            i + 1,
            `Found ${name} (U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}); use plain ASCII instead`
          )
        )
      }
    }
  }

  return findings
}

// ---------------------------------------------------------------- run

// retired by epic #78
const LEGACY_PATHS = [
  "docs/specs/",
  "docs/plans/",
]
// Files that spell out the banned patterns on purpose.
const SELF_FILES = ["scripts/docs-check.ts", "scripts/docs-check.test.ts"]

const lockedSkillDirs = (): string[] => {
  if (!existsSync("skills-lock.json")) return []
  const lock = JSON.parse(readFileSync("skills-lock.json", "utf-8")) as {
    skills?: Record<string, unknown>
  }
  return Object.keys(lock.skills ?? {}).map(name => `.agents/skills/${name}/`)
}

const run = async (): Promise<number> => {
  const findings: Finding[] = []
  const skipped = [...LEGACY_PATHS, ...lockedSkillDirs(), "CHANGELOG.md"]

  const files = git(["ls-files", "--cached", "--others", "--exclude-standard"])
    .split("\n")
    .filter(f => f && existsSync(f))

  const adrFiles = files.filter(
    f => f.startsWith("docs/adr/") && f !== "docs/adr/FORMAT.md"
  )
  for (const file of adrFiles) {
    const text = await readFile(file, "utf-8")
    findings.push(...checkAdrFilename(file))
    findings.push(...checkAdrH1(file, text))
    findings.push(...checkAdrNoStatus(file, text))
    findings.push(...checkAdrWordCount(file, text))
  }

  const textFiles = files.filter(
    f =>
      /\.(md|ts|tsx|js|mjs|cjs|astro|svelte|yml|yaml|json|jsonc|toml|sh)$/.test(
        f
      ) && !skipped.some(prefix => f.startsWith(prefix))
  )
  for (const file of textFiles) {
    const text = await readFile(file, "utf-8")
    if (!SELF_FILES.includes(file)) {
      findings.push(...checkEpicInvariants(file, text))
      findings.push(...checkAdrCitations(file, text))
    }

    if (file.endsWith(".md")) {
      findings.push(...checkLinks(file, text))
      // ADRs record what the tree looked like when the decision was made.
      if (!file.startsWith("docs/adr/"))
        findings.push(...checkPaths(file, text))
    }
    findings.push(...checkSmartPunctuation(file, text))
  }

  // Sort findings by file and line
  findings.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file)
    return a.line - b.line
  })

  // Print findings
  const hasErrors = findings.length > 0
  for (const f of findings) console.log(`${f.file}:${f.line}: ${f.message}`)

  return hasErrors ? 1 : 0
}

if (import.meta.main) process.exit(await run())

export {
  checkAdrCitations,
  checkAdrFilename,
  checkAdrH1,
  checkAdrNoStatus,
  checkAdrWordCount,
  checkEpicInvariants,
  checkLinks,
  checkPaths,
  checkSmartPunctuation,
}
