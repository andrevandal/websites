import { afterEach, describe, test, expect } from "bun:test"
import { createHash } from "node:crypto"
import { spawnSync } from "node:child_process"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { checkSkillFrontmatter, computeFolderHash } from "./skills-check.ts"

describe("checkSkillFrontmatter", () => {
  test.each([
    {
      name: "valid frontmatter with matching name",
      text: "---\nname: test-skill\ndescription: A test skill\n---\nContent here",
      expected: [],
    },
    {
      name: "missing name field",
      text: "---\ndescription: A test skill\n---\nContent here",
      expected: ["Frontmatter must have a 'name' field"],
    },
    {
      name: "missing description field",
      text: "---\nname: test-skill\n---\nContent here",
      expected: ["Frontmatter must have a non-empty 'description' field"],
    },
    {
      name: "name mismatch with directory",
      text: "---\nname: wrong-skill\ndescription: A test skill\n---\nContent here",
      expected: [
        'Frontmatter name "wrong-skill" does not match directory name "test-skill"',
      ],
    },
    {
      name: "no frontmatter",
      text: "Just content without frontmatter",
      expected: ["SKILL.md must start with YAML frontmatter"],
    },
    {
      name: "empty frontmatter block is not frontmatter",
      text: "---\n---\nContent here",
      expected: ["SKILL.md must start with YAML frontmatter"],
    },
    {
      name: "nested metadata does not overwrite top-level name",
      text: "---\nname: test-skill\ndescription: A test skill\nmetadata:\n  name: other\n---\nContent here",
      expected: [],
    },
  ])("$name", ({ text, expected }) => {
    const messages = checkSkillFrontmatter("test-skill", text).map(
      finding => finding.message
    )
    expect(messages).toHaveLength(expected.length)
    expected.forEach((part, i) => expect(messages[i]).toContain(part))
  })
})

const fixtures: string[] = []
const registryText =
  "---\nname: registry-skill\ndescription: Use when testing registry installation.\n---\n"
const registryEntry = {
  source: "example/skills",
  sourceType: "github",
  ref: "c55ee46073ed923f86ce59a5eb3b6d895095d1b7",
  skillPath: "skills/registry-skill/SKILL.md",
  computedHash: createHash("sha256")
    .update("SKILL.md")
    .update(registryText)
    .digest("hex"),
}

afterEach(async () => {
  await Promise.all(fixtures.splice(0).map(dir => rm(dir, { recursive: true })))
})

const fixture = async (entry: Record<string, unknown> = registryEntry) => {
  const root = await mkdtemp(join(import.meta.dir, ".skills-check-test-"))
  fixtures.push(root)
  await mkdir(join(root, ".agents/skills"), { recursive: true })
  await writeFile(
    join(root, "skills-lock.json"),
    JSON.stringify({ version: 1, skills: { "registry-skill": entry } })
  )
  return root
}

const installSkill = async (root: string, name: string, text: string) => {
  const dir = join(root, ".agents/skills", name)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, "SKILL.md"), text)
  return dir
}

const check = (root: string) => {
  const result = spawnSync(
    process.execPath,
    [join(import.meta.dir, "skills-check.ts")],
    { cwd: root, encoding: "utf-8" }
  )
  if (result.error) throw result.error
  return { status: result.status, output: result.stdout + result.stderr }
}

describe("registry skills", () => {
  test("an absent optional registry skill passes", async () => {
    expect(check(await fixture())).toEqual({ status: 0, output: "" })
  })

  test.each(["source", "sourceType", "ref", "skillPath", "computedHash"])(
    "requires %s even when the skill is absent",
    async field => {
      const entry: Record<string, unknown> = { ...registryEntry }
      delete entry[field]
      const result = check(await fixture(entry))
      expect(result.status).toBe(1)
      expect(result.output).toContain(field)
    }
  )

  test.each(["c55ee46", "main", "g".repeat(40)])(
    "rejects non-immutable ref %s",
    async ref => {
      const result = check(await fixture({ ...registryEntry, ref }))
      expect(result.status).toBe(1)
      expect(result.output).toContain("ref")
    }
  )

  test.each([
    { source: "" },
    { sourceType: "local" },
    { skillPath: "" },
    { computedHash: "not-a-sha256" },
  ])("rejects invalid lock metadata %j", async invalid => {
    const result = check(await fixture({ ...registryEntry, ...invalid }))
    expect(result.status).toBe(1)
    expect(result.output).toContain(Object.keys(invalid)[0]!)
  })

  test("an installed pristine copy passes without a README listing", async () => {
    const root = await fixture()
    const dir = await installSkill(root, "registry-skill", registryText)
    expect(await computeFolderHash(dir)).toBe(registryEntry.computedHash)
    expect(check(root)).toEqual({ status: 0, output: "" })
  })

  test("an installed modified copy fails its content hash", async () => {
    const root = await fixture()
    await installSkill(root, "registry-skill", `${registryText}Modified\n`)
    const result = check(root)
    expect(result.status).toBe(1)
    expect(result.output).toContain("hash mismatch")
  })

  test("installed skills still require valid frontmatter", async () => {
    const root = await fixture()
    await installSkill(root, "registry-skill", "No frontmatter\n")
    const result = check(root)
    expect(result.status).toBe(1)
    expect(result.output).toContain("must start with YAML frontmatter")
  })
})

describe("local skills", () => {
  test("a local skill needs a README listing", async () => {
    const root = await fixture()
    await installSkill(
      root,
      "local-skill",
      "---\nname: local-skill\ndescription: Use when testing local skills.\n---\n"
    )
    const result = check(root)
    expect(result.status).toBe(1)
    expect(result.output).toContain('"local-skill" not mentioned in README.md')
  })

  test("a listed local skill still needs frontmatter", async () => {
    const root = await fixture()
    await installSkill(root, "local-skill", "No frontmatter\n")
    await writeFile(join(root, ".agents/skills/README.md"), "`local-skill`\n")
    const result = check(root)
    expect(result.status).toBe(1)
    expect(result.output).toContain("must start with YAML frontmatter")
  })

  test("a listed local skill with valid frontmatter passes", async () => {
    const root = await fixture()
    await installSkill(
      root,
      "local-skill",
      "---\nname: local-skill\ndescription: Use when testing local skills.\n---\n"
    )
    await writeFile(join(root, ".agents/skills/README.md"), "`local-skill`\n")
    expect(check(root)).toEqual({ status: 0, output: "" })
  })
})
