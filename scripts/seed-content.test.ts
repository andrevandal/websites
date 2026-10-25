import { afterEach, describe, expect, spyOn, test } from "bun:test"
import { computeContentHash } from "emdash"
import type { Storage } from "emdash"
import type { SeedFile } from "emdash/seed"
import { sql } from "kysely"
import { createSeedDatabase, seedContent } from "./seed-content"
import type { SeedContentDeps } from "./seed-content"
import { createEmDashTestDb } from "./utils/emdash-test-db"
import type { EmDashTestDb } from "./utils/emdash-test-db"

const png = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
  ),
  char => char.charCodeAt(0)
)
const endpoint = "https://files.example.com"
const key = "images/social/home page.png"
const url = `${endpoint}/example/images/social/home%20page.png`
const media = (mediaUrl = url) => ({
  $media: { url: mediaUrl, filename: "home.png", alt: "Home card" },
})
const seed: SeedFile = {
  version: "1",
  meta: { name: "canonical-media" },
  settings: { title: "Canonical media" },
  collections: [
    {
      slug: "pages",
      label: "Pages",
      labelSingular: "Page",
      fields: [{ slug: "image", label: "Image", type: "image" }],
    },
  ],
  content: {
    pages: [
      {
        id: "home",
        slug: "home",
        status: "published",
        data: { image: media() },
      },
    ],
  },
}
const secrets = {
  S3_ENDPOINT: endpoint,
  S3_BUCKET: "example-staging",
  S3_ACCESS_KEY_ID: "test-key",
  S3_SECRET_ACCESS_KEY: "test-secret",
  TURSO_DATABASE_URL: "file:not-opened.db",
  TURSO_AUTH_TOKEN: "test-token",
}
const dbs: EmDashTestDb[] = []
const spies: { mockRestore: () => void }[] = []

afterEach(async () => {
  for (const spy of spies.splice(0)) spy.mockRestore()
  await Promise.all(dbs.splice(0).map(db => db.cleanup()))
})

const fixture = async (input: unknown = seed) => {
  const local = await createEmDashTestDb({ ...seed, content: undefined })
  dbs.push(local)
  let uploads = 0
  let opens = 0
  const requested: string[] = []
  const objects = new Map<string, { body: Uint8Array; contentType: string }>([
    [key, { body: png, contentType: "image/png; charset=binary" }],
  ])
  const storage: Storage = {
    upload: async () => {
      uploads++
      throw new Error("Unexpected upload")
    },
    download: async objectKey => {
      requested.push(objectKey)
      const object = objects.get(objectKey)
      if (!object) throw new Error(`File not found: ${objectKey}`)
      return {
        body: new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(object.body)
            controller.close()
          },
        }),
        contentType: object.contentType,
        size: object.body.length,
      }
    },
    delete: async () => {},
    exists: async objectKey => objects.has(objectKey),
    getPublicUrl: objectKey => `${endpoint}/example-staging/${objectKey}`,
    list: async () => ({ files: [] }),
    getSignedUploadUrl: async () => {
      throw new Error("Unexpected signed upload")
    },
  }
  const configs: Record<string, unknown>[] = []
  const deps: SeedContentDeps = {
    read: async () => JSON.stringify(input),
    createStorage: async config => {
      configs.push(config)
      return storage
    },
    openDatabase: async () => {
      opens++
      return createSeedDatabase({ url: `file:${local.databasePath}` })
    },
  }
  const options = {
    siteDir: "/repo/websites/example",
    sourceBucket: "example",
    secrets,
  }
  const query = async () => {
    const db = await createSeedDatabase({ url: `file:${local.databasePath}` })
    try {
      return await db.selectFrom("media").selectAll().execute()
    } finally {
      await db.destroy()
    }
  }
  return {
    local,
    deps,
    options,
    storage,
    configs,
    requested,
    objects,
    query,
    uploads: () => uploads,
    opens: () => opens,
  }
}

const mockMediaFetch = (body = png, status = 200) => {
  const calls: string[] = []
  const fetchMedia = Object.assign(
    async (input: RequestInfo | URL) => {
      const requestUrl = input instanceof Request ? input.url : String(input)
      calls.push(requestUrl)
      if (requestUrl.startsWith("https://cloudflare-dns.com/")) {
        return Response.json({
          Status: 0,
          Answer: [{ type: 1, data: "93.184.216.34" }],
        })
      }
      return new Response(body, {
        status,
        headers: { "content-type": "image/png" },
      })
    },
    { preconnect: globalThis.fetch.preconnect }
  )
  const mock = spyOn(globalThis, "fetch").mockImplementation(fetchMedia)
  spies.push(mock)
  return calls
}

describe("seed-content", () => {
  test("registers canonical keys with EmDash's hash and applies real content without uploads", async () => {
    const f = await fixture()
    const fetched = mockMediaFetch()
    const result = await seedContent(f.options, f.deps)
    expect(result.registered).toBe(1)
    expect(result.alreadyRegistered).toBe(0)
    expect(result.media.created).toBe(0)
    expect(result.media.skipped).toBe(1)
    expect(result.content.created).toBe(1)
    expect(f.uploads()).toBe(0)
    expect(fetched).toContain(url)
    expect(f.configs[0]).toMatchObject({ bucket: "example-staging" })
    const [row] = await f.query()
    expect(row).toMatchObject({
      storage_key: key,
      filename: "home.png",
      mime_type: "image/png",
      alt: "Home card",
      width: 1,
      height: 1,
      size: png.length,
      status: "ready",
      content_hash: await computeContentHash(png),
    })
    const db = await createSeedDatabase({ url: `file:${f.local.databasePath}` })
    try {
      const { rows } = await sql`SELECT * FROM ec_pages`.execute(db)
      expect(JSON.stringify(rows)).toContain(key)
    } finally {
      await db.destroy()
    }
  })

  test("a rerun registers nothing and preserves existing media", async () => {
    const f = await fixture()
    mockMediaFetch()
    await seedContent(f.options, f.deps)
    const before = await f.query()
    const result = await seedContent(f.options, f.deps)
    expect(result.registered).toBe(0)
    expect(result.alreadyRegistered).toBe(1)
    expect(result.media.created).toBe(0)
    expect(result.content.skipped).toBe(1)
    expect(await f.query()).toEqual(before)
    expect(f.uploads()).toBe(0)
  })

  test.each([false, true])(
    "resolves canonical media extensions and preserves them on rerun (preRegistered=%s)",
    async preRegistered => {
      const extended = {
        ...seed,
        defaultLocale: "pt-BR",
        settings: {
          title: "Canonical media",
          seo: { defaultOgImage: media() },
        },
        bylineFields: [
          { slug: "role", label: "Role", type: "string" },
          {
            slug: "website",
            label: "Website",
            type: "url",
            translatable: false,
          },
        ],
        bylines: [
          {
            id: "author",
            slug: "author",
            displayName: "Author",
            avatarMedia: media(),
            customFields: { role: "Designer", website: "https://example.com/" },
          },
        ],
        content: {
          pages: [
            {
              ...seed.content!.pages![0],
              seo: { title: "Home SEO", image: media() },
            },
          ],
        },
      }
      const f = await fixture(extended)
      if (preRegistered) {
        const db = await createSeedDatabase({
          url: `file:${f.local.databasePath}`,
        })
        try {
          await sql`INSERT INTO media (id, filename, mime_type, size, storage_key, content_hash, status) VALUES ('existing-canonical', 'existing.png', 'image/png', ${png.length}, ${key}, ${await computeContentHash(png)}, 'ready')`.execute(
            db
          )
        } finally {
          await db.destroy()
        }
      }
      const fetched = mockMediaFetch()
      const result = await seedContent(f.options, f.deps)
      expect(result.registered).toBe(preRegistered ? 0 : 1)
      expect(result.alreadyRegistered).toBe(preRegistered ? 1 : 0)
      expect(result.extensions).toEqual({
        settings: ["seo"],
        entries: ["pages/home"],
        bylines: ["author"],
        failed: [],
      })
      expect(fetched.filter(request => request === url)).toHaveLength(1)
      expect(f.uploads()).toBe(0)
      const [row] = await f.query()
      if (preRegistered) expect(row!.id).toBe("existing-canonical")
      const db = await createSeedDatabase({
        url: `file:${f.local.databasePath}`,
      })
      try {
        const setting = await db
          .selectFrom("options")
          .select("value")
          .where("name", "=", "site:seo")
          .executeTakeFirstOrThrow()
        expect(JSON.parse(setting.value)).toEqual({
          defaultOgImage: { mediaId: row!.id, alt: "Home card" },
        })
        expect(
          (await sql`SELECT seo_title, seo_image FROM _emdash_seo`.execute(db))
            .rows
        ).toEqual([
          {
            seo_title: "Home SEO",
            seo_image: `/_emdash/api/media/file/${key}`,
          },
        ])
        expect(
          (
            await sql`SELECT locale, avatar_media_id FROM _emdash_bylines WHERE slug = 'author'`.execute(
              db
            )
          ).rows
        ).toEqual([{ locale: "pt-BR", avatar_media_id: row!.id }])
        expect(
          (await sql`SELECT value FROM _emdash_byline_field_values`.execute(db))
            .rows
        ).toEqual([{ value: '"Designer"' }])
        expect(
          (
            await sql`SELECT value FROM _emdash_byline_field_group_values`.execute(
              db
            )
          ).rows
        ).toEqual([{ value: '"https://example.com/"' }])
        const snapshot = async () => [
          await db
            .selectFrom("options")
            .selectAll()
            .where("name", "=", "site:seo")
            .execute(),
          (await sql`SELECT * FROM _emdash_seo`.execute(db)).rows,
          (await sql`SELECT * FROM _emdash_bylines`.execute(db)).rows,
          (
            await sql`SELECT * FROM _emdash_byline_fields ORDER BY slug`.execute(
              db
            )
          ).rows,
          (await sql`SELECT * FROM _emdash_byline_field_values`.execute(db))
            .rows,
          (
            await sql`SELECT * FROM _emdash_byline_field_group_values`.execute(
              db
            )
          ).rows,
        ]
        const before = await snapshot()
        const rerun = await seedContent(f.options, f.deps)
        expect(rerun.registered).toBe(0)
        expect(rerun.extensions).toEqual({
          settings: [],
          entries: [],
          bylines: [],
          failed: [],
        })
        expect(await snapshot()).toEqual(before)
        expect(await f.query()).toEqual([row!])
        expect(f.uploads()).toBe(0)
      } finally {
        await db.destroy()
      }
    }
  )

  test("an extension failure rolls back canonical rows, settings and content", async () => {
    const f = await fixture({
      ...seed,
      defaultLocale: "pt-BR",
      bylineFields: [{ slug: "role", label: "Role", type: "string" }],
      bylines: [
        {
          id: "author",
          slug: "author",
          displayName: "Author",
          avatarMedia: media(),
          customFields: { role: "Designer" },
        },
      ],
      settings: { title: "Canonical media", seo: { defaultOgImage: media() } },
      content: {
        pages: [
          {
            ...seed.content!.pages![0],
            seo: { title: "Home SEO", image: media() },
          },
        ],
      },
    })
    mockMediaFetch()
    const db = await createSeedDatabase({ url: `file:${f.local.databasePath}` })
    try {
      await sql`CREATE TRIGGER fail_seo BEFORE INSERT ON _emdash_seo BEGIN SELECT RAISE(ABORT, 'extension failure'); END`.execute(
        db
      )
      await expect(seedContent(f.options, f.deps)).rejects.toThrow("extensions")
      expect(await f.query()).toEqual([])
      expect((await sql`SELECT * FROM ec_pages`.execute(db)).rows).toEqual([])
      expect(
        (await sql`SELECT * FROM _emdash_bylines`.execute(db)).rows
      ).toEqual([])
      expect(
        (await sql`SELECT * FROM _emdash_byline_fields`.execute(db)).rows
      ).toEqual([])
      expect(
        await db
          .selectFrom("options")
          .selectAll()
          .where("name", "=", "site:seo")
          .execute()
      ).toEqual([])
      expect(f.uploads()).toBe(0)
    } finally {
      await db.destroy()
    }
  })

  test("extension seeding does not relabel a pre-existing English byline", async () => {
    const f = await fixture({
      ...seed,
      defaultLocale: "pt-BR",
      bylines: [
        {
          id: "author",
          slug: "author",
          displayName: "Author",
          avatarMedia: media(),
        },
      ],
    })
    mockMediaFetch()
    const db = await createSeedDatabase({ url: `file:${f.local.databasePath}` })
    try {
      await sql`INSERT INTO _emdash_bylines (id, slug, display_name, locale, translation_group) VALUES ('existing-author', 'author', 'Editor', 'en', 'existing-author')`.execute(
        db
      )
      const before = (await sql`SELECT * FROM _emdash_bylines`.execute(db)).rows
      await seedContent(f.options, f.deps)
      expect(
        (await sql`SELECT * FROM _emdash_bylines`.execute(db)).rows
      ).toEqual(before)
    } finally {
      await db.destroy()
    }
  })

  test("dry run reads all distinct nested references and writes nothing", async () => {
    const nested = {
      ...seed,
      settings: { title: "Canonical media", seo: { defaultOgImage: media() } },
      bylines: [{ avatarMedia: media(`${endpoint}/example/avatar.svg`) }],
      content: {
        pages: [{ seo: { image: media(`${endpoint}/example/seo.svg`) } }],
      },
    }
    const f = await fixture(nested)
    for (const objectKey of ["avatar.svg", "seo.svg"]) {
      f.objects.set(objectKey, {
        body: new TextEncoder().encode("<svg/>"),
        contentType: "image/svg+xml",
      })
    }
    const result = await seedContent({ ...f.options, dryRun: true }, f.deps)
    expect(result.keys).toEqual([key, "seo.svg", "avatar.svg"])
    expect(f.requested).toEqual([key, "seo.svg", "avatar.svg"])
    expect(f.opens()).toBe(0)
    expect(await f.query()).toEqual([])
    expect(f.uploads()).toBe(0)
  })

  test.each([false, true])(
    "all missing keys fail before opening the database (dryRun=%s)",
    async dryRun => {
      const f = await fixture({
        settings: [
          media(),
          media(`${endpoint}/example/missing-one.png`),
          media(`${endpoint}/example/missing-two.png`),
        ],
      })
      await expect(
        seedContent({ ...f.options, dryRun }, f.deps)
      ).rejects.toThrow("missing-one.png\nmissing-two.png")
      expect(f.opens()).toBe(0)
      expect(await f.query()).toEqual([])
    }
  )

  test.each([
    "https://other.example.com/example/image.png",
    `${endpoint}/wrong-bucket/image.png`,
    `${endpoint}/example/`,
    `${endpoint}/example/bad%ZZ.png`,
    `${endpoint}/example/a%2F..%2F..%2Fother/secret.png`,
  ])("rejects an invalid origin or bucket URL: %s", async invalid => {
    const f = await fixture({ settings: { image: media(invalid) } })
    await expect(seedContent(f.options, f.deps)).rejects.toThrow(invalid)
    expect(f.requested).toEqual([])
    expect(f.opens()).toBe(0)
    expect(await f.query()).toEqual([])
  })

  test("uses the configured production bucket, not a derived name", async () => {
    const f = await fixture()
    await seedContent(
      {
        ...f.options,
        dryRun: true,
        secrets: { ...secrets, S3_BUCKET: "example" },
      },
      f.deps
    )
    expect(f.configs[0]).toMatchObject({ bucket: "example" })
  })

  test("uses basename and extension MIME when seed filename and object MIME are absent", async () => {
    const f = await fixture({
      ...seed,
      content: {
        pages: [
          { id: "home", slug: "home", data: { image: { $media: { url } } } },
        ],
      },
    })
    f.objects.set(key, { body: png, contentType: "" })
    mockMediaFetch()
    await seedContent(f.options, f.deps)
    expect((await f.query())[0]).toMatchObject({
      filename: "home page.png",
      mime_type: "image/png",
      alt: null,
    })
  })

  test("existing trashed content is skipped without treating its warning as media failure", async () => {
    const f = await fixture()
    mockMediaFetch()
    await seedContent(f.options, f.deps)
    const db = await createSeedDatabase({ url: `file:${f.local.databasePath}` })
    try {
      await sql`UPDATE ec_pages SET deleted_at = ${"2026-01-01T00:00:00.000Z"} WHERE slug = ${"home"}`.execute(
        db
      )
    } finally {
      await db.destroy()
    }
    const result = await seedContent(f.options, f.deps)
    expect(result.alreadyRegistered).toBe(1)
    expect(result.content.skipped).toBe(1)
    expect(result.registered).toBe(0)
  })

  test("reports a guarded upload even though EmDash catches its exception", async () => {
    const f = await fixture()
    mockMediaFetch(new TextEncoder().encode("different source bytes"))
    await expect(seedContent(f.options, f.deps)).rejects.toThrow("upload")
    expect(f.uploads()).toBe(0)
    expect(await f.query()).toEqual([])
  })

  test("a failed public download rolls back media and content so a retry can succeed", async () => {
    const f = await fixture()
    mockMediaFetch(png, 404)
    await expect(seedContent(f.options, f.deps)).rejects.toThrow("media")
    expect(await f.query()).toEqual([])
    spies.pop()?.mockRestore()
    mockMediaFetch()
    const retried = await seedContent(f.options, f.deps)
    expect(retried.registered).toBe(1)
    expect(retried.content.created).toBe(1)
    expect(f.uploads()).toBe(0)
  })
})
