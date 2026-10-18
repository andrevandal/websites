import { afterEach, describe, expect, test } from "bun:test"
import { join } from "node:path"
import { createEmDashTestDb, repoRoot } from "./utils/emdash-test-db"
import type { EmDashTestDb } from "./utils/emdash-test-db"

const dbs: EmDashTestDb[] = []
afterEach(async () => {
  await Promise.all(dbs.splice(0).map(db => db.cleanup()))
})

const extensionSeed = {
  defaultLocale: "en",
  bylineFields: [
    { slug: "tagline", label: "Tagline", type: "string" },
    { slug: "city", label: "City", type: "string" },
  ],
  bylines: [
    { slug: "ana", customFields: { tagline: "Hello", city: "Curitiba" } },
  ],
}

const run = async (
  failAt?: "second-field" | "clean",
  deleteVersionRow = false
) => {
  const db = await createEmDashTestDb({
    version: "1",
    meta: { name: "issue-197-cache" },
    defaultLocale: "en",
    bylines: [{ id: "b1", slug: "ana", displayName: "Ana" }],
  })
  dbs.push(db)
  const { Database } = await import("bun:sqlite")
  const sqlite = new Database(db.databasePath, { readonly: true })
  const bylineId = (
    sqlite.query("SELECT id FROM _emdash_bylines WHERE slug = 'ana'").get() as {
      id: string
    }
  ).id
  sqlite.close()

  const child = Bun.spawn(
    [
      "bun",
      "--preload",
      join(repoRoot, "scripts/utils/emdash-virtual-stub.ts"),
      join(repoRoot, "scripts/utils/byline-cache-child.ts"),
      JSON.stringify({
        databasePath: db.databasePath,
        bylineId,
        seed: extensionSeed,
        failAt,
        deleteVersionRow,
      }),
    ],
    { cwd: repoRoot, stdout: "pipe", stderr: "pipe" }
  )
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  if (code !== 0) throw new Error(`child exited ${code}: ${stderr}`)
  return JSON.parse(stdout.trim().split("\n").at(-1)!) as Record<
    string,
    unknown
  >
}

describe("byline field cache across seed extensions", () => {
  test("values written by the extensions are visible to the next read", async () => {
    const r = await run()
    expect(r.versionBefore).toBe("0")
    expect(r.before).toEqual({})
    expect(r.firstError).toBeNull()
    expect(Number(r.versionAfterFirst) % 2).toBe(0)
    expect(r.afterFirst).toEqual({ tagline: "Hello", city: "Curitiba" })
  }, 30_000)

  test("a missing version row is created by the upsert and invalidates the cache", async () => {
    const r = await run(undefined, true)
    expect(r.versionBefore).toBeNull()
    expect(r.before).toEqual({})
    expect(Number(r.versionAfterFirst)).toBeGreaterThan(0)
    expect(Number(r.versionAfterFirst) % 2).toBe(0)
    expect(r.afterFirst).toEqual({ tagline: "Hello", city: "Curitiba" })
  }, 30_000)

  test("a failed definition write leaves the version dirty and a retry recovers", async () => {
    const r = await run("second-field")
    expect(r.firstError).toBe("injected field write failure")
    expect(Number(r.versionAfterFirst) % 2).toBe(1)
    expect(r.retryError).toBeNull()
    expect(Number(r.versionAfterRetry) % 2).toBe(0)
    expect(r.afterRetry).toEqual({ tagline: "Hello", city: "Curitiba" })
  }, 30_000)

  test("a retry after all definitions landed but the clean write failed still cleans", async () => {
    const r = await run("clean")
    expect(r.firstError).toBe("injected clean failure")
    expect(Number(r.versionAfterFirst) % 2).toBe(1)
    expect(r.retryError).toBeNull()
    expect(Number(r.versionAfterRetry)).toBeGreaterThan(
      Number(r.versionAfterFirst)
    )
    expect(Number(r.versionAfterRetry) % 2).toBe(0)
    expect(r.afterRetry).toEqual({ tagline: "Hello", city: "Curitiba" })
  }, 30_000)
})
