import { describe, test, expect } from "bun:test"
import { checkSkillFrontmatter } from "./skills-check.ts"

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
