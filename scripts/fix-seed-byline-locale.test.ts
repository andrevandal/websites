import { Database } from "bun:sqlite"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { afterEach, describe, expect, test } from "bun:test"
import {
  captureSeedBylineLocale,
  fixSeedBylineLocale,
} from "./fix-seed-byline-locale"
import {
  createEmDashTestDb,
  repoRoot,
  seedEmDashDb,
} from "./utils/emdash-test-db"
import type { EmDashTestDb } from "./utils/emdash-test-db"

const INVALID = "Invalid pending byline locale repair snapshot."
const MISMATCH = "Pending byline locale repair does not match seed."

const dbs: EmDashTestDb[] = []
afterEach(async () => {
  await Promise.all(dbs.splice(0).map(db => db.cleanup()))
})

const byline = (slug: string) => ({
  id: slug,
  slug,
  displayName: slug.toUpperCase(),
})
const seedWith = (slugs: string[], defaultLocale = "pt-BR") => ({
  version: "1",
  meta: { name: "issue-197-bylines" },
  defaultLocale,
  bylines: slugs.map(byline),
})

// Pre-existing rows come from an earlier CLI run, so they sit at "en".
const setup = async (existing: string[] = ["editor", "unrelated"]) => {
  const db = await createEmDashTestDb(seedWith(existing, "en"))
  dbs.push(db)
  const paths = { seedPath: db.seedPath, databasePath: db.databasePath }
  const marker = join(db.directory, "seed-byline-locale.pending.json")
  const sql = <T = unknown>(query: string, ...params: string[]) => {
    const sqlite = new Database(db.databasePath)
    try {
      return sqlite.query(query).all(...params) as T[]
    } finally {
      sqlite.close()
    }
  }
  const exec = (query: string) => {
    const sqlite = new Database(db.databasePath)
    sqlite.run("PRAGMA foreign_keys = OFF")
    sqlite.run(query)
    sqlite.close()
  }
  const locales = () =>
    Object.fromEntries(
      sql<{ slug: string; locale: string }>(
        "SELECT slug, locale FROM _emdash_bylines ORDER BY slug, locale"
      ).map(row => [`${row.slug}`, row.locale])
    )
  // The seed CLI reads its own copy so the repair's seed file stays put.
  const cli = (seed: object) =>
    seedEmDashDb({ ...db, seedPath: join(db.directory, "cli-seed.json") }, seed)
  // The seed task: capture, CLI, repair. `seedSlugs` are the seed's bylines.
  const apply = async (seedSlugs: string[]) => {
    await Bun.write(db.seedPath, JSON.stringify(seedWith(seedSlugs)))
    captureSeedBylineLocale(paths)
    await cli(seedWith(seedSlugs))
    return fixSeedBylineLocale(paths)
  }
  return { db, paths, marker, sql, exec, locales, apply, cli }
}

describe("local seed byline locale repair", () => {
  test("moves only bylines the CLI created; pre-existing rows keep their locale", async () => {
    const t = await setup()
    // "editor" exists already and is in the seed too: it must not be relabelled.
    expect(await t.apply(["editor", "fresh"])).toEqual({
      locale: "pt-BR",
      updated: 1,
    })
    expect(t.locales()).toEqual({
      editor: "en",
      unrelated: "en",
      fresh: "pt-BR",
    })
    expect(existsSync(t.marker)).toBe(false)
    // Rerun: nothing pending, nothing changes.
    expect(fixSeedBylineLocale(t.paths).updated).toBe(0)
    expect(t.locales().fresh).toBe("pt-BR")
  }, 30_000)

  test.each([
    [
      "target-locale slug collision",
      (_id: string) =>
        `INSERT INTO _emdash_bylines (id, slug, display_name, locale, translation_group) VALUES ('c1', 'fresh', 'C', 'pt-BR', 'other-group')`,
    ],
    [
      "translation-group sibling at the target locale",
      (id: string) =>
        `INSERT INTO _emdash_bylines (id, slug, display_name, locale, translation_group) SELECT 'c2', 'fresh-pt', 'C', 'pt-BR', translation_group FROM _emdash_bylines WHERE id = '${id}'`,
    ],
    [
      "user already has a byline at the target locale",
      (id: string) =>
        `UPDATE _emdash_bylines SET user_id = 'u1' WHERE id = '${id}'; INSERT INTO _emdash_bylines (id, slug, display_name, locale, translation_group, user_id) VALUES ('c3', 'other-pt', 'C', 'pt-BR', 'g3', 'u1')`,
    ],
  ])(
    "skips a candidate with a %s",
    async (_name, conflict) => {
      const t = await setup()
      await Bun.write(t.db.seedPath, JSON.stringify(seedWith(["fresh"])))
      captureSeedBylineLocale(t.paths)
      await t.cli(seedWith(["fresh"]))
      const [{ id }] = t.sql<{ id: string }>(
        "SELECT id FROM _emdash_bylines WHERE slug = 'fresh'"
      )
      t.exec(conflict(id))
      expect(fixSeedBylineLocale(t.paths).updated).toBe(0)
      expect(
        t.sql<{ locale: string }>(
          "SELECT locale FROM _emdash_bylines WHERE id = ?",
          id
        )
      ).toEqual([{ locale: "en" }])
    },
    30_000
  )

  test("a failed repair keeps the marker and rows, and a retry succeeds", async () => {
    const t = await setup()
    await Bun.write(t.db.seedPath, JSON.stringify(seedWith(["fresh"])))
    captureSeedBylineLocale(t.paths)
    await t.cli(seedWith(["fresh"]))
    t.exec(
      "CREATE TRIGGER boom BEFORE UPDATE ON _emdash_bylines BEGIN SELECT RAISE(ABORT, 'boom'); END"
    )
    expect(() => fixSeedBylineLocale(t.paths)).toThrow("boom")
    expect(existsSync(t.marker)).toBe(true)
    expect(t.locales().fresh).toBe("en")
    t.exec("DROP TRIGGER boom")
    expect(fixSeedBylineLocale(t.paths).updated).toBe(1)
    expect(t.locales().fresh).toBe("pt-BR")
    expect(existsSync(t.marker)).toBe(false)
  }, 30_000)

  test("capture after a failed seed keeps the first snapshot", async () => {
    const t = await setup()
    await Bun.write(t.db.seedPath, JSON.stringify(seedWith(["fresh"])))
    captureSeedBylineLocale(t.paths)
    const first = readFileSync(t.marker, "utf-8")
    // The CLI failed; an editor adds a byline; the task is rerun.
    await t.cli(seedWith(["late-editor"], "en"))
    captureSeedBylineLocale(t.paths)
    expect(readFileSync(t.marker, "utf-8")).toBe(first)
    await t.cli(seedWith(["fresh"]))
    expect(fixSeedBylineLocale(t.paths).updated).toBe(1)
    expect(t.locales()["late-editor"]).toBe("en")
  }, 30_000)

  test.each([
    ["not JSON", "{nope"],
    ["wrong shape", JSON.stringify({ defaultLocale: "pt-BR", slugs: "x" })],
  ])(
    "a malformed snapshot (%s) fails closed and stays intact",
    async (_n, body) => {
      const t = await setup()
      await t.cli(seedWith(["fresh"]))
      await Bun.write(t.db.seedPath, JSON.stringify(seedWith(["fresh"])))
      writeFileSync(t.marker, body)
      expect(() => captureSeedBylineLocale(t.paths)).toThrow(INVALID)
      expect(() => fixSeedBylineLocale(t.paths)).toThrow(INVALID)
      expect(readFileSync(t.marker, "utf-8")).toBe(body)
      expect(t.locales().fresh).toBe("en")
    },
    30_000
  )

  test("a snapshot for another seed fails before and after the CLI; slug order is ignored", async () => {
    const t = await setup()
    await Bun.write(t.db.seedPath, JSON.stringify(seedWith(["a", "b"])))
    captureSeedBylineLocale(t.paths)
    const marker = readFileSync(t.marker, "utf-8")

    await Bun.write(t.db.seedPath, JSON.stringify(seedWith(["b", "a"])))
    expect(() => captureSeedBylineLocale(t.paths)).not.toThrow()

    for (const other of [seedWith(["a", "c"]), seedWith(["a", "b"], "es")]) {
      await Bun.write(t.db.seedPath, JSON.stringify(other))
      expect(() => captureSeedBylineLocale(t.paths)).toThrow(MISMATCH)
      expect(() => fixSeedBylineLocale(t.paths)).toThrow(MISMATCH)
      expect(readFileSync(t.marker, "utf-8")).toBe(marker)
    }
  }, 30_000)

  test("seeds with no bylines, no target or target en need no snapshot and repair nothing", async () => {
    const t = await setup()
    for (const seed of [
      { version: "1", defaultLocale: "pt-BR" },
      seedWith(["x"], "en"),
      { ...seedWith(["x"]), defaultLocale: undefined },
    ]) {
      await Bun.write(t.db.seedPath, JSON.stringify(seed))
      captureSeedBylineLocale(t.paths)
      expect(existsSync(t.marker)).toBe(false)
      expect(fixSeedBylineLocale(t.paths).updated).toBe(0)
    }
    expect(t.locales()).toEqual({ editor: "en", unrelated: "en" })
  }, 30_000)

  test("Pedro's committed seed has no bylines and needs no snapshot", async () => {
    const t = await setup()
    captureSeedBylineLocale({
      seedPath: resolve(repoRoot, "websites/pedrohenridesign/seed/seed.json"),
      databasePath: t.db.databasePath,
    })
    expect(existsSync(t.marker)).toBe(false)
  })

  test("a missing database snapshots no existing IDs; an unreadable one fails", async () => {
    const t = await setup()
    await Bun.write(t.db.seedPath, JSON.stringify(seedWith(["fresh"])))
    const missing = {
      seedPath: t.db.seedPath,
      databasePath: join(t.db.directory, "new", "emdash.db"),
    }
    await Bun.$`mkdir -p ${join(t.db.directory, "new")}`
    captureSeedBylineLocale(missing)
    expect(
      JSON.parse(
        readFileSync(
          join(t.db.directory, "new", "seed-byline-locale.pending.json"),
          "utf-8"
        )
      ).existingIds
    ).toEqual([])

    const corrupt = join(t.db.directory, "corrupt", "emdash.db")
    await Bun.$`mkdir -p ${join(t.db.directory, "corrupt")}`
    writeFileSync(corrupt, "this is not a sqlite database")
    expect(() =>
      captureSeedBylineLocale({
        seedPath: t.db.seedPath,
        databasePath: corrupt,
      })
    ).toThrow()
    expect(
      existsSync(
        join(t.db.directory, "corrupt", "seed-byline-locale.pending.json")
      )
    ).toBe(false)
  }, 30_000)

  test("without a snapshot nothing is relabelled", async () => {
    const t = await setup()
    await t.cli(seedWith(["fresh"]))
    await Bun.write(t.db.seedPath, JSON.stringify(seedWith(["fresh"])))
    expect(fixSeedBylineLocale(t.paths)).toEqual({
      locale: "pt-BR",
      updated: 0,
    })
    expect(t.locales().fresh).toBe("en")
  }, 30_000)
})
