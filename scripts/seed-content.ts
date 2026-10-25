import { basename, join } from "node:path"
import { computeContentHash, OptionsRepository } from "emdash"
import type { Database, DownloadResult, Storage } from "emdash"
import { createDialect } from "emdash/db/libsql"
import { applySeed } from "emdash/seed"
import type { SeedApplyResult, SeedFile } from "emdash/seed"
import { CompiledQuery, Kysely } from "kysely"
import { seedBylineLocaleCandidates } from "./fix-seed-byline-locale"
import { applySeedExtensions } from "./seed-extensions"
import type { Seed, SeedDb, SeedExtensionsResult } from "./seed-extensions"

type SeedContentDeps = {
  read: (path: string) => Promise<string>
  createStorage: (config: Record<string, unknown>) => Promise<Storage>
  openDatabase: (config: {
    url: string
    authToken?: string
  }) => Promise<Kysely<Database>>
}
type SeedMedia = { url: string; filename?: string; alt?: string }
type SeedContentResult = {
  keys: string[]
  registered: number
  alreadyRegistered: number
  media: SeedApplyResult["media"]
  content: SeedApplyResult["content"]
  extensions: SeedExtensionsResult
}

// Same public dialect and Kysely construction as EmDash's libSQL migration executor.
const createSeedDatabase = async (config: {
  url: string
  authToken?: string
}) => new Kysely<Database>({ dialect: createDialect(config) })

const collectMedia = (value: unknown, media = new Map<string, SeedMedia>()) => {
  if (typeof value !== "object" || value === null) return media
  if ("$media" in value) {
    const reference = value.$media as SeedMedia
    if (!reference || typeof reference.url !== "string")
      throw new Error("Seed $media must contain a URL")
    if (!media.has(reference.url)) media.set(reference.url, reference)
  }
  for (const child of Object.values(value)) collectMedia(child, media)
  return media
}

const bucketKey = (url: string, endpoint: string, sourceBucket: string) => {
  try {
    const parsed = new URL(url)
    const [, bucket, ...segments] = parsed.pathname.split("/")
    if (
      parsed.origin !== new URL(endpoint).origin ||
      parsed.username ||
      parsed.password ||
      bucket !== sourceBucket ||
      !segments.join("/")
    )
      return undefined
    const key = decodeURIComponent(segments.join("/"))
    if (key.split("/").some(segment => segment === "." || segment === ".."))
      return undefined
    return key
  } catch {
    return undefined
  }
}

const dimensions = async (body: Uint8Array, mimeType: string) => {
  if (!mimeType.startsWith("image/") || mimeType === "image/svg+xml") return {}
  const { width, height } = await new Bun.Image(body).metadata()
  return { width, height }
}

const seedContent = async (
  {
    siteDir,
    sourceBucket,
    secrets,
    dryRun = false,
  }: {
    siteDir: string
    sourceBucket: string
    secrets: Record<string, string>
    dryRun?: boolean
  },
  deps: SeedContentDeps
): Promise<SeedContentResult> => {
  const required = [
    "S3_ENDPOINT",
    "S3_BUCKET",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "TURSO_DATABASE_URL",
    "TURSO_AUTH_TOKEN",
  ]
  const missing = required.filter(name => !secrets[name])
  if (missing.length)
    throw new Error(`Missing stage secrets: ${missing.join(", ")}`)
  const seed = JSON.parse(
    await deps.read(join(siteDir, "seed/seed.json"))
  ) as SeedFile & Seed
  const references = [...collectMedia(seed).values()]
  const keyed = references.map(media => ({
    media,
    key: bucketKey(media.url, secrets["S3_ENDPOINT"]!, sourceBucket),
  }))
  const invalid = keyed.filter(item => item.key === undefined)
  if (invalid.length) {
    throw new Error(
      `Invalid seed media URLs (expected endpoint origin and source bucket ${sourceBucket}):\n${invalid.map(item => item.media.url).join("\n")}`
    )
  }

  const storage = await deps.createStorage({
    endpoint: secrets["S3_ENDPOINT"],
    bucket: secrets["S3_BUCKET"],
    accessKeyId: secrets["S3_ACCESS_KEY_ID"],
    secretAccessKey: secrets["S3_SECRET_ACCESS_KEY"],
    region: secrets["S3_REGION"] ?? "auto",
    ...(secrets["S3_PUBLIC_URL"]
      ? { publicUrl: secrets["S3_PUBLIC_URL"] }
      : {}),
  })
  const rows = new Map<
    string,
    {
      id: string
      filename: string
      mime_type: string
      size: number
      width: number | null
      height: number | null
      alt: string | null
      storage_key: string
      content_hash: string
      status: "ready"
      created_at: string
    }
  >()
  const unavailable: string[] = []
  /* eslint-disable no-await-in-loop -- Serial object processing bounds peak image memory. */
  for (const { media, key } of keyed) {
    // All URLs were validated before the first bucket read.
    const storageKey = key!
    if (rows.has(storageKey)) continue
    let object: DownloadResult
    let body: Uint8Array
    try {
      object = await storage.download(storageKey)
      body = new Uint8Array(await new Response(object.body).arrayBuffer())
    } catch {
      unavailable.push(storageKey)
      continue
    }
    const contentType = object.contentType?.split(";")[0]?.trim()
    const mimeType =
      contentType && contentType !== "application/octet-stream"
        ? contentType
        : Bun.file(storageKey).type || "application/octet-stream"
    const { width, height } = await dimensions(body, mimeType)
    rows.set(storageKey, {
      id: Bun.randomUUIDv7(),
      filename: media.filename ?? basename(storageKey),
      mime_type: mimeType,
      size: body.byteLength,
      width: width ?? null,
      height: height ?? null,
      alt: media.alt ?? null,
      storage_key: storageKey,
      content_hash: await computeContentHash(body),
      status: "ready",
      created_at: new Date().toISOString(),
    })
  }
  /* eslint-enable no-await-in-loop */
  if (unavailable.length) {
    throw new Error(
      `Missing or unreadable bucket objects:\n${unavailable.join("\n")}`
    )
  }

  const result: SeedContentResult = {
    keys: [...rows.keys()],
    registered: 0,
    alreadyRegistered: 0,
    media: { created: 0, skipped: 0 },
    content: { created: 0, skipped: 0, updated: 0 },
    extensions: { settings: [], entries: [], bylines: [], failed: [] },
  }
  if (dryRun) return result

  const connection = await deps.openDatabase({
    url: secrets["TURSO_DATABASE_URL"]!,
    authToken: secrets["TURSO_AUTH_TOKEN"]!,
  })
  try {
    return await connection.transaction().execute(async db => {
      const existingRows = result.keys.length
        ? await db
            .selectFrom("media")
            .select(["id", "storage_key", "content_hash", "status"])
            .where("storage_key", "in", result.keys)
            .execute()
        : []
      const existingByKey = new Map(
        existingRows.map(row => [row.storage_key, row])
      )
      const pending = []
      for (const row of rows.values()) {
        const existing = existingByKey.get(row.storage_key)
        if (!existing) pending.push(row)
        else {
          if (
            existing.status !== "ready" ||
            existing.content_hash !== row.content_hash
          ) {
            throw new Error(
              `Existing media is not reusable: ${row.storage_key}`
            )
          }
          result.alreadyRegistered++
        }
      }
      if (pending.length) await db.insertInto("media").values(pending).execute()
      result.registered = pending.length

      let attemptedUpload = false
      const guardedStorage: Storage = {
        upload: async () => {
          attemptedUpload = true
          throw new Error(
            "seed-content forbids media uploads; content hash reuse failed"
          )
        },
        download: storage.download.bind(storage),
        delete: storage.delete.bind(storage),
        exists: storage.exists.bind(storage),
        getPublicUrl: storage.getPublicUrl.bind(storage),
        list: storage.list.bind(storage),
        getSignedUploadUrl: storage.getSignedUploadUrl.bind(storage),
      }
      // Match the CLI's explicit seed ownership before applying content.
      if (seed.collections?.length)
        await new OptionsRepository(db).set("emdash:seed_complete", true)
      const repairLocale =
        seed.defaultLocale &&
        seed.defaultLocale !== "en" &&
        seed.bylines?.length
          ? seed.defaultLocale
          : undefined
      const existingBylineIds = repairLocale
        ? new Set(
            (await db.selectFrom("_emdash_bylines").select("id").execute()).map(
              row => row.id
            )
          )
        : new Set<string>()
      // The CLI is single-use. EmDash has no logger/error hook and swallows media failures.
      const originalLog = console.log
      const originalWarn = console.warn
      let failedMedia = false
      try {
        console.log = (message: unknown) => {
          if (typeof message === "string" && message.includes("Reused:"))
            originalLog(message)
        }
        console.warn = (message: unknown) => {
          if (
            typeof message === "string" &&
            (message.includes("Failed to download ") ||
              message.includes("Error processing $media ") ||
              message.includes("Skipping $media reference "))
          )
            failedMedia = true
        }
        const applied = await applySeed(db, seed, {
          includeContent: true,
          onConflict: "skip",
          storage: guardedStorage,
        })
        if (attemptedUpload || applied.media.created !== 0) {
          throw new Error(
            "seed-content attempted a media upload; no database changes were saved"
          )
        }
        if (failedMedia) {
          throw new Error(
            "seed-content could not reuse media; no database changes were saved"
          )
        }
        if (repairLocale) {
          const bylines = await db
            .selectFrom("_emdash_bylines")
            .select(["id", "slug", "locale", "translation_group", "user_id"])
            .execute()
          const candidates = seedBylineLocaleCandidates({
            bylines,
            existingIds: existingBylineIds,
            slugs: new Set(seed.bylines!.map(byline => byline.slug)),
            locale: repairLocale,
          })
          if (candidates.length) {
            await db
              .updateTable("_emdash_bylines")
              .set({ locale: repairLocale })
              .where(
                "id",
                "in",
                candidates.map(row => row.id)
              )
              .execute()
          }
        }
        const extensionDb: SeedDb = {
          get: async <T>(statement: string, params: unknown[]) =>
            (await db.executeQuery<T>(CompiledQuery.raw(statement, params)))
              .rows[0],
          all: async <T>(statement: string, params: unknown[]) =>
            (await db.executeQuery<T>(CompiledQuery.raw(statement, params)))
              .rows,
          run: async (statement, params) => ({
            changes: Number(
              (await db.executeQuery(CompiledQuery.raw(statement, params)))
                .numAffectedRows ?? 0
            ),
          }),
        }
        result.extensions = await applySeedExtensions({
          seed,
          db: extensionDb,
          reuseMedia: async url => {
            const key = bucketKey(url, secrets["S3_ENDPOINT"]!, sourceBucket)
            const row = key && rows.get(key)
            if (!row)
              throw new Error(`No registered media for extension URL: ${url}`)
            return {
              id: existingByKey.get(row.storage_key)?.id ?? row.id,
              storageKey: row.storage_key,
            }
          },
          putMedia: async (key, body, contentType) => {
            await guardedStorage.upload({ key, body, contentType })
          },
        })
        if (attemptedUpload || result.extensions.failed.length) {
          throw new Error(
            "seed-content extensions failed; no database changes were saved"
          )
        }
        result.media = applied.media
        result.content = applied.content
        return result
      } finally {
        console.log = originalLog
        console.warn = originalWarn
      }
    })
  } finally {
    await connection.destroy()
  }
}

export {
  createSeedDatabase,
  seedContent,
  type SeedContentDeps,
  type SeedContentResult,
}
