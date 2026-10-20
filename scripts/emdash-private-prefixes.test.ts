import { expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

// Site buckets deny anonymous reads on exactly these prefixes; everything else
// is public (plans/bucket-migration.local.md). EmDash keeps its list in an
// internal chunk with no public export, so read it from the shipped source.
const DENIED_PREFIXES = ["backups/", "transfers/"]

const KEYS_SOURCE = "src/transfer/staging/keys.ts"

const emdashCopies = (): string[] => {
  const roots = ["node_modules/emdash"]
  for (const pkg of new Bun.Glob("websites/*/node_modules/emdash").scanSync({
    cwd: process.cwd(),
    onlyFiles: false,
  }))
    roots.push(pkg)
  // Every installed EmDash must ship the source; a moved file fails, not skips.
  const installed = roots.filter(root => existsSync(join(root, "package.json")))
  for (const root of installed) {
    if (!existsSync(join(root, KEYS_SOURCE)))
      throw new Error(`${root} has no ${KEYS_SOURCE}; update this guard`)
  }
  return installed
}

const privatePrefixes = (source: string): string[] => {
  const list = source.match(
    /PRIVATE_STORAGE_PREFIXES[^=]*=\s*Object\.freeze\(\[(?<items>[^\]]*)\]/
  )?.groups?.["items"]
  if (list === undefined) throw new Error("PRIVATE_STORAGE_PREFIXES not found")
  return list
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)
    .map(item => {
      const literal = item.match(/^"(?<value>[^"]*)"$/)?.groups?.["value"]
      if (literal !== undefined) return literal
      const constant = source.match(
        new RegExp(`export const ${item} = "(?<value>[^"]*)"`)
      )?.groups?.["value"]
      if (constant === undefined) throw new Error(`Cannot resolve ${item}`)
      return constant
    })
    .sort()
}

test("every installed EmDash keeps the private storage prefixes the bucket policy denies", () => {
  const copies = emdashCopies()
  expect(copies.length).toBeGreaterThan(0)
  for (const root of copies) {
    const prefixes = privatePrefixes(
      readFileSync(join(root, KEYS_SOURCE), "utf8")
    )
    expect({ root, prefixes }).toEqual({ root, prefixes: DENIED_PREFIXES })
    // S3 policy Resource matching is case-sensitive; EmDash's guard is not.
    for (const prefix of prefixes) expect(prefix).toBe(prefix.toLowerCase())
  }
})
