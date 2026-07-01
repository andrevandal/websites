import { describe, expect, it } from "bun:test"
import { cn } from "./cn"

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar")
  })

  it("resolves tailwind conflicts", () => {
    expect(cn("p-4", "p-8")).toBe("p-8")
  })

  it("filters falsy values", () => {
    expect(cn("foo", false, null, undefined, "bar")).toBe("foo bar")
  })
})
