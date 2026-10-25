#!/usr/bin/env bun
/**
 * Applies the seed data `emdash seed` cannot:
 *
 * - Site settings that hold media (`logo`, `favicon`, `seo.defaultOgImage`)
 *   are written raw, as `{ "$media": { url, filename, alt } }`, which EmDash
 *   cannot resolve. Each file is downloaded into the uploads directory, given
 *   a `media` row, and the setting is rewritten to a `{ mediaId, alt }`
 *   reference. A setting that no longer holds `$media` (already resolved, or
 *   changed in the admin) is left alone.
 * - The seed format has no per-entry SEO panel. A content entry may carry a
 *   `seo` object (`title`, `description`, `image`, `canonical`, `noIndex`),
 *   which `emdash seed` ignores; it is written to `_emdash_seo` for the entry
 *   with the same slug, locale and collection, `image` (a `$media` object)
 *   stored the way the admin SEO panel stores a picked image. An entry that
 *   already has an SEO panel is left alone.
 * - The seed format has no byline custom fields, and its byline `avatar`
 *   needs a file already in storage. A root `bylineFields` array (`slug`,
 *   `label`, `type`, optional `required`/`translatable`) defines the fields
 *   missing by slug; a byline may carry `avatarMedia` (a `$media` object), set
 *   when the byline has no avatar, and `customFields` (field slug -> value),
 *   each set when the byline has no value for it. Byline field definitions
 *   use EmDash's dirty/clean version marking for cache invalidation.
 *
 * `reuseMedia` may resolve a URL to an existing row before any download.
 * `seed-content` uses it with a throwing upload guard for canonical media.
 *
 * A failed download leaves that setting, entry or avatar untouched, so the
 * next seed run retries it. Run it after each seed apply, from the site
 * directory (the `seed` task does this):
 *
 *   bun ../../scripts/seed-extensions.ts
 */
import { Database } from "bun:sqlite"
import { readFile, writeFile } from "node:fs/promises"
import { extname, join } from "node:path"

type Paths = { seedPath: string; databasePath: string; uploadsDir: string }
type SeedMedia = { $media: { url: string; filename?: string; alt?: string } }
type SeedEntrySeo = {
  title?: string
  description?: string
  image?: SeedMedia
  canonical?: string
  noIndex?: boolean
}
type SeedEntry = { slug?: string | null; seo?: SeedEntrySeo; locale?: string }
type SeedBylineField = {
  slug: string
  label: string
  type: "string" | "text" | "url" | "boolean" | "select"
  required?: boolean
  translatable?: boolean
}
type SeedByline = {
  slug: string
  avatarMedia?: SeedMedia
  customFields?: Record<string, unknown>
}
type Seed = {
  defaultLocale?: string
  settings?: Record<string, unknown>
  content?: Record<string, SeedEntry[]>
  bylineFields?: SeedBylineField[]
  bylines?: SeedByline[]
}
type SeedDb = {
  get: <T>(sql: string, params: unknown[]) => Promise<T | undefined>
  all: <T>(sql: string, params: unknown[]) => Promise<T[]>
  run: (sql: string, params: unknown[]) => Promise<{ changes: number }>
}
type PutMedia = (
  storageKey: string,
  body: Uint8Array,
  mimeType: string
) => Promise<void>
type StoredMedia = { id: string; storageKey: string }
type SeedExtensionsResult = {
  settings: string[]
  entries: string[]
  bylines: string[]
  failed: string[]
}

const extensions: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/svg+xml": ".svg",
}

const isSeedMedia = (value: unknown): value is SeedMedia =>
  typeof value === "object" && value !== null && "$media" in value

const hasSeedMedia = (value: unknown): boolean =>
  isSeedMedia(value) ||
  (typeof value === "object" &&
    value !== null &&
    Object.values(value).some(hasSeedMedia))

const replaceSeedMedia = async (
  value: unknown,
  store: (media: SeedMedia["$media"]) => Promise<unknown>
): Promise<unknown> => {
  if (isSeedMedia(value)) return store(value.$media)
  if (typeof value !== "object" || value === null) return value
  if (Array.isArray(value))
    return Promise.all(value.map(item => replaceSeedMedia(item, store)))
  const entries = await Promise.all(
    Object.entries(value).map(async ([key, item]) => [
      key,
      await replaceSeedMedia(item, store),
    ])
  )
  return Object.fromEntries(entries)
}

const dimensions = async (body: Uint8Array, mimeType: string) => {
  if (!mimeType.startsWith("image/") || mimeType === "image/svg+xml") return {}
  const { width, height } = await new Bun.Image(body).metadata()
  return { width, height }
}

const applySeedExtensions = async ({
  seed,
  db,
  putMedia,
  reuseMedia,
}: {
  seed: Seed
  db: SeedDb
  putMedia: PutMedia
  reuseMedia?: (url: string) => Promise<StoredMedia | undefined>
}): Promise<SeedExtensionsResult> => {
  const result: SeedExtensionsResult = {
    settings: [],
    entries: [],
    bylines: [],
    failed: [],
  }
  const downloads = new Map<string, Promise<StoredMedia>>()
  const download = async ({
    url,
    filename,
    alt,
  }: SeedMedia["$media"]): Promise<StoredMedia> => {
    const existing = await reuseMedia?.(url)
    if (existing) return existing
    const response = await fetch(url).catch(() => undefined)
    if (!response?.ok) throw new Error(url)
    const mimeType =
      response.headers.get("content-type")?.split(";")[0] ??
      "application/octet-stream"
    const body = new Uint8Array(await response.arrayBuffer())
    const id = Bun.randomUUIDv7()
    const storageKey = `${id}${extensions[mimeType] ?? extname(new URL(url).pathname)}`
    const { width, height } = await dimensions(body, mimeType)
    await putMedia(storageKey, body, mimeType)
    await db.run(
      "INSERT INTO media (id, filename, mime_type, size, width, height, alt, storage_key, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?)",
      [
        id,
        filename ?? storageKey,
        mimeType,
        body.length,
        width ?? null,
        height ?? null,
        alt ?? null,
        storageKey,
        new Date().toISOString(),
      ]
    )
    return { id, storageKey }
  }

  // One media row per URL per run, even when settings and entries share it.
  const store = (media: SeedMedia["$media"]) => {
    const pending = downloads.get(media.url) ?? download(media)
    downloads.set(media.url, pending)
    return pending
  }

  const seedSetting = async (key: string, value: unknown) => {
    if (!hasSeedMedia(value)) return
    const name = `site:${key}`
    const row = await db.get<{ value: string }>(
      "SELECT value FROM options WHERE name = ?",
      [name]
    )
    const stored: unknown = row && JSON.parse(row.value)
    if (!hasSeedMedia(stored)) return
    try {
      const resolved = await replaceSeedMedia(stored, async media => {
        const { id } = await store(media)
        return media.alt ? { mediaId: id, alt: media.alt } : { mediaId: id }
      })
      await db.run(
        "UPDATE options SET value = ?, revision = ? WHERE name = ?",
        [JSON.stringify(resolved), crypto.randomUUID(), name]
      )
      result.settings.push(key)
    } catch (error) {
      result.failed.push(error instanceof Error ? error.message : String(error))
    }
  }

  const seedEntry = async (collection: string, entry: SeedEntry) => {
    if (!entry.seo || !entry.slug) return
    const entryLocale = entry.locale ?? seed.defaultLocale ?? "en"
    const content = await db.get<{ id: string }>(
      `SELECT id FROM "ec_${collection}" WHERE slug = ? AND locale = ? AND deleted_at IS NULL`,
      [entry.slug, entryLocale]
    )
    if (!content) return
    const existing = await db.get<{ content_id: string }>(
      "SELECT content_id FROM _emdash_seo WHERE collection = ? AND content_id = ?",
      [collection, content.id]
    )
    if (existing) return
    const { title, description, image, canonical, noIndex } = entry.seo
    try {
      const media = image && (await store(image.$media))
      const now = new Date().toISOString()
      await db.run(
        "INSERT INTO _emdash_seo (collection, content_id, seo_title, seo_description, seo_image, seo_canonical, seo_no_index, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          collection,
          content.id,
          title ?? null,
          description ?? null,
          media ? `/_emdash/api/media/file/${media.storageKey}` : null,
          canonical ?? null,
          noIndex ? 1 : 0,
          now,
          now,
        ]
      )
      result.entries.push(`${collection}/${entry.slug}`)
    } catch (error) {
      result.failed.push(error instanceof Error ? error.message : String(error))
    }
  }

  const seedBylineFields = async (fields: SeedBylineField[]) => {
    // Mark version dirty before mutations.
    await db.run(
      "INSERT INTO options (name, value) VALUES ('byline_fields_version', '1') ON CONFLICT(name) DO UPDATE SET value = CASE WHEN CAST(options.value AS INTEGER) % 2 = 0 THEN CAST(CAST(options.value AS INTEGER) + 1 AS TEXT) ELSE options.value END",
      []
    )

    const now = new Date().toISOString()
    for (const [index, field] of fields.entries()) {
      // oxlint-disable-next-line no-await-in-loop -- sequential keeps sort order stable
      await db.run(
        "INSERT INTO _emdash_byline_fields (id, slug, label, type, required, translatable, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (slug) DO NOTHING",
        [
          Bun.randomUUIDv7(),
          field.slug,
          field.label,
          field.type,
          field.required ? 1 : 0,
          field.translatable === false ? 0 : 1,
          index,
          now,
          now,
        ]
      )
    }

    // Mark version clean after mutations.
    await db.run(
      "INSERT INTO options (name, value) VALUES ('byline_fields_version', '2') ON CONFLICT(name) DO UPDATE SET value = CASE WHEN CAST(options.value AS INTEGER) % 2 = 0 THEN CAST(CAST(options.value AS INTEGER) + 2 AS TEXT) ELSE CAST(CAST(options.value AS INTEGER) + 1 AS TEXT) END",
      []
    )
  }

  // Only the default-locale row: other translations keep their own values;
  // non-translatable values are group-shared and reach them anyway.
  const seedByline = async ({
    slug,
    avatarMedia,
    customFields,
  }: SeedByline) => {
    const rows = await db.all<{
      id: string
      avatar_media_id: string | null
      translation_group: string | null
    }>(
      "SELECT id, avatar_media_id, translation_group FROM _emdash_bylines WHERE slug = ? AND locale = ?",
      [slug, seed.defaultLocale ?? "en"]
    )
    let changed = false
    const now = new Date().toISOString()
    for (const row of rows) {
      if (avatarMedia && !row.avatar_media_id) {
        try {
          // oxlint-disable-next-line no-await-in-loop -- one download per URL, cached
          const { id } = await store(avatarMedia.$media)
          // oxlint-disable-next-line eslint/no-await-in-loop -- database update must complete sequentially
          await db.run(
            "UPDATE _emdash_bylines SET avatar_media_id = ?, updated_at = ? WHERE id = ?",
            [id, now, row.id]
          )
          changed = true
        } catch (error) {
          result.failed.push(
            error instanceof Error ? error.message : String(error)
          )
        }
      }
      for (const [fieldSlug, value] of Object.entries(customFields ?? {})) {
        // oxlint-disable-next-line no-await-in-loop -- sequential keeps result order stable
        const field = await db.get<{ id: string; translatable: number }>(
          "SELECT id, translatable FROM _emdash_byline_fields WHERE slug = ?",
          [fieldSlug]
        )
        if (!field) throw new Error(`Unknown byline field "${fieldSlug}"`)
        const [table, key, owner] = field.translatable
          ? ["_emdash_byline_field_values", "byline_id", row.id]
          : [
              "_emdash_byline_field_group_values",
              "translation_group",
              row.translation_group ?? row.id,
            ]
        // oxlint-disable-next-line no-await-in-loop -- sequential keeps result order stable
        const inserted = await db.run(
          `INSERT INTO ${table} (${key}, field_id, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING`,
          [owner, field.id, JSON.stringify(value), now, now]
        )
        if (inserted.changes > 0) changed = true
      }
    }
    if (changed) result.bylines.push(slug)
  }

  for (const [key, value] of Object.entries(seed.settings ?? {})) {
    // oxlint-disable-next-line no-await-in-loop -- sequential keeps result order stable
    await seedSetting(key, value)
  }
  for (const [collection, entries] of Object.entries(seed.content ?? {})) {
    for (const entry of entries) {
      // oxlint-disable-next-line no-await-in-loop -- sequential keeps result order stable
      await seedEntry(collection, entry)
    }
  }
  await seedBylineFields(seed.bylineFields ?? [])
  for (const byline of seed.bylines ?? []) {
    // oxlint-disable-next-line no-await-in-loop -- sequential keeps result order stable
    await seedByline(byline)
  }
  return result
}

const seedExtensions = async ({
  seedPath,
  databasePath,
  uploadsDir,
}: Paths): Promise<SeedExtensionsResult> => {
  const seed = JSON.parse(await readFile(seedPath, "utf-8")) as Seed
  const sqlite = new Database(databasePath)
  const db: SeedDb = {
    get: async <T>(sql: string, params: unknown[]) =>
      (sqlite.query(sql).get(...(params as never[])) ?? undefined) as
        | T
        | undefined,
    all: async <T>(sql: string, params: unknown[]) =>
      sqlite.query(sql).all(...(params as never[])) as T[],
    run: async (sql, params) => ({
      changes: sqlite.query(sql).run(...(params as never[])).changes,
    }),
  }
  try {
    return await applySeedExtensions({
      seed,
      db,
      putMedia: (storageKey, body) =>
        writeFile(join(uploadsDir, storageKey), body),
    })
  } finally {
    sqlite.close()
  }
}

if (import.meta.main) {
  const { settings, entries, bylines, failed } = await seedExtensions({
    seedPath: "seed/seed.json",
    databasePath: ".data/emdash.db",
    uploadsDir: ".data/uploads",
  })
  console.log(`Settings media resolved: ${settings.join(", ") || "none"}`)
  console.log(`SEO panels seeded: ${entries.join(", ") || "none"}`)
  console.log(`Bylines updated: ${bylines.join(", ") || "none"}`)
  for (const url of failed) console.warn(`Media download failed: ${url}`)
}

export {
  applySeedExtensions,
  seedExtensions,
  type PutMedia,
  type Seed,
  type SeedDb,
  type SeedExtensionsResult,
}
