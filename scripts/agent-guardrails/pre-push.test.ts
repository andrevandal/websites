import { describe, expect, test } from "bun:test"
import { findBlockedPushes } from "./pre-push"

const ZERO = "0".repeat(40)
const SHA = "abc".padEnd(40, "1")
const isAncestor = (a: string, b: string): boolean => a === "aaa" && b === "bbb"

const cases: { name: string; stdin: string; expected: string[] }[] = [
  {
    name: "branch deletion",
    stdin: `(delete) ${ZERO} refs/heads/x ${SHA}\n`,
    expected: ["deleting refs/heads/x"],
  },
  {
    name: "new branch",
    stdin: `refs/heads/x ${SHA} refs/heads/x ${ZERO}\n`,
    expected: [],
  },
  {
    name: "fast-forward",
    stdin: "refs/heads/x bbb refs/heads/x aaa\n",
    expected: [],
  },
  {
    name: "non-fast-forward",
    stdin: "refs/heads/x bbb refs/heads/x ccc\n",
    expected: ["not a fast-forward"],
  },
  {
    name: "two lines, one bad",
    stdin:
      "refs/heads/x bbb refs/heads/x aaa\nrefs/heads/y bbb refs/heads/y ccc\n",
    expected: ["refs/heads/y is not a fast-forward"],
  },
  { name: "empty stdin", stdin: "", expected: [] },
]

describe("findBlockedPushes", () => {
  test.each(cases)("$name", ({ stdin, expected }) => {
    const findings = findBlockedPushes(stdin, isAncestor)
    expect(findings).toHaveLength(expected.length)
    expected.forEach((part, i) => expect(findings[i]).toContain(part))
  })
})
