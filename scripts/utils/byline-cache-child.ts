/**
 * Runs in its own process: EmDash keeps the byline field-definitions cache on
 * globalThis, so this scenario must not share a process with other tests.
 * Reads a byline through the real BylineRepository before and after the seed
 * extensions mutate the field definitions, in separate request contexts of
 * the SAME process (no cache reset, no isolated-db flag). Prints one JSON line.
 * Run with `--preload ./emdash-virtual-stub.ts`.
 */
import { Database } from "bun:sqlite"
import { runWithContext } from "emdash"
import { createDialect } from "emdash/db/libsql"
import { BylineRepository } from "emdash/internal/plugin-test-runtime"
import { Kysely } from "kysely"
import { applySeedExtensions } from "../seed-extensions"
import type { Seed, SeedDb } from "../seed-extensions"

type Scenario = {
  databasePath: string
  bylineId: string
  seed: Seed
  // Where the first extension attempt is made to fail; the second never fails.
  failAt?: "second-field" | "clean"
  deleteVersionRow?: boolean
}

const scenario = JSON.parse(process.argv[2]!) as Scenario
const kysely = new Kysely<never>({
  dialect: createDialect({ url: `file:${scenario.databasePath}` }),
})
const repo = new BylineRepository(kysely as never)
const sqlite = new Database(scenario.databasePath)

const customFields = () =>
  runWithContext({ editMode: false }, async () => {
    const byline = await repo.findById(scenario.bylineId)
    return byline?.customFields ?? null
  })

const version = () =>
  (
    sqlite
      .query("SELECT value FROM options WHERE name = 'byline_fields_version'")
      .get() as { value: string } | null
  )?.value ?? null

const apply = async (failAt?: Scenario["failAt"]) => {
  let fieldInserts = 0
  const db: SeedDb = {
    get: async (sql, params) =>
      (sqlite.query(sql).get(...(params as never[])) ?? undefined) as never,
    all: async (sql, params) =>
      sqlite.query(sql).all(...(params as never[])) as never,
    run: async (sql, params) => {
      if (
        failAt === "second-field" &&
        sql.includes("INSERT INTO _emdash_byline_fields") &&
        ++fieldInserts === 2
      )
        throw new Error("injected field write failure")

      if (failAt === "clean" && sql.includes("byline_fields_version")) {
        // dirty write passes (value '1'); the clean write (value '2') fails
        if (sql.includes("'2'")) throw new Error("injected clean failure")
      }
      return { changes: sqlite.query(sql).run(...(params as never[])).changes }
    },
  }
  try {
    await applySeedExtensions({
      seed: scenario.seed,
      db,
      putMedia: async () => {},
    })
    return null
  } catch (error) {
    return (error as Error).message
  }
}

if (scenario.deleteVersionRow)
  sqlite.run("DELETE FROM options WHERE name = 'byline_fields_version'")

const result: Record<string, unknown> = { before: await customFields() }
result.versionBefore = version()
result.firstError = await apply(scenario.failAt)
result.versionAfterFirst = version()
result.afterFirst = await customFields()
if (scenario.failAt) {
  result.retryError = await apply()
  result.versionAfterRetry = version()
  result.afterRetry = await customFields()
}
console.log(JSON.stringify(result))
sqlite.close()
await kysely.destroy()
