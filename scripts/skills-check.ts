import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { readFile, readdir } from "node:fs/promises"
import { join, relative } from "node:path"

type Finding = {
  file: string
  message: string
}

const finding = (file: string, message: string): Finding => ({
  file,
  message,
})

// ---------------------------------------------------------------- YAML parsing

const parseYAML = (text: string): Record<string, string> => {
  const result: Record<string, string> = {}
  const lines = text.split("\n")

  for (const line of lines) {
    if (line !== line.trimStart()) continue
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue

    const colonIndex = trimmed.indexOf(":")
    if (colonIndex === -1) continue

    const key = trimmed.substring(0, colonIndex).trim()
    let value = trimmed.substring(colonIndex + 1).trim()

    // Remove quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    )
      value = value.slice(1, -1)

    result[key] = value
  }

  return result
}

const parseFrontmatter = (text: string): Record<string, string> | null => {
  const match = text.match(/^---\r?\n(?<yaml>[\s\S]*?)\r?\n---/)
  if (!match?.groups) return null

  return parseYAML(match.groups["yaml"]!)
}

// ---------------------------------------------------------------- skill checks

const checkSkillFrontmatter = (skillName: string, text: string): Finding[] => {
  const findings: Finding[] = []
  const frontmatter = parseFrontmatter(text)

  const skillDir = `.agents/skills/${skillName}/SKILL.md`

  if (!frontmatter) {
    findings.push(
      finding(skillDir, "SKILL.md must start with YAML frontmatter")
    )
    return findings
  }

  if (!frontmatter.name)
    findings.push(finding(skillDir, "Frontmatter must have a 'name' field"))
  else if (frontmatter.name !== skillName) {
    findings.push(
      finding(
        skillDir,
        `Frontmatter name "${frontmatter.name}" does not match directory name "${skillName}"`
      )
    )
  }

  if (!frontmatter.description) {
    findings.push(
      finding(skillDir, "Frontmatter must have a non-empty 'description' field")
    )
  }

  return findings
}

// ---------------------------------------------------------------- hash computation

const computeFolderHash = async (skillDir: string): Promise<string> => {
  const files: { path: string; content: Buffer }[] = []

  const walk = async (dir: string) => {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "node_modules") continue

      const fullPath = join(dir, entry.name)

      // oxlint-disable-next-line eslint/no-await-in-loop -- recursive walk must be sequential per directory
      if (entry.isDirectory()) await walk(fullPath)
      else {
        // oxlint-disable-next-line eslint/no-await-in-loop -- sequential file read preserves hash computation order
        const content = await readFile(fullPath)
        const relPath = relative(skillDir, fullPath)
        files.push({ path: relPath, content })
      }
    }
  }

  await walk(skillDir)

  // Sort by path
  files.sort((a, b) => a.path.localeCompare(b.path))

  // Compute hash
  const hash = createHash("sha256")
  for (const file of files) {
    hash.update(file.path)
    hash.update(file.content)
  }

  return hash.digest("hex")
}

// ---------------------------------------------------------------- run

const run = async (): Promise<number> => {
  const findings: Finding[] = []
  const skillsDir = ".agents/skills"

  // Read skills-lock.json
  const lockPath = "skills-lock.json"
  let lock: { skills?: Record<string, { computedHash?: string }> } = {}

  try {
    const lockText = await readFile(lockPath, "utf-8")
    lock = JSON.parse(lockText)
  } catch {
    findings.push(finding(lockPath, "Failed to read or parse skills-lock.json"))
  }

  const lockedSkills = lock.skills ? Object.keys(lock.skills) : []

  // Get all skill directories
  let allSkillDirs: string[] = []

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true })
    allSkillDirs = entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .sort()
  } catch {
    findings.push(finding(skillsDir, "Failed to read skills directory"))
    return findings.length > 0 ? 1 : 0
  }

  // Check each skill directory
  for (const skillName of allSkillDirs) {
    const skillPath = join(skillsDir, skillName)
    const skillMdPath = join(skillPath, "SKILL.md")

    if (!existsSync(skillMdPath)) {
      findings.push(
        finding(
          join(skillPath, "SKILL.md"),
          "SKILL.md file not found in skill directory"
        )
      )
      continue
    }

    // oxlint-disable-next-line eslint/no-await-in-loop -- sequential file read per skill
    const skillText = await readFile(skillMdPath, "utf-8")
    findings.push(...checkSkillFrontmatter(skillName, skillText))
  }

  // Check lock entries have directories
  for (const lockName of lockedSkills) {
    const lockedSkillPath = join(skillsDir, lockName)
    if (!existsSync(lockedSkillPath)) {
      findings.push(
        finding(lockPath, `Locked skill "${lockName}" directory not found`)
      )
    }
  }

  // Get locally-authored skills (not in lock)
  const localSkills = allSkillDirs.filter(s => !lockedSkills.includes(s))

  // Check local skills are in README.md
  if (localSkills.length > 0) {
    const readmePath = join(skillsDir, "README.md")
    let readmeText = ""

    try {
      readmeText = await readFile(readmePath, "utf-8")
    } catch {
      findings.push(
        finding(readmePath, "README.md not found in skills directory")
      )
    }

    for (const localSkill of localSkills) {
      if (!readmeText.includes(`\`${localSkill}\``)) {
        findings.push(
          finding(
            readmePath,
            `Locally-authored skill "${localSkill}" not mentioned in README.md`
          )
        )
      }
    }
  }

  // Verify locked skills hashes
  for (const [lockName, entry] of Object.entries(lock.skills || {})) {
    const lockHash = entry.computedHash
    if (!lockHash) continue

    const skillPath = join(skillsDir, lockName)
    if (!existsSync(skillPath)) continue

    try {
      // oxlint-disable-next-line eslint/no-await-in-loop -- sequential hash computation per skill
      const computed = await computeFolderHash(skillPath)
      if (computed !== lockHash) {
        findings.push(
          finding(
            lockPath,
            `Locked skill "${lockName}" hash mismatch: expected ${lockHash}, got ${computed}`
          )
        )
      }
    } catch {
      findings.push(
        finding(
          lockPath,
          `Failed to compute hash for locked skill "${lockName}"`
        )
      )
    }
  }

  // Sort findings by file
  findings.sort((a, b) => a.file.localeCompare(b.file))

  // Print findings
  const hasErrors = findings.length > 0
  for (const f of findings) console.log(`${f.file}: ${f.message}`)

  return hasErrors ? 1 : 0
}

if (import.meta.main) process.exit(await run())

export { checkSkillFrontmatter, computeFolderHash }
