#!/usr/bin/env bun
/**
 * `emdash seed` (the CLI behind every EmDash site's `seed` task) runs outside
 * the Astro runtime. Entries, taxonomies and menus take the seed file's
 * `defaultLocale`, but bylines are created without one and fall to the
 * column default, `"en"`. Byline lookups are strict per locale, so on a site
 * whose content is not in `en`, posts are never credited.
 *
 * The `seed` task runs two steps around the CLI, from the site directory:
 *
 *   bun ../../scripts/fix-seed-byline-locale.ts capture   # before the CLI
 *   bun ../../scripts/fix-seed-byline-locale.ts           # after the CLI
 *
 * `capture` snapshots the byline IDs that exist before the CLI runs into
 * `seed-byline-locale.pending.json` next to the database. The repair moves
 * only rows absent from that snapshot, listed in the seed and still at `"en"`,
 * so editor-created or pre-existing bylines are never relabelled. A missing
 * snapshot means no repair. Stop the local dev server before seeding: a byline
 * created by an editor mid-seed cannot be told apart from a CLI-created one.
 */
import { Database } from "bun:sqlite"
import {
  existsSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { dirname, join } from "node:path"

type Paths = { seedPath: string; databasePath: string }

type PendingMarker = {
  defaultLocale: string
  slugs: string[]
  existingIds: string[]
}

type SeedData = { defaultLocale?: string; bylines?: { slug: string }[] }

const INVALID_MARKER = "Invalid pending byline locale repair snapshot."
const MARKER_MISMATCH = "Pending byline locale repair does not match seed."

const markerPath = (databasePath: string): string =>
  join(dirname(databasePath), "seed-byline-locale.pending.json")

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(item => typeof item === "string")

const readSeed = (seedPath: string): SeedData =>
  JSON.parse(readFileSync(seedPath, "utf-8")) as SeedData

const seedSlugs = (seed: SeedData): string[] => [
  ...new Set((seed.bylines ?? []).map(byline => byline.slug)),
]

// Returns undefined when no marker exists; throws on a malformed one.
const readMarker = (path: string): PendingMarker | undefined => {
  if (!existsSync(path)) return undefined
  let value: unknown
  try {
    value = JSON.parse(readFileSync(path, "utf-8"))
  } catch {
    throw new Error(INVALID_MARKER)
  }
  const marker = value as Partial<PendingMarker> | null
  if (
    typeof marker !== "object" ||
    marker === null ||
    Object.keys(marker).length !== 3 ||
    typeof marker.defaultLocale !== "string" ||
    !isStringArray(marker.slugs) ||
    !isStringArray(marker.existingIds)
  )
    throw new Error(INVALID_MARKER)

  return marker as PendingMarker
}

const assertMarkerMatchesSeed = (marker: PendingMarker, seed: SeedData) => {
  const slugs = new Set(seedSlugs(seed))
  const markerSlugs = new Set(marker.slugs)
  if (
    marker.defaultLocale !== seed.defaultLocale ||
    slugs.size !== markerSlugs.size ||
    [...slugs].some(slug => !markerSlugs.has(slug))
  )
    throw new Error(MARKER_MISMATCH)
}

// Only a genuinely absent database or table is "empty"; any other failure
// (permissions, corruption) propagates.
const readExistingIds = (databasePath: string): string[] => {
  try {
    statSync(databasePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
    throw error
  }
  // Not readonly: macOS system SQLite cannot open a WAL database read-only when -shm is missing, which the EmDash CLI leaves behind.
  const db = new Database(databasePath, { readwrite: true })
  try {
    const table = db
      .query(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '_emdash_bylines'"
      )
      .get()
    if (!table) return []
    return (
      db.query("SELECT id FROM _emdash_bylines").all() as { id: string }[]
    ).map(row => row.id)
  } finally {
    db.close()
  }
}

const captureSeedBylineLocale = ({ seedPath, databasePath }: Paths): void => {
  const seed = readSeed(seedPath)
  const path = markerPath(databasePath)

  const existing = readMarker(path)
  if (existing) {
    assertMarkerMatchesSeed(existing, seed)
    return
  }

  const slugs = seedSlugs(seed)
  if (!slugs.length || !seed.defaultLocale || seed.defaultLocale === "en")
    return

  const marker: PendingMarker = {
    defaultLocale: seed.defaultLocale,
    slugs,
    existingIds: readExistingIds(databasePath),
  }
  // "wx": never replace an existing pending snapshot.
  writeFileSync(path, JSON.stringify(marker), { flag: "wx" })
}

const fixSeedBylineLocale = ({ seedPath, databasePath }: Paths) => {
  const seed = readSeed(seedPath)
  const path = markerPath(databasePath)
  const marker = readMarker(path)
  if (!marker) return { locale: seed.defaultLocale, updated: 0 }
  assertMarkerMatchesSeed(marker, seed)

  const locale = marker.defaultLocale
  const existingIds = new Set(marker.existingIds)
  const db = new Database(databasePath)
  let updated = 0
  try {
    const candidates = db
      .query(
        `SELECT id, slug, translation_group, user_id FROM _emdash_bylines
         WHERE locale = 'en' AND slug IN (SELECT value FROM json_each(?))`
      )
      .all(JSON.stringify(marker.slugs)) as {
      id: string
      slug: string
      translation_group: string | null
      user_id: string | null
    }[]
    const conflict = db.query(
      `SELECT 1 FROM _emdash_bylines WHERE locale = ?1 AND
         (slug = ?2 OR (?3 IS NOT NULL AND translation_group = ?3) OR (?4 IS NOT NULL AND user_id = ?4))`
    )
    const move = db.query("UPDATE _emdash_bylines SET locale = ? WHERE id = ?")
    db.transaction(() => {
      for (const row of candidates) {
        if (existingIds.has(row.id)) continue
        if (conflict.get(locale, row.slug, row.translation_group, row.user_id))
          continue

        updated += move.run(locale, row.id).changes
      }
    })()
  } finally {
    db.close()
  }

  // Marker is dropped only once the whole pass completed.
  rmSync(path, { force: true })
  return { locale, updated }
}

if (import.meta.main) {
  const paths = {
    seedPath: "seed/seed.json",
    databasePath: ".data/emdash.db",
  }

  if (process.argv[2] === "capture") captureSeedBylineLocale(paths)
  else {
    const result = fixSeedBylineLocale(paths)
    console.log(
      result.locale
        ? `Bylines moved to ${result.locale}: ${result.updated}`
        : "Seed has no defaultLocale; bylines left unchanged"
    )
  }
}

export { captureSeedBylineLocale, fixSeedBylineLocale }
export type { Paths }
