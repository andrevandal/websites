import { describe, expect, test } from "bun:test"
import {
  checkAdrCitations,
  checkAdrFilename,
  checkAdrH1,
  checkAdrNoStatus,
  checkAdrWordCount,
  checkLinks,
  checkPaths,
  checkSmartPunctuation,
} from "./docs-check.ts"

describe("ADR filename", () => {
  test.each([
    {
      name: "valid date-based filename",
      file: "docs/adr/2026-09-20-node-subpath-imports.md",
      expected: 0,
    },
    {
      name: "valid date with hyphens",
      file: "docs/adr/2026-01-15-my-decision.md",
      expected: 0,
    },
    {
      name: "old sequential format rejected",
      file: "docs/adr/0001-old-format.md",
      expected: 1,
    },
    {
      name: "no date prefix rejected",
      file: "docs/adr/my-decision.md",
      expected: 1,
    },
  ])("$name", ({ file, expected }) => {
    const findings = checkAdrFilename(file)
    expect(findings).toHaveLength(expected)
  })
})

describe("ADR H1 heading", () => {
  test.each([
    {
      name: "has H1 at start",
      text: "# My Decision\nSome text",
      expected: 0,
    },
    {
      name: "has H1 after blank lines",
      text: "\n\n# My Decision\nSome text",
      expected: 0,
    },
    {
      name: "missing H1",
      text: "## Sub heading\nSome text",
      expected: 1,
    },
    {
      name: "no headings at all",
      text: "Just prose",
      expected: 1,
    },
  ])("$name", ({ text, expected }) => {
    const findings = checkAdrH1("docs/adr/2026-09-20-test.md", text)
    expect(findings).toHaveLength(expected)
  })
})

describe("ADR Status line", () => {
  test.each([
    {
      name: "no Status line",
      text: "# My Decision\nSome text",
      expected: 0,
    },
    {
      name: "has Status line",
      text: "# My Decision\nStatus: active",
      expected: 1,
    },
    {
      name: "has Status line case-insensitive",
      text: "# My Decision\nstatus: draft",
      expected: 1,
    },
  ])("$name", ({ text, expected }) => {
    const findings = checkAdrNoStatus("docs/adr/2026-09-20-test.md", text)
    expect(findings).toHaveLength(expected)
  })
})

describe("ADR word count", () => {
  test.each([
    {
      name: "under word cap",
      text: `# Decision\n${"word ".repeat(100)}`,
      expected: 0,
    },
    {
      name: "exactly at word cap (600)",
      text: `# Decision\n${"word ".repeat(598)}`,
      expected: 0,
    },
    {
      name: "over word cap",
      text: `# Decision\n${"word ".repeat(601)}`,
      expected: 1,
    },
  ])("$name", ({ text, expected }) => {
    const findings = checkAdrWordCount("docs/adr/2026-09-20-test.md", text)
    expect(findings).toHaveLength(expected)
  })

  test("applies the cap to the retained remote-cache decision", () => {
    expect(
      checkAdrWordCount(
        "docs/adr/2026-08-21-self-hosted-moon-remote-cache.md",
        `# Decision\n${"word ".repeat(601)}`
      )
    ).toHaveLength(1)
  })
})

describe("markdown links", () => {
  test.each([
    {
      name: "external links pass",
      file: "docs/test.md",
      text: "See [this](https://example.com) or [mail](mailto:test@example.com)",
      expected: 0,
    },
    {
      name: "root-relative link resolves from the repo root",
      file: "AGENTS.md",
      text: "[f](/docs/adr/FORMAT.md)",
      expected: 0,
    },
  ])("$name", ({ file, text, expected }) => {
    const findings = checkLinks(file, text)
    expect(findings).toHaveLength(expected)
  })
})

describe("backticked repository paths", () => {
  test.each([
    {
      name: "non-path backticks ignored",
      file: "docs/test.md",
      text: "The `import/no-cycle` lint rule",
      expected: 0,
    },
  ])("$name", ({ file, text, expected }) => {
    const findings = checkPaths(file, text)
    expect(findings).toHaveLength(expected)
  })
})

describe("smart punctuation", () => {
  test.each([
    {
      name: "plain punctuation in AGENTS.md passes",
      file: "AGENTS.md",
      text: "Use straight quotes and hyphens - not em dashes.",
      expected: 0,
    },
    {
      name: "em dash in AGENTS.md rejected",
      file: "AGENTS.md",
      text: "Use straight hyphens\u2014not em dashes.",
      expected: 1,
    },
    {
      name: "smart quote in AGENTS.md rejected",
      file: "AGENTS.md",
      text: "Don\u2019t use smart quotes",
      expected: 1,
    },
    {
      name: "multiple smart quotes on same line",
      file: "AGENTS.md",
      text: "He said \u201chello\u201D",
      expected: 2,
    },
    {
      name: "en dash in AGENTS.md rejected",
      file: "AGENTS.md",
      text: "a \u2013 b",
      expected: 1,
    },
  ])("$name", ({ file, text, expected }) => {
    const findings = checkSmartPunctuation(file, text)
    expect(findings).toHaveLength(expected)
  })
})

describe("ADR citations", () => {
  test.each([
    { name: "ADR number", text: "per ADR 0016", expected: 1 },
    {
      name: "numeric ADR path",
      text: "see docs/adr/0001-server-error-result-pattern.md",
      expected: 1,
    },
    { name: "hyphenated ADR number", text: "ADR-0021 says", expected: 1 },
    {
      name: "dated ADR path",
      text: "docs/adr/2026-08-16-offset-pagination.md",
      expected: 0,
    },
    { name: "the word ADR", text: "the ADR format", expected: 0 },
  ])("$name", ({ text, expected }) => {
    expect(checkAdrCitations("README.md", text)).toHaveLength(expected)
  })
})
