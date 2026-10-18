import { Database } from "bun:sqlite"
import type { SQLQueryBindings } from "bun:sqlite"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { afterEach, describe, expect, test } from "bun:test"
import { applySeedExtensions, seedExtensions } from "./seed-extensions"
import type { Seed, SeedDb } from "./seed-extensions"
import { createEmDashTestDb } from "./utils/emdash-test-db"
import type { EmDashTestDb } from "./utils/emdash-test-db"

const png = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
  ),
  char => char.charCodeAt(0)
)
const dbs: EmDashTestDb[] = []
const servers: Bun.Server<undefined>[] = []
const serve = () => {
  let downloads = 0
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      downloads++
      return new URL(request.url).pathname === "/missing.png"
        ? new Response("missing", { status: 404 })
        : new Response(png, { headers: { "content-type": "image/png" } })
    },
  })
  servers.push(server)
  return {
    url: new URL("/social.png", server.url).href,
    missing: new URL("/missing.png", server.url).href,
    downloads: () => downloads,
  }
}
const media = (url: string) => ({
  $media: { url, filename: "social.png", alt: "Social card" },
})
const baseSeed = {
  version: "1",
  meta: { name: "issue-197-extensions" },
  defaultLocale: "en",
  settings: { title: "Issue 197" },
  collections: ["pages", "posts"].map(slug => ({
    slug,
    label: slug,
    labelSingular: slug,
    fields: [{ slug: "title", label: "Title", type: "string" }],
  })),
}
const entry = (slug: string, locale?: string) => ({
  id: `${slug}-${locale ?? "default"}`,
  slug,
  ...(locale ? { locale } : {}),
  status: "published",
  data: { title: slug },
})
const author = { id: "author", slug: "author", displayName: "Author" }
const fields: NonNullable<Seed["bylineFields"]> = [
  { slug: "role", label: "Role", type: "string" },
  { slug: "bio", label: "Bio", type: "text" },
  { slug: "website", label: "Website", type: "url", translatable: false },
]

const fixture = async <T extends Seed>(seed: T) => {
  // The CLI initializes the real migrations and core rows, without media downloads.
  // Its seed copy must never replace the extension metadata under test.
  const cliSeed = {
    ...baseSeed,
    ...seed,
    bylines: seed.bylines?.map(byline => ({
      ...author,
      ...byline,
      avatarMedia: undefined,
      customFields: undefined,
    })),
    bylineFields: undefined,
    content:
      seed.content &&
      Object.fromEntries(
        Object.entries(seed.content).map(([collection, entries]) => [
          collection,
          entries.map(item => ({ ...item, seo: undefined })),
        ])
      ),
  }
  const db = await createEmDashTestDb(cliSeed)
  dbs.push(db)
  const paths = { ...db, seedPath: join(db.directory, "extensions-seed.json") }
  await Bun.write(paths.seedPath, JSON.stringify(seed))
  const sql = <R = Record<string, unknown>>(
    query: string,
    ...params: SQLQueryBindings[]
  ) => {
    const sqlite = new Database(db.databasePath)
    try {
      return sqlite.query(query).all(...params) as R[]
    } finally {
      sqlite.close()
    }
  }
  const exec = (query: string, ...params: SQLQueryBindings[]) => {
    const sqlite = new Database(db.databasePath)
    try {
      sqlite.query(query).run(...params)
    } finally {
      sqlite.close()
    }
  }
  return { ...paths, sql, exec, apply: () => seedExtensions(paths) }
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => server.stop(true)))
  await Promise.all(dbs.splice(0).map(db => db.cleanup()))
})

describe("seedExtensions media settings", () => {
  test("resolves nested $media into real media metadata and stored PNG bytes", async () => {
    const origin = serve()
    const t = await fixture({
      settings: { seo: { defaultOgImage: media(origin.url) } },
    })
    const result = await t.apply()
    expect(result.failed).toEqual([])
    expect(result.settings).toEqual(["seo"])
    const [row] = t.sql<{
      id: string
      storage_key: string
      width: number
      height: number
      alt: string
      size: number
      mime_type: string
    }>("SELECT * FROM media")
    expect(row).toMatchObject({
      width: 1,
      height: 1,
      alt: "Social card",
      size: png.length,
      mime_type: "image/png",
    })
    expect(
      new Uint8Array(await readFile(join(t.uploadsDir, row.storage_key)))
    ).toEqual(png)
    const [option] = t.sql<{ value: string }>(
      "SELECT value FROM options WHERE name = 'site:seo'"
    )
    expect(JSON.parse(option.value)).toEqual({
      defaultOgImage: { mediaId: row.id, alt: "Social card" },
    })
    expect(origin.downloads()).toBe(1)
  })

  test("keeps editor-resolved settings byte-identical and never downloads again", async () => {
    const origin = serve()
    const t = await fixture({
      settings: {
        seo: { defaultOgImage: media(origin.url) },
        plain: { label: "unchanged" },
      },
    })
    await t.apply()
    t.exec(
      "UPDATE options SET value = ?, revision = 'editor-revision' WHERE name = 'site:seo'",
      '{"defaultOgImage":{"mediaId":"editor-media"},"title":"Editor"}'
    )
    const before = JSON.stringify(
      t.sql(
        "SELECT * FROM options WHERE name IN ('site:seo', 'site:plain') ORDER BY name"
      )
    )
    expect((await t.apply()).settings).toEqual([])
    expect(
      JSON.stringify(
        t.sql(
          "SELECT * FROM options WHERE name IN ('site:seo', 'site:plain') ORDER BY name"
        )
      )
    ).toBe(before)
    expect(origin.downloads()).toBe(1)
  })

  test("reports failed downloads without throwing or changing unresolved settings", async () => {
    const origin = serve()
    const t = await fixture({
      settings: { seo: { defaultOgImage: media(origin.missing) } },
    })
    const before = JSON.stringify(
      t.sql("SELECT * FROM options WHERE name = 'site:seo'")
    )
    const result = await t.apply()
    expect(result.failed).toEqual([origin.missing])
    expect(result.settings).toEqual([])
    expect(t.sql("SELECT * FROM media")).toEqual([])
    expect(
      JSON.stringify(t.sql("SELECT * FROM options WHERE name = 'site:seo'"))
    ).toBe(before)
  })
})

describe("seedExtensions SEO", () => {
  test("same slug resolves by entry locale, default locale and collection", async () => {
    const t = await fixture({
      defaultLocale: "pt-BR",
      content: {
        pages: [
          {
            ...entry("home"),
            seo: { title: "Página", description: "Português" },
          },
          {
            ...entry("home", "en"),
            seo: { title: "Page", description: "English" },
          },
        ],
        posts: [
          {
            ...entry("home", "en"),
            seo: {
              title: "Post",
              canonical: "https://example.com/post/",
              noIndex: true,
            },
          },
        ],
      },
    })
    expect((await t.apply()).entries).toHaveLength(3)
    const rows = t.sql(`
      SELECT s.collection, e.locale, s.seo_title, s.seo_description, s.seo_canonical, s.seo_no_index
      FROM _emdash_seo s JOIN ec_pages e ON s.content_id = e.id WHERE s.collection = 'pages'
      UNION ALL
      SELECT s.collection, e.locale, s.seo_title, s.seo_description, s.seo_canonical, s.seo_no_index
      FROM _emdash_seo s JOIN ec_posts e ON s.content_id = e.id WHERE s.collection = 'posts'
      ORDER BY collection, locale
    `)
    expect(rows).toEqual([
      {
        collection: "pages",
        locale: "en",
        seo_title: "Page",
        seo_description: "English",
        seo_canonical: null,
        seo_no_index: 0,
      },
      {
        collection: "pages",
        locale: "pt-BR",
        seo_title: "Página",
        seo_description: "Português",
        seo_canonical: null,
        seo_no_index: 0,
      },
      {
        collection: "posts",
        locale: "en",
        seo_title: "Post",
        seo_description: null,
        seo_canonical: "https://example.com/post/",
        seo_no_index: 1,
      },
    ])
  })

  test("uses English when neither entry nor seed declares a locale", async () => {
    const t = await fixture({
      content: { pages: [{ ...entry("home"), seo: { title: "Home" } }] },
    })
    expect((await t.apply()).entries).toEqual(["pages/home"])
    expect(t.sql("SELECT seo_title FROM _emdash_seo")).toEqual([
      { seo_title: "Home" },
    ])
  })

  test("keeps every byte of an edited panel and the content row", async () => {
    const t = await fixture({
      content: { pages: [{ ...entry("about"), seo: { title: "Baseline" } }] },
    })
    await t.apply()
    t.exec(
      "UPDATE _emdash_seo SET seo_title = 'Editor', seo_description = 'Edited description', seo_image = '/editor.png', seo_canonical = 'https://example.com/editor/', seo_no_index = 1, updated_at = 'editor-date'"
    )
    t.exec("UPDATE ec_pages SET title = 'Edited content'")
    const panels = JSON.stringify(t.sql("SELECT * FROM _emdash_seo"))
    const content = JSON.stringify(t.sql("SELECT * FROM ec_pages"))
    expect((await t.apply()).entries).toEqual([])
    expect(JSON.stringify(t.sql("SELECT * FROM _emdash_seo"))).toBe(panels)
    expect(JSON.stringify(t.sql("SELECT * FROM ec_pages"))).toBe(content)
  })

  test("shares one download between settings and SEO and skips existing panels", async () => {
    const origin = serve()
    const t = await fixture({
      settings: { seo: { defaultOgImage: media(origin.url) } },
      content: {
        pages: [
          {
            ...entry("home"),
            seo: { title: "Home", image: media(origin.url) },
          },
        ],
      },
    })
    expect((await t.apply()).failed).toEqual([])
    const [row] = t.sql<{ storage_key: string }>(
      "SELECT storage_key FROM media"
    )
    expect(t.sql("SELECT seo_image FROM _emdash_seo")).toEqual([
      { seo_image: `/_emdash/api/media/file/${row.storage_key}` },
    ])
    expect(t.sql("SELECT id FROM media")).toHaveLength(1)
    expect((await t.apply()).entries).toEqual([])
    expect(origin.downloads()).toBe(1)
  })

  test("skips missing, deleted and SEO-less entries; reports image failure without a panel", async () => {
    const origin = serve()
    const seed = {
      content: {
        pages: [
          { ...entry("missing"), seo: { title: "Missing" } },
          { ...entry("deleted"), seo: { title: "Deleted" } },
          entry("plain"),
          { ...entry("failed"), seo: { image: media(origin.missing) } },
        ],
      },
    }
    const t = await fixture(seed)
    t.exec("DELETE FROM ec_pages WHERE slug = 'missing'")
    t.exec(
      "UPDATE ec_pages SET deleted_at = '2026-10-15' WHERE slug = 'deleted'"
    )
    const result = await t.apply()
    expect(result.entries).toEqual([])
    expect(result.failed).toEqual([origin.missing])
    expect(t.sql("SELECT * FROM _emdash_seo")).toEqual([])
  })
})

describe("seedExtensions bylines", () => {
  test("downloads an avatar and inserts custom values once without overwriting editor changes", async () => {
    const origin = serve()
    const t = await fixture({
      defaultLocale: "en",
      bylineFields: fields,
      bylines: [
        {
          ...author,
          avatarMedia: media(origin.url),
          customFields: { role: "Designer", website: "https://example.com/" },
        },
      ],
    })
    expect((await t.apply()).bylines).toEqual(["author"])
    const [row] = t.sql<{ avatar_media_id: string }>(
      "SELECT avatar_media_id FROM _emdash_bylines WHERE slug = 'author'"
    )
    expect(t.sql("SELECT id FROM media")).toEqual([{ id: row.avatar_media_id }])
    expect(t.sql("SELECT value FROM _emdash_byline_field_values")).toEqual([
      { value: '"Designer"' },
    ])
    expect(
      t.sql("SELECT value FROM _emdash_byline_field_group_values")
    ).toEqual([{ value: '"https://example.com/"' }])
    t.exec(
      "UPDATE _emdash_byline_field_values SET value = ?, updated_at = 'editor-date'",
      '"Editor role"'
    )
    t.exec(
      "UPDATE _emdash_byline_field_group_values SET value = ?, updated_at = 'editor-date'",
      '"https://editor.example/"'
    )
    t.exec(
      "UPDATE _emdash_byline_fields SET label = 'Editor label' WHERE slug = 'role'"
    )
    const snapshot = () =>
      JSON.stringify([
        t.sql("SELECT * FROM _emdash_bylines"),
        t.sql("SELECT * FROM _emdash_byline_fields ORDER BY slug"),
        t.sql("SELECT * FROM _emdash_byline_field_values"),
        t.sql("SELECT * FROM _emdash_byline_field_group_values"),
      ])
    const before = snapshot()
    expect((await t.apply()).bylines).toEqual([])
    expect(snapshot()).toBe(before)
    expect(origin.downloads()).toBe(1)
  })

  test("only default-locale fields are seeded; translations retain edited and absent values", async () => {
    const origin = serve()
    const t = await fixture({
      defaultLocale: "pt-BR",
      bylineFields: fields,
      bylines: [
        {
          ...author,
          avatarMedia: media(origin.url),
          customFields: {
            role: "Designer PT",
            bio: "Bio PT",
            website: "https://shared.example/",
          },
        },
      ],
    })
    // The CLI creates English bylines. Add the real default-locale translation explicitly.
    t.exec(
      "INSERT INTO _emdash_bylines (id, slug, display_name, locale, translation_group) SELECT 'author-pt', slug, 'Autor', 'pt-BR', translation_group FROM _emdash_bylines WHERE slug = 'author' AND locale = 'en'"
    )
    t.exec(
      "INSERT INTO _emdash_byline_fields (id, slug, label, type) VALUES ('role-field', 'role', 'Role', 'string')"
    )
    t.exec(
      "INSERT INTO _emdash_byline_field_values (byline_id, field_id, value) SELECT id, 'role-field', ? FROM _emdash_bylines WHERE locale = 'en'",
      '"Edited English role"'
    )
    const english = JSON.stringify(
      t.sql("SELECT * FROM _emdash_bylines WHERE locale = 'en'")
    )
    const englishValues = JSON.stringify(
      t.sql(
        "SELECT v.* FROM _emdash_byline_field_values v JOIN _emdash_bylines b ON b.id = v.byline_id WHERE b.locale = 'en'"
      )
    )
    expect((await t.apply()).bylines).toEqual(["author"])
    expect(
      JSON.stringify(t.sql("SELECT * FROM _emdash_bylines WHERE locale = 'en'"))
    ).toBe(english)
    expect(
      JSON.stringify(
        t.sql(
          "SELECT v.* FROM _emdash_byline_field_values v JOIN _emdash_bylines b ON b.id = v.byline_id WHERE b.locale = 'en'"
        )
      )
    ).toBe(englishValues)
    expect(
      t.sql(
        "SELECT b.locale, f.slug, v.value FROM _emdash_byline_field_values v JOIN _emdash_bylines b ON b.id = v.byline_id JOIN _emdash_byline_fields f ON f.id = v.field_id ORDER BY b.locale, f.slug"
      )
    ).toEqual([
      { locale: "en", slug: "role", value: '"Edited English role"' },
      { locale: "pt-BR", slug: "bio", value: '"Bio PT"' },
      { locale: "pt-BR", slug: "role", value: '"Designer PT"' },
    ])
    expect(
      t.sql(
        "SELECT b.locale, v.value FROM _emdash_bylines b JOIN _emdash_byline_field_group_values v ON v.translation_group = b.translation_group ORDER BY b.locale"
      )
    ).toEqual([
      { locale: "en", value: '"https://shared.example/"' },
      { locale: "pt-BR", value: '"https://shared.example/"' },
    ])
    expect(
      t.sql(
        "SELECT avatar_media_id FROM _emdash_bylines WHERE locale = 'pt-BR'"
      )[0].avatar_media_id
    ).toBeTruthy()
    const values = JSON.stringify(
      t.sql(
        "SELECT * FROM _emdash_byline_field_values ORDER BY byline_id, field_id"
      )
    )
    expect((await t.apply()).bylines).toEqual([])
    expect(
      JSON.stringify(
        t.sql(
          "SELECT * FROM _emdash_byline_field_values ORDER BY byline_id, field_id"
        )
      )
    ).toBe(values)
    expect(origin.downloads()).toBe(1)
  })

  test("skips a byline without a default-locale row instead of falling back to English", async () => {
    const origin = serve()
    const t = await fixture({
      defaultLocale: "pt-BR",
      bylineFields: fields,
      bylines: [
        {
          ...author,
          avatarMedia: media(origin.url),
          customFields: {
            role: "Wrong locale",
            website: "https://wrong.example/",
          },
        },
        { id: "other", slug: "other", displayName: "Unrelated" },
      ],
    })
    const before = JSON.stringify(
      t.sql("SELECT * FROM _emdash_bylines ORDER BY slug")
    )
    expect((await t.apply()).bylines).toEqual([])
    expect(
      JSON.stringify(t.sql("SELECT * FROM _emdash_bylines ORDER BY slug"))
    ).toBe(before)
    expect(t.sql("SELECT * FROM _emdash_byline_field_values")).toEqual([])
    expect(t.sql("SELECT * FROM _emdash_byline_field_group_values")).toEqual([])
    expect(origin.downloads()).toBe(0)
  })

  test("reports avatar failure without throwing or setting its media ID", async () => {
    const origin = serve()
    const t = await fixture({
      defaultLocale: "en",
      bylines: [{ ...author, avatarMedia: media(origin.missing) }],
    })
    const before = JSON.stringify(t.sql("SELECT * FROM _emdash_bylines"))
    const result = await t.apply()
    expect(result.failed).toEqual([origin.missing])
    expect(result.bylines).toEqual([])
    expect(JSON.stringify(t.sql("SELECT * FROM _emdash_bylines"))).toBe(before)
  })
})

describe("seedExtensions byline definition version", () => {
  test("uses dirty/clean parity and preserves definitions on repeated runs", async () => {
    const t = await fixture({ bylineFields: fields })
    t.exec("DELETE FROM options WHERE name = 'byline_fields_version'")
    await t.apply()
    expect(
      t.sql("SELECT value FROM options WHERE name = 'byline_fields_version'")
    ).toEqual([{ value: "2" }])
    const before = JSON.stringify(
      t.sql("SELECT * FROM _emdash_byline_fields ORDER BY slug")
    )
    await t.apply()
    expect(
      t.sql("SELECT value FROM options WHERE name = 'byline_fields_version'")
    ).toEqual([{ value: "4" }])
    expect(
      JSON.stringify(t.sql("SELECT * FROM _emdash_byline_fields ORDER BY slug"))
    ).toBe(before)
  })

  test("a failed definition insert stays dirty and a retry marks it clean", async () => {
    const t = await fixture({ bylineFields: fields })
    t.exec("DELETE FROM options WHERE name = 'byline_fields_version'")
    t.exec(
      "CREATE TRIGGER fail_field BEFORE INSERT ON _emdash_byline_fields WHEN NEW.slug = 'bio' BEGIN SELECT RAISE(ABORT, 'definition failure'); END"
    )
    await expect(t.apply()).rejects.toThrow("definition failure")
    expect(
      t.sql("SELECT value FROM options WHERE name = 'byline_fields_version'")
    ).toEqual([{ value: "1" }])
    expect(t.sql("SELECT slug FROM _emdash_byline_fields")).toEqual([
      { slug: "role" },
    ])
    t.exec("DROP TRIGGER fail_field")
    await t.apply()
    expect(
      t.sql("SELECT value FROM options WHERE name = 'byline_fields_version'")
    ).toEqual([{ value: "2" }])
    expect(
      t.sql("SELECT slug FROM _emdash_byline_fields ORDER BY slug")
    ).toEqual([{ slug: "bio" }, { slug: "role" }, { slug: "website" }])
  })

  test("retry cleans a dirty version even when all definitions were already inserted", async () => {
    const t = await fixture({ bylineFields: fields })
    t.exec("DELETE FROM options WHERE name = 'byline_fields_version'")
    t.exec(
      "CREATE TRIGGER fail_clean BEFORE UPDATE ON options WHEN NEW.name = 'byline_fields_version' AND CAST(NEW.value AS INTEGER) % 2 = 0 BEGIN SELECT RAISE(ABORT, 'clean failure'); END"
    )
    await expect(t.apply()).rejects.toThrow("clean failure")
    expect(
      t.sql("SELECT value FROM options WHERE name = 'byline_fields_version'")
    ).toEqual([{ value: "1" }])
    expect(t.sql("SELECT slug FROM _emdash_byline_fields")).toHaveLength(3)
    const before = JSON.stringify(
      t.sql("SELECT * FROM _emdash_byline_fields ORDER BY slug")
    )
    t.exec("DROP TRIGGER fail_clean")
    await t.apply()
    expect(
      t.sql("SELECT value FROM options WHERE name = 'byline_fields_version'")
    ).toEqual([{ value: "2" }])
    expect(
      JSON.stringify(t.sql("SELECT * FROM _emdash_byline_fields ORDER BY slug"))
    ).toBe(before)
  })

  test("applySeedExtensions accepts a real database adapter and persists uploaded media", async () => {
    const origin = serve()
    const seed = { settings: { seo: { defaultOgImage: media(origin.url) } } }
    const t = await fixture(seed)
    const sqlite = new Database(t.databasePath)
    const db: SeedDb = {
      get: async <T>(sql: string, params: unknown[]) =>
        (sqlite.query(sql).get(...(params as SQLQueryBindings[])) ??
          undefined) as T | undefined,
      all: async <T>(sql: string, params: unknown[]) =>
        sqlite.query(sql).all(...(params as SQLQueryBindings[])) as T[],
      run: async (sql, params) => ({
        changes: sqlite.query(sql).run(...(params as SQLQueryBindings[]))
          .changes,
      }),
    }
    const uploads: { key: string; body: Uint8Array; mimeType: string }[] = []
    try {
      const result = await applySeedExtensions({
        seed,
        db,
        putMedia: async (key, body, mimeType) => {
          uploads.push({ key, body, mimeType })
        },
      })
      expect(result.settings).toEqual(["seo"])
      expect(uploads).toHaveLength(1)
      expect(uploads[0]).toMatchObject({ body: png, mimeType: "image/png" })
      expect(t.sql("SELECT storage_key FROM media")).toEqual([
        { storage_key: uploads[0].key },
      ])
    } finally {
      sqlite.close()
    }
  })
})
