import { describe, expect, test } from "bun:test"
import { isAllowedDomain, isValidDomainEntry } from "@/source/domains"

describe("isAllowedDomain", () => {
  const domains = ["cdn.example.com", "*.account.workers.dev"]

  test("matches an exact hostname only", () => {
    expect(isAllowedDomain("cdn.example.com", domains)).toBe(true)
    expect(isAllowedDomain("a.cdn.example.com", domains)).toBe(false)
    expect(isAllowedDomain("example.com", domains)).toBe(false)
  })

  test("a wildcard matches subdomains at any depth but not the apex", () => {
    expect(isAllowedDomain("pr-181-x.account.workers.dev", domains)).toBe(true)
    expect(isAllowedDomain("a.b.account.workers.dev", domains)).toBe(true)
    expect(isAllowedDomain("account.workers.dev", domains)).toBe(false)
  })

  test("a wildcard does not match a lookalike suffix", () => {
    expect(isAllowedDomain("evilaccount.workers.dev", domains)).toBe(false)
    expect(isAllowedDomain("account.workers.dev.evil.com", domains)).toBe(false)
  })
})

describe("isValidDomainEntry", () => {
  test("accepts exact hostnames and multi-label wildcards", () => {
    expect(isValidDomainEntry("cdn.example.com")).toBe(true)
    expect(isValidDomainEntry("*.account.workers.dev")).toBe(true)
  })

  test("rejects single-label, mid-string and bare wildcards", () => {
    for (const entry of ["*", "*.com", "a.*.com", "*example.com", "**.a.com"])
      expect(isValidDomainEntry(entry)).toBe(false)
  })
})
