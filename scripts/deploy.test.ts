import { Database } from "bun:sqlite"
import type { SQLQueryBindings } from "bun:sqlite"
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import {
  cleanupPreview,
  deployPreview,
  digestDirectory,
  migrateStage,
  nodeFiles,
  parseStageSecrets,
  resolvePreviewUrl,
  setupPreview,
  stageWorkerName,
  versionDeploy,
  versionUpload,
} from "./deploy"
import type { DeployDeps, SetupDeps } from "./deploy"
import type { SeedDb } from "./seed-extensions"
import { createEmDashTestDb, seedEmDashDb } from "./utils/emdash-test-db"

const ACCOUNT_ID = "acct-1"
let previousAccountId: string | undefined

beforeEach(() => {
  previousAccountId = process.env["CLOUDFLARE_ACCOUNT_ID"]
  process.env["CLOUDFLARE_ACCOUNT_ID"] = ACCOUNT_ID
})

afterEach(() => {
  if (previousAccountId === undefined)
    delete process.env["CLOUDFLARE_ACCOUNT_ID"]
  else process.env["CLOUDFLARE_ACCOUNT_ID"] = previousAccountId
})

const GENERATED_CONFIG_PATH =
  "/repo/websites/transportugal/dist/server/wrangler.json"

const previewJson = (url: string) =>
  JSON.stringify({
    preview: { id: "p1", name: "pr-42", slug: "pr-42", urls: [url] },
    deployment: { id: "d1", urls: [] },
  })

const createDeps = (
  stdout = previewJson("https://pr-42-transportugal.account.workers.dev")
) => {
  const calls: string[][] = []
  const execOptions: { env?: Record<string, string> | undefined }[] = []
  // What `emdash migrate --status --json` reports for the target database.
  const migrationReport = {
    target: { fingerprint: "fp-1", label: "acct/db" },
    pending: [] as string[],
    unknownApplied: [] as string[],
  }
  const kv = new Map<string, { id: string; values: Map<string, string> }>()
  const d1 = new Map<string, { id: string; rows: string[] }>()
  const r2 = new Map<string, { name: string; objects: Map<string, string> }>()
  const previews = new Set<string>()
  let nextId = 1
  const originalConfig = {
    name: "transportugal",
    main: "entry.mjs",
    kv_namespaces: [{ binding: "SESSION", id: "production-session" }],
    d1_databases: [
      {
        binding: "DB",
        database_name: "production-cms",
        database_id: "production-db",
      },
    ],
    r2_buckets: [{ binding: "MEDIA", bucket_name: "production-media" }],
    observability: { enabled: true },
    vars: { STAGE: "production" },
  }
  const files: Record<string, string> = {
    [GENERATED_CONFIG_PATH]: JSON.stringify(originalConfig),
  }
  const deps: DeployDeps = {
    exec: async (args, options) => {
      calls.push(args)
      execOptions.push(options)
      if (args[0] === "emdash") {
        return {
          stdout: args.includes("--status")
            ? `Checking migrations...\n${JSON.stringify(migrationReport)}\n`
            : "{}",
          exitCode: 0,
        }
      }
      const name = `${args[args.indexOf("--worker-name") + 1]}:${args[args.indexOf("--name") + 1]}`
      if (args.includes("delete"))
        return { stdout: "", exitCode: previews.delete(name) ? 0 : 1 }

      previews.add(name)
      return { stdout, exitCode: 0 }
    },
    kv: {
      findOrCreate: async title => {
        const existing = kv.get(title)
        if (existing) return { id: existing.id, created: false }
        const resource = {
          id: `kv-${nextId++}`,
          values: new Map<string, string>(),
        }
        kv.set(title, resource)
        return { id: resource.id, created: true }
      },
      deleteByTitle: async title => kv.delete(title),
    },
    d1: {
      findOrCreate: async name => {
        const existing = d1.get(name)
        if (existing) return { id: existing.id, created: false }
        const resource = { id: `d1-${nextId++}`, rows: [] as string[] }
        d1.set(name, resource)
        return { id: resource.id, created: true }
      },
      deleteByName: async name => d1.delete(name),
    },
    r2: {
      findOrCreate: async name => {
        const existing = r2.get(name)
        if (existing) return { name: existing.name, created: false }
        r2.set(name, { name, objects: new Map<string, string>() })
        return { name, created: true }
      },
      deleteByName: async name => r2.delete(name),
    },
    files: {
      ...nodeFiles,
      read: async path => files[path] ?? "",
      write: async (path, content) => {
        files[path] = content
      },
    },
  }
  const writtenConfig = () => JSON.parse(files[GENERATED_CONFIG_PATH] ?? "{}")
  return {
    deps,
    calls,
    execOptions,
    migrationReport,
    kv,
    d1,
    r2,
    previews,
    writtenConfig,
    originalConfig,
  }
}

const target = {
  siteDir: "/repo/websites/transportugal",
  generatedConfigPath: GENERATED_CONFIG_PATH,
  worker: "transportugal",
}

describe("preview resources", () => {
  test.each(["pedrohenridesign", "brunabraz"])(
    "%s binds isolated native resources only under previews and reuses edited state",
    async worker => {
      const state = createDeps()
      const previewTarget = {
        ...target,
        worker,
        pr: 42,
        vars: { IMAGES_URL: "https://images.example" },
      }
      await deployPreview(previewTarget, state.deps)
      const first = state.writtenConfig()
      expect(first).toMatchObject(state.originalConfig)
      expect(first.previews).toEqual({
        vars: previewTarget.vars,
        kv_namespaces: [
          { binding: "SESSION", id: state.kv.get(`${worker}-pr-42`)!.id },
        ],
        d1_databases: [
          {
            binding: "DB",
            database_name: `${worker}-pr-42-cms`,
            database_id: state.d1.get(`${worker}-pr-42-cms`)!.id,
          },
        ],
        r2_buckets: [
          { binding: "MEDIA", bucket_name: `${worker}-pr-42-media` },
        ],
      })
      state.kv.get(`${worker}-pr-42`)!.values.set("session", "signed-in")
      state.d1.get(`${worker}-pr-42-cms`)!.rows.push("CMS edit")
      state.r2
        .get(`${worker}-pr-42-media`)!
        .objects.set("image.jpg", "uploaded bytes")
      await deployPreview(previewTarget, state.deps)
      expect(state.writtenConfig()).toEqual(first)
      expect(state.kv.get(`${worker}-pr-42`)!.values.get("session")).toBe(
        "signed-in"
      )
      expect(state.d1.get(`${worker}-pr-42-cms`)!.rows).toEqual(["CMS edit"])
      expect(
        state.r2.get(`${worker}-pr-42-media`)!.objects.get("image.jpg")
      ).toBe("uploaded bytes")
      expect(state.kv.size).toBe(1)
      expect(state.d1.size).toBe(1)
      expect(state.r2.size).toBe(1)
    }
  )

  test("Worker and PR identities isolate resources", async () => {
    const state = createDeps()
    const ids = new Set<string>()
    for (const worker of ["pedrohenridesign", "brunabraz"]) {
      for (const pr of [1, 2]) {
        await deployPreview({ ...target, worker, pr, vars: {} }, state.deps)
        ids.add(state.writtenConfig().previews.d1_databases[0].database_id)
      }
    }
    expect(ids.size).toBe(4)
    expect(state.kv.size).toBe(4)
    expect([...state.r2.keys()].sort()).toEqual([
      "brunabraz-pr-1-media",
      "brunabraz-pr-2-media",
      "pedrohenridesign-pr-1-media",
      "pedrohenridesign-pr-2-media",
    ])
  })

  test("generic previews stay KV-only with unchanged top-level config", async () => {
    const state = createDeps()
    const vars = { IMAGES_BASE_URL: "https://images.example.invalid" }
    expect(
      (await deployPreview({ ...target, pr: 42, vars }, state.deps)).url
    ).toBe("https://pr-42-transportugal.account.workers.dev")
    expect(state.writtenConfig()).toMatchObject(state.originalConfig)
    expect(state.writtenConfig().previews).toEqual({
      vars,
      kv_namespaces: [
        { binding: "SESSION", id: state.kv.get("transportugal-pr-42")!.id },
      ],
    })
    expect(state.d1.size).toBe(0)
    expect(state.r2.size).toBe(0)
    expect(state.previews.has("transportugal:pr-42")).toBe(true)
  })

  test.each(["pedrohenridesign", "brunabraz", "transportugal"])(
    "%s cleanup is exact and repeated cleanup reports absent resources",
    async worker => {
      const state = createDeps()
      for (const pr of [41, 42])
        await deployPreview({ ...target, worker, pr, vars: {} }, state.deps)

      state.kv.set(worker, { id: "prod-session", values: new Map() })
      state.d1.set(`${worker}-cms`, { id: "prod-db", rows: ["production"] })
      state.r2.set(`${worker}-media`, {
        name: `${worker}-media`,
        objects: new Map([["prod.jpg", "production"]]),
      })
      const selected = worker !== "transportugal"
      expect(
        await cleanupPreview({ ...target, worker, pr: 42 }, state.deps)
      ).toEqual({
        previewDeleted: true,
        kvDeleted: true,
        ...(selected ? { d1Deleted: true, r2Deleted: true } : {}),
      })
      expect(
        await cleanupPreview({ ...target, worker, pr: 42 }, state.deps)
      ).toEqual({
        previewDeleted: false,
        kvDeleted: false,
        ...(selected ? { d1Deleted: false, r2Deleted: false } : {}),
      })
      expect(state.previews.has(`${worker}:pr-41`)).toBe(true)
      expect(state.kv.has(`${worker}-pr-41`)).toBe(true)
      expect(state.kv.has(worker)).toBe(true)
      expect(state.d1.get(`${worker}-cms`)!.rows).toEqual(["production"])
      expect(state.r2.get(`${worker}-media`)!.objects.get("prod.jpg")).toBe(
        "production"
      )
      expect(state.d1.has(`${worker}-pr-42-cms`)).toBe(false)
      expect(state.r2.has(`${worker}-pr-42-media`)).toBe(false)
      if (selected) {
        expect(state.d1.has(`${worker}-pr-41-cms`)).toBe(true)
        expect(state.r2.has(`${worker}-pr-41-media`)).toBe(true)
      }
    }
  )

  test.each([undefined, 0, -1, 1.5, NaN, Infinity])(
    "invalid PR %p rejects before any dependency call",
    async pr => {
      let touched = false
      const unavailable = async (): Promise<never> => {
        touched = true
        throw new Error("dependency touched")
      }
      const deps: DeployDeps = {
        exec: unavailable,
        kv: { findOrCreate: unavailable, deleteByTitle: unavailable },
        d1: { findOrCreate: unavailable, deleteByName: unavailable },
        r2: { findOrCreate: unavailable, deleteByName: unavailable },
        files: {
          read: unavailable,
          write: unavailable,
          copyDir: unavailable,
          tempDir: unavailable,
        },
      }
      await expect(
        deployPreview(
          { ...target, worker: "pedrohenridesign", pr, vars: {} },
          deps
        )
      ).rejects.toThrow("--pr")
      await expect(
        cleanupPreview({ ...target, worker: "pedrohenridesign", pr }, deps)
      ).rejects.toThrow("--pr")
      expect(touched).toBe(false)
    }
  )
})

describe("core migrations in previews", () => {
  const pedro = { ...target, worker: "pedrohenridesign", pr: 42, vars: {} }

  test("pedrohenridesign applies pending migrations to the PR database, pinned to the reported fingerprint, before wrangler preview", async () => {
    const state = createDeps()
    state.migrationReport.pending = ["001_initial", "002_media_status"]

    const { databaseId, bucketName } = await deployPreview(pedro, state.deps)

    const databaseArgs = ["--d1", databaseId!, "--account-id", ACCOUNT_ID]
    expect(state.calls).toEqual([
      ["emdash", "migrate", "--status", "--json", ...databaseArgs],
      [
        "emdash",
        "migrate",
        "--json",
        "--expected-target-fingerprint",
        "fp-1",
        ...databaseArgs,
      ],
      [
        "wrangler",
        "preview",
        "--name",
        "pr-42",
        "--worker-name",
        "pedrohenridesign",
        "--json",
      ],
    ])
    expect(databaseId).toBe(state.d1.get("pedrohenridesign-pr-42-cms")!.id)
    expect(bucketName).toBe("pedrohenridesign-pr-42-media")
  })

  test("brunabraz migrates its PR database like pedrohenridesign", async () => {
    const state = createDeps()
    state.migrationReport.pending = ["001_initial"]

    await deployPreview({ ...pedro, worker: "brunabraz" }, state.deps)

    expect(state.calls.map(args => args.slice(0, 3).join(" "))).toEqual([
      "emdash migrate --status",
      "emdash migrate --json",
      "wrangler preview --name",
    ])
  })

  test("makes no apply call when nothing is pending", async () => {
    const state = createDeps()

    await deployPreview(pedro, state.deps)

    expect(state.calls.map(args => args.slice(0, 3).join(" "))).toEqual([
      "emdash migrate --status",
      "wrangler preview --name",
    ])
  })

  test("refuses a database with migrations unknown to the build and never deploys the preview", async () => {
    const state = createDeps()
    state.migrationReport.pending = ["002_media_status"]
    state.migrationReport.unknownApplied = ["999_from_the_future"]

    await expect(deployPreview(pedro, state.deps)).rejects.toThrow(
      "999_from_the_future"
    )

    expect(state.calls.map(args => args[0])).toEqual(["emdash"])
    expect(state.previews.size).toBe(0)
  })

  test("fails before touching the database when the account id is missing", async () => {
    const state = createDeps()
    delete process.env["CLOUDFLARE_ACCOUNT_ID"]

    await expect(deployPreview(pedro, state.deps)).rejects.toThrow(
      "CLOUDFLARE_ACCOUNT_ID is required"
    )

    expect(state.calls).toEqual([])
  })
})

describe("migrateStage", () => {
  const stageSecrets = {
    TURSO_DATABASE_URL: "libsql://pedro-staging.example.turso.io",
    TURSO_AUTH_TOKEN: "token-123",
  }
  const libsqlManifest = {
    version: 1,
    database: {
      executorEntrypoint: "emdash/internal/db/libsql-migrations",
      executorConfig: {
        url: "libsql://unset",
        authTokenEnv: "TURSO_AUTH_TOKEN",
      },
    },
  }

  const stageDeps = (migrations: string[]) => {
    const calls: {
      args: string[]
      env?: Record<string, string> | undefined
    }[] = []
    const { deps } = createVersionDeps()
    const migrateDeps: DeployDeps = {
      ...deps,
      exec: async (args, options) => {
        calls.push({ args, env: options.env })
        return {
          stdout: args.includes("--status")
            ? JSON.stringify({
                target: { fingerprint: "fp-turso", label: "turso/staging" },
                pending: migrations,
                unknownApplied: [],
              })
            : "{}",
          exitCode: 0,
        }
      },
    }
    return { calls, deps: migrateDeps }
  }

  const writeManifest = async (manifest: object) => {
    const directory = await mkdtemp(join(tmpdir(), "emdash-manifest-"))
    const manifestPath = join(directory, "migrations.json")
    await writeFile(manifestPath, JSON.stringify(manifest))
    return manifestPath
  }

  test("migrates through a manifest copy carrying the stage URL and leaves the build manifest untouched", async () => {
    const manifestPath = await writeManifest(libsqlManifest)
    const { calls, deps } = stageDeps(["001_initial"])

    const applied = await migrateStage(
      {
        siteDir: "/repo/websites/pedrohenridesign",
        manifestPath,
        secrets: stageSecrets,
      },
      deps
    )

    expect(applied).toEqual(["001_initial"])
    const tempManifestPath =
      calls[0]!.args[calls[0]!.args.indexOf("--manifest") + 1]!
    expect(tempManifestPath).not.toBe(manifestPath)
    expect(JSON.parse(await readFile(tempManifestPath, "utf-8"))).toEqual({
      ...libsqlManifest,
      database: {
        ...libsqlManifest.database,
        executorConfig: {
          url: stageSecrets.TURSO_DATABASE_URL,
          authTokenEnv: "TURSO_AUTH_TOKEN",
        },
      },
    })
    expect(JSON.parse(await readFile(manifestPath, "utf-8"))).toEqual(
      libsqlManifest
    )
    expect(calls.map(call => call.env)).toEqual([
      { TURSO_AUTH_TOKEN: "token-123" },
      { TURSO_AUTH_TOKEN: "token-123" },
    ])
    expect(calls[1]!.args).toContain("fp-turso")
  })

  test("rejects a D1 build manifest", async () => {
    const manifestPath = await writeManifest({
      database: {
        executorEntrypoint: "@emdash-cms/cloudflare/internal/db/d1-migrations",
        executorConfig: { binding: "DB" },
      },
    })
    const { calls, deps } = stageDeps([])

    await expect(
      migrateStage(
        {
          siteDir: "/repo/websites/pedrohenridesign",
          manifestPath,
          secrets: stageSecrets,
        },
        deps
      )
    ).rejects.toThrow("is not a libSQL build manifest")
    expect(calls).toEqual([])
  })

  test("requires both Turso secrets", async () => {
    const manifestPath = await writeManifest(libsqlManifest)
    const { calls, deps } = stageDeps([])

    await expect(
      migrateStage(
        {
          siteDir: "/repo/websites/pedrohenridesign",
          manifestPath,
          secrets: { TURSO_DATABASE_URL: stageSecrets.TURSO_DATABASE_URL },
        },
        deps
      )
    ).rejects.toThrow("TURSO_AUTH_TOKEN")
    expect(calls).toEqual([])
  })
})

describe("setupPreview", () => {
  const seedJson = JSON.stringify({
    defaultLocale: "pt-BR",
    settings: { title: "Pedro", tagline: "Design" },
    content: { pages: [{ slug: "inicio", seo: { title: "Inicio" } }] },
  })
  const preview = {
    siteDir: "/repo/websites/pedrohenridesign",
    url: "https://pr-42-pedrohenridesign.account.workers.dev",
    databaseId: "db-42",
    bucketName: "pedrohenridesign-pr-42-media",
    accessClientId: "client-id",
    accessClientSecret: "client-secret",
  }

  const setupDeps = (responses: Response[]) => {
    const requests: { url: string; init: RequestInit }[] = []
    const dbCalls: { sql: string; params: unknown[] }[] = []
    const { deps } = createVersionDeps()
    const seedDb: SeedDb = {
      get: async <T>(sql: string) => {
        dbCalls.push({ sql, params: [] })
        return (
          sql.includes('"ec_pages"') ? { id: "content-1" } : undefined
        ) as T | undefined
      },
      all: async () => [],
      run: async (sql, params) => {
        dbCalls.push({ sql, params })
        return { changes: 1 }
      },
    }
    const setup: SetupDeps = {
      ...deps,
      files: { ...nodeFiles, read: async () => seedJson },
      fetch: (async (url: string | URL | Request, init?: RequestInit) => {
        requests.push({ url: String(url), init: init ?? {} })
        return responses.shift()!
      }) as unknown as typeof fetch,
      seedDb: () => seedDb,
      putMedia: () => async () => {},
    }
    return { deps: setup, requests, dbCalls }
  }

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), { status })

  test("posts setup until the seed completes, then writes the extensions without relabeling bylines", async () => {
    const { deps, requests, dbCalls } = setupDeps([
      json({ success: true, data: { seedComplete: false } }),
      json({ success: true, data: { seedComplete: true } }),
    ])

    expect(await setupPreview(preview, deps)).toBe("configured")

    expect(requests).toHaveLength(2)
    for (const { url, init } of requests) {
      expect(url).toBe(`${preview.url}/_emdash/api/setup`)
      expect(init.headers).toMatchObject({
        "X-EmDash-Request": "1",
        "CF-Access-Client-Id": "client-id",
        "CF-Access-Client-Secret": "client-secret",
      })
      expect(JSON.parse(`${init.body}`)).toEqual({
        title: "Pedro",
        tagline: "Design",
        includeContent: true,
      })
    }
    expect(
      dbCalls.filter(call => call.sql.startsWith("INSERT INTO _emdash_seo"))
    ).toHaveLength(1)
    expect(
      dbCalls.find(call => call.sql.includes("UPDATE _emdash_bylines"))
    ).toBeUndefined()
  })

  test("on 409 retry, exits core setup loop but still runs extensions", async () => {
    const { deps, requests, dbCalls } = setupDeps([
      json({ success: true, data: { seedComplete: false } }),
      json({ success: true, data: { seedComplete: false } }),
      json({ error: { code: "ALREADY_CONFIGURED" } }, 409),
    ])

    expect(await setupPreview(preview, deps)).toBe("already-configured")

    // Only the requests before 409 should be made
    expect(requests).toHaveLength(3)
    // All requests should be to setup endpoint
    for (let i = 0; i < 3; i++)
      expect(requests[i]!.url).toBe(`${preview.url}/_emdash/api/setup`)

    // Extensions should have been called even though 409 was encountered
    expect(
      dbCalls.filter(call => call.sql.startsWith("INSERT INTO _emdash_seo"))
    ).toHaveLength(1)
    expect(
      dbCalls.find(call => call.sql.includes("UPDATE _emdash_bylines"))
    ).toBeUndefined()
  })

  test("fails with the status when setup errors", async () => {
    const { deps, dbCalls } = setupDeps([new Response("boom", { status: 500 })])

    await expect(setupPreview(preview, deps)).rejects.toThrow(
      "Preview setup failed (500): boom"
    )
    expect(dbCalls).toEqual([])
  })

  test("stops when Access redirects to login instead of accepting the token", async () => {
    const { deps, dbCalls } = setupDeps([
      new Response(null, {
        status: 302,
        headers: { location: "https://team.cloudflareaccess.com/login" },
      }),
    ])

    await expect(setupPreview(preview, deps)).rejects.toThrow(
      "Access did not accept the service token"
    )
    expect(dbCalls).toEqual([])
  })

  test("gives up when the seed never completes", async () => {
    const { deps, requests, dbCalls } = setupDeps(
      Array.from({ length: 25 }, () =>
        json({ success: true, data: { seedComplete: false } })
      )
    )

    await expect(setupPreview(preview, deps)).rejects.toThrow(
      "did not finish seeding after 20 requests"
    )
    expect(requests).toHaveLength(20)
    expect(dbCalls).toEqual([])
  })

  test("409 resumes failed media extensions without replacing editor data", async () => {
    const coreSeed = {
      version: "1",
      meta: { name: "issue197-setup" },
      defaultLocale: "en",
      settings: { title: "Pedro" },
      collections: [
        {
          slug: "posts",
          label: "Posts",
          labelSingular: "Post",
          fields: [{ slug: "title", label: "Title", type: "string" }],
        },
      ],
      content: {
        posts: [
          {
            id: "post",
            slug: "hello",
            status: "published",
            data: { title: "Baseline" },
          },
        ],
      },
      bylines: [{ id: "author", slug: "author", displayName: "Author" }],
    }
    const fixture = await createEmDashTestDb({
      ...coreSeed,
      content: {},
      bylines: [],
    })
    const sqlite = new Database(fixture.databasePath)
    const seedDb: SeedDb = {
      get: async <T>(sql: string, params: unknown[]) =>
        (sqlite
          .query(sql)
          .get(...(params as SQLQueryBindings[])) as T | null) ?? undefined,
      all: async <T>(sql: string, params: unknown[]) =>
        sqlite.query(sql).all(...(params as SQLQueryBindings[])) as T[],
      run: async (sql, params) =>
        sqlite.query(sql).run(...(params as SQLQueryBindings[])),
    }
    let mediaAvailable = false
    let coreSeeds = 0
    let setupRequests = 0
    let failedDownloads = 0
    const uploaded: Uint8Array[] = []
    const requestHeaders: Headers[] = []
    const server = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch: async request => {
        const path = new URL(request.url).pathname
        if (path !== "/_emdash/api/setup") {
          if (path === "/pending.svg" && !mediaAvailable) {
            failedDownloads++
            return new Response("unavailable", { status: 503 })
          }
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
            {
              headers: { "content-type": "image/svg+xml" },
            }
          )
        }
        setupRequests++
        requestHeaders.push(request.headers)
        if (coreSeeds)
          return json({ error: { code: "ALREADY_CONFIGURED" } }, 409)
        await seedEmDashDb(fixture, coreSeed)
        coreSeeds++
        for (const [key, mediaPath] of [
          ["logo", "/ready.svg"],
          ["favicon", "/pending.svg"],
        ]) {
          sqlite.query("INSERT INTO options (name, value) VALUES (?, ?)").run(
            `site:${key}`,
            JSON.stringify({
              $media: { url: new URL(mediaPath, request.url).href },
            })
          )
        }
        return json({ data: { seedComplete: true } })
      },
    })
    const extensionSeed = {
      ...coreSeed,
      settings: {
        ...coreSeed.settings,
        logo: { $media: { url: new URL("/ready.svg", server.url).href } },
        favicon: { $media: { url: new URL("/pending.svg", server.url).href } },
      },
      content: { posts: [{ slug: "hello", seo: { title: "Baseline SEO" } }] },
      bylineFields: [
        { slug: "role", label: "Role", type: "string", translatable: true },
      ],
      bylines: [{ slug: "author", customFields: { role: "Baseline role" } }],
    }
    const { deps: base } = createVersionDeps()
    const deps: SetupDeps = {
      ...base,
      files: { ...nodeFiles, read: async () => JSON.stringify(extensionSeed) },
      fetch,
      seedDb: () => seedDb,
      putMedia: () => async (_key, body) => {
        uploaded.push(body)
      },
    }
    const setupTarget = { ...preview, url: server.url.origin }
    try {
      expect(await setupPreview(setupTarget, deps)).toBe("configured")
      expect(failedDownloads).toBe(1)
      expect(uploaded).toHaveLength(1)
      const pendingFavicon = sqlite
        .query<{ value: string }, []>(
          "SELECT value FROM options WHERE name = 'site:favicon'"
        )
        .get()
      expect(JSON.parse(pendingFavicon?.value ?? "null")).toHaveProperty(
        "$media"
      )
      expect(sqlite.query("SELECT * FROM _emdash_seo").all()).toHaveLength(1)
      expect(
        sqlite.query("SELECT * FROM _emdash_byline_field_values").all()
      ).toHaveLength(1)

      sqlite
        .query(
          "UPDATE ec_posts SET title = 'Editor title' WHERE slug = 'hello'"
        )
        .run()
      sqlite
        .query(
          "UPDATE options SET value = ?, revision = 'editor-revision' WHERE name = 'site:logo'"
        )
        .run('{"mediaId":"editor-logo","alt":"Editor logo"}')
      sqlite.query("UPDATE _emdash_seo SET seo_title = 'Editor SEO'").run()
      sqlite
        .query(
          "UPDATE _emdash_byline_field_values SET value = ?, updated_at = 'editor-date'"
        )
        .run('"Editor role"')
      sqlite
        .query(
          "INSERT INTO _emdash_bylines (id, slug, display_name, locale, translation_group) SELECT 'translated-author', slug, 'Autor', 'pt-BR', translation_group FROM _emdash_bylines WHERE slug = 'author' AND locale = 'en'"
        )
        .run()
      sqlite
        .query(
          "INSERT INTO _emdash_byline_field_values (byline_id, field_id, value) SELECT 'translated-author', id, ? FROM _emdash_byline_fields WHERE slug = 'role'"
        )
        .run('"Edited translated role"')
      const snapshot = () =>
        JSON.stringify([
          sqlite.query("SELECT * FROM ec_posts ORDER BY id").all(),
          sqlite.query("SELECT * FROM options WHERE name = 'site:logo'").all(),
          sqlite.query("SELECT * FROM _emdash_seo ORDER BY content_id").all(),
          sqlite.query("SELECT * FROM _emdash_bylines ORDER BY id").all(),
          sqlite
            .query(
              "SELECT * FROM _emdash_byline_field_values ORDER BY byline_id, field_id"
            )
            .all(),
        ])
      const edited = snapshot()
      mediaAvailable = true
      expect(await setupPreview(setupTarget, deps)).toBe("already-configured")
      expect(snapshot()).toBe(edited)
      expect(coreSeeds).toBe(1)
      expect(setupRequests).toBe(2)
      expect(failedDownloads).toBe(1)
      expect(uploaded).toHaveLength(2)
      const resolvedFavicon = sqlite
        .query<{ value: string }, []>(
          "SELECT value FROM options WHERE name = 'site:favicon'"
        )
        .get()
      const favicon = JSON.parse(resolvedFavicon?.value ?? "null")
      expect(favicon.mediaId).toBeString()
      expect(favicon).not.toHaveProperty("$media")
      expect(
        sqlite.query("SELECT id FROM media WHERE id = ?").get(favicon.mediaId)
      ).not.toBeNull()
      for (const headers of requestHeaders) {
        expect(headers.get("cf-access-client-id")).toBe("client-id")
        expect(headers.get("cf-access-client-secret")).toBe("client-secret")
      }
    } finally {
      await server.stop(true)
      sqlite.close()
      await fixture.cleanup()
    }
  }, 30_000)
})

describe("resolvePreviewUrl", () => {
  test("reads the first Preview URL from wrangler preview --json", () => {
    expect(resolvePreviewUrl(previewJson("https://pr-7-x.workers.dev"))).toBe(
      "https://pr-7-x.workers.dev"
    )
  })

  test("skips wrangler banner lines printed before the JSON", () => {
    const banner = [
      "Using redirected Wrangler configuration.",
      ' - Configuration being used: "dist/server/wrangler.json"',
      "",
    ].join("\n")
    const json = JSON.stringify(
      JSON.parse(previewJson("https://pr-7-x.workers.dev")),
      null,
      2
    )
    expect(resolvePreviewUrl(`${banner}\n${json}`)).toBe(
      "https://pr-7-x.workers.dev"
    )
  })

  test("rejects output that is not Preview JSON or has no URL", () => {
    expect(() => resolvePreviewUrl("Uploaded transportugal")).toThrow(
      "wrangler preview --json"
    )
    expect(() =>
      resolvePreviewUrl(JSON.stringify({ preview: { urls: [] } }))
    ).toThrow("wrangler preview --json")
  })
})

const VERSION_ID = "1f2e3d4c-5b6a-4789-8abc-def012345678"

const createArtifact = async () => {
  const artifactDir = await mkdtemp(join(tmpdir(), "website-dist-"))
  await mkdir(join(artifactDir, "server"), { recursive: true })
  await mkdir(join(artifactDir, "client"), { recursive: true })
  await writeFile(
    join(artifactDir, "server/wrangler.json"),
    JSON.stringify({
      name: "transportugal",
      main: "entry.mjs",
      assets: { directory: "../client" },
      kv_namespaces: [{ binding: "SESSION" }],
      vars: {},
    })
  )
  await writeFile(join(artifactDir, "server/entry.mjs"), "export default {}")
  await writeFile(join(artifactDir, "client/.assetsignore"), "_worker.js")
  return artifactDir
}

const createVersionDeps = (
  stdout = `Uploaded transportugal (1.20 sec)\nWorker Version ID: ${VERSION_ID}\n`
) => {
  const calls: string[][] = []
  const deps: DeployDeps = {
    exec: async args => {
      calls.push(args)
      return { stdout, exitCode: 0 }
    },
    kv: {
      findOrCreate: async title => ({ id: `id-of-${title}`, created: false }),
      deleteByTitle: async () => false,
    },
    d1: {
      findOrCreate: async () => {
        throw new Error("Version must not provision D1")
      },
      deleteByName: async () => {
        throw new Error("Version must not delete D1")
      },
    },
    r2: {
      findOrCreate: async () => {
        throw new Error("Version must not provision R2")
      },
      deleteByName: async () => {
        throw new Error("Version must not delete R2")
      },
    },
    files: nodeFiles,
  }
  return { calls, deps }
}

const configAt = async (args: string[]) =>
  JSON.parse(await readFile(args[args.indexOf("-c") + 1]!, "utf-8"))

describe("versionUpload", () => {
  test.each(["pedrohenridesign", "brunabraz"])(
    "%s stages share unchanged standard artifact without preview bindings",
    async worker => {
      const artifactDir = await createArtifact()
      const before = await digestDirectory(artifactDir)
      for (const stage of ["staging", "production"]) {
        const { deps, calls } = createVersionDeps()
        await versionUpload(
          {
            siteDir: `/repo/websites/${worker}`,
            worker,
            artifactDir,
            vars: { STAGE: stage },
          },
          deps
        )
        const config = await configAt(calls[0]!)
        expect(config.vars).toEqual({ STAGE: stage })
        expect(config.previews).toBeUndefined()
        expect(config.d1_databases).toBeUndefined()
        expect(config.r2_buckets).toBeUndefined()
        expect(await digestDirectory(artifactDir)).toBe(before)
        await versionDeploy(
          {
            siteDir: `/repo/websites/${worker}`,
            worker,
            versionId: VERSION_ID,
          },
          deps
        )
        expect(await digestDirectory(artifactDir)).toBe(before)
      }
    }
  )
  test("uploads a Version of the given Worker from a configured copy and never deploys it", async () => {
    const artifactDir = await createArtifact()
    const before = await digestDirectory(artifactDir)
    const { calls, deps } = createVersionDeps()
    const vars = { IMAGES_BASE_URL: "https://images.example.invalid" }

    const result = await versionUpload(
      {
        siteDir: "/repo/websites/transportugal",
        worker: "transportugal-staging",
        artifactDir,
        vars,
      },
      deps
    )

    expect(result).toEqual({ versionId: VERSION_ID })
    expect(calls).toHaveLength(1)
    const [args] = calls as [string[]]
    const configPath = args[args.indexOf("-c") + 1]!
    expect(args).toEqual([
      "wrangler",
      "versions",
      "upload",
      "--name",
      "transportugal-staging",
      "-c",
      configPath,
    ])
    expect(configPath.startsWith(artifactDir)).toBe(false)
    expect(await configAt(args)).toMatchObject({
      vars,
      kv_namespaces: [
        { binding: "SESSION", id: "id-of-transportugal-staging" },
      ],
    })
    expect(await digestDirectory(artifactDir)).toBe(before)
  })

  test("uploads production from the same artifact with production vars", async () => {
    const artifactDir = await createArtifact()
    const before = await digestDirectory(artifactDir)
    const production = createVersionDeps(`Worker Version ID: ${VERSION_ID}\n`)

    const result = await versionUpload(
      {
        siteDir: "/repo/websites/transportugal",
        worker: "transportugal",
        artifactDir,
        vars: { STAGE_FLAG: "production" },
      },
      production.deps
    )

    expect(result).toEqual({ versionId: VERSION_ID })
    const [args] = production.calls as [string[]]
    expect((await configAt(args)).vars).toEqual({ STAGE_FLAG: "production" })
    expect(await digestDirectory(artifactDir)).toBe(before)
    expect(args.slice(0, 2)).not.toEqual(["wrangler", "deploy"])
  })

  test("staging uploads to <worker>-staging, production to <worker>", () => {
    expect(stageWorkerName("pedrohenridesign", "staging")).toBe(
      "pedrohenridesign-staging"
    )
    expect(stageWorkerName("pedrohenridesign", "production")).toBe(
      "pedrohenridesign"
    )
  })

  test("fails when wrangler prints no Worker Version ID", async () => {
    const { deps } = createVersionDeps("Uploaded transportugal (1.20 sec)\n")

    await expect(
      versionUpload(
        {
          siteDir: "/repo/websites/transportugal",
          worker: "transportugal",
          artifactDir: await createArtifact(),
          vars: {},
        },
        deps
      )
    ).rejects.toThrow(
      "Could not determine Worker Version ID from wrangler output."
    )
  })

  test("creates a missing Worker with deploy, then continues with its Version", async () => {
    const { deps } = createVersionDeps()
    const calls: string[][] = []
    deps.exec = async args => {
      calls.push(args)
      return args[1] === "versions"
        ? {
            stdout: "",
            stderr:
              "You cannot upload a new version of a Worker that does not yet exist.",
            exitCode: 1,
          }
        : { stdout: `Current Version ID: ${VERSION_ID}\n`, exitCode: 0 }
    }

    const result = await versionUpload(
      {
        siteDir: "/repo/websites/bellypao",
        worker: "bellypao-staging",
        artifactDir: await createArtifact(),
        vars: {},
      },
      deps
    )

    expect(result).toEqual({ versionId: VERSION_ID })
    expect(calls.map(c => c.slice(0, 2))).toEqual([
      ["wrangler", "versions"],
      ["wrangler", "deploy"],
    ])
  })

  test("does not deploy when the upload fails for another reason", async () => {
    const { deps } = createVersionDeps()
    const calls: string[][] = []
    deps.exec = async args => {
      calls.push(args)
      return { stdout: "", stderr: "Authentication error", exitCode: 1 }
    }

    await expect(
      versionUpload(
        {
          siteDir: "/repo/websites/bellypao",
          worker: "bellypao-staging",
          artifactDir: await createArtifact(),
          vars: {},
        },
        deps
      )
    ).rejects.toThrow("wrangler failed")
    expect(calls).toHaveLength(1)
  })
})

describe("versionDeploy", () => {
  test("promotes exactly the uploaded Version to all traffic", async () => {
    const { calls, deps } = createVersionDeps()

    await versionDeploy(
      {
        siteDir: "/repo/websites/transportugal",
        worker: "transportugal",
        versionId: VERSION_ID,
      },
      deps
    )

    expect(calls).toEqual([
      [
        "wrangler",
        "versions",
        "deploy",
        `${VERSION_ID}@100%`,
        "--name",
        "transportugal",
        "--yes",
      ],
    ])
  })

  test("rejects anything but a Version UUID before calling wrangler", async () => {
    const { calls, deps } = createVersionDeps()

    await expect(
      versionDeploy(
        {
          siteDir: "/repo/websites/transportugal",
          worker: "transportugal",
          versionId: "latest",
        },
        deps
      )
    ).rejects.toThrow("Worker Version ID")
    expect(calls).toEqual([])
  })
})

describe("digestDirectory", () => {
  test("changes when a file's content or path changes, including hidden files", async () => {
    const first = await createArtifact()
    const second = await createArtifact()

    expect(await digestDirectory(first)).toBe(await digestDirectory(second))

    await writeFile(join(second, "client/.assetsignore"), "_routes.json")
    expect(await digestDirectory(second)).not.toBe(await digestDirectory(first))

    const third = await createArtifact()
    await writeFile(join(third, "client/extra.txt"), "")
    expect(await digestDirectory(third)).not.toBe(await digestDirectory(first))
  })
})

const completeSecrets = Object.fromEntries(
  [
    "TURSO_DATABASE_URL",
    "TURSO_AUTH_TOKEN",
    "S3_ENDPOINT",
    "S3_BUCKET",
    "S3_PUBLIC_URL",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "EMDASH_ENCRYPTION_KEY",
  ].map(key => [key, `value-of-${key}`])
)

const dotenv = (secrets: Record<string, string>) =>
  Object.entries(secrets)
    .map(([key, value]) => `${key}='${value}'`)
    .join("\n")

describe("parseStageSecrets", () => {
  test("returns every key under the site path except the preview-only audience", () => {
    expect(
      parseStageSecrets(
        "pedrohenridesign",
        "production",
        dotenv({ ...completeSecrets, CF_ACCESS_AUDIENCE: "aud" })
      )
    ).toEqual(completeSecrets)
  })

  test("reads unquoted and double-quoted values", () => {
    expect(
      parseStageSecrets(
        "bellypao",
        "staging",
        'S3_PUBLIC_URL=https://a.example.com/b\nX="y"'
      )
    ).toEqual({ S3_PUBLIC_URL: "https://a.example.com/b", X: "y" })
  })

  test("rejects an empty key, naming it but never a value", () => {
    expect(() =>
      parseStageSecrets(
        "pedrohenridesign",
        "production",
        dotenv({ ...completeSecrets, S3_BUCKET: "", TURSO_AUTH_TOKEN: "" })
      )
    ).toThrow("missing or empty: TURSO_AUTH_TOKEN, S3_BUCKET.")
  })

  test("an EmDash site requires its database, bucket and encryption key", () => {
    const { TURSO_AUTH_TOKEN: _token, ...incomplete } = completeSecrets
    expect(() =>
      parseStageSecrets("brunabraz", "staging", dotenv(incomplete))
    ).toThrow(
      "Infisical staging secrets are missing or empty: TURSO_AUTH_TOKEN."
    )
  })

  test("CMS sites derive S3_PUBLIC_URL from endpoint and bucket when absent", () => {
    const { S3_PUBLIC_URL: _publicUrl, ...missingPublicUrl } = completeSecrets
    const result = parseStageSecrets(
      "brunabraz",
      "staging",
      dotenv(missingPublicUrl)
    )
    expect(result).toEqual({
      ...missingPublicUrl,
      S3_PUBLIC_URL: `${missingPublicUrl.S3_ENDPOINT}/${missingPublicUrl.S3_BUCKET}`,
    })
  })

  test("CMS sites reject explicitly empty S3_PUBLIC_URL to prevent stale-value inheritance", () => {
    expect(() =>
      parseStageSecrets(
        "brunabraz",
        "staging",
        dotenv({ ...completeSecrets, S3_PUBLIC_URL: "" })
      )
    ).toThrow("missing or empty: S3_PUBLIC_URL.")
  })

  test("non-CMS sites have no required keys", () => {
    const result = parseStageSecrets("bellypao", "staging", "")
    expect(result).toEqual({})
  })
})

describe.each(["staging", "production"])("check-secrets CLI: %s", stage => {
  const { S3_PUBLIC_URL: _publicUrl, ...missingPublicUrl } = completeSecrets
  const cases = [
    {
      name: "empty key",
      key: "S3_BUCKET",
      secrets: { ...completeSecrets, S3_BUCKET: "" },
      valid: false,
    },
    {
      name: "missing public URL (derives from endpoint/bucket)",
      secrets: missingPublicUrl,
      valid: true,
    },
    {
      name: "empty public URL (prevents stale-value inheritance)",
      key: "S3_PUBLIC_URL",
      secrets: { ...completeSecrets, S3_PUBLIC_URL: "" },
      valid: false,
    },
    { name: "complete secrets", secrets: completeSecrets, valid: true },
  ]

  describe.each([false, true])("GITHUB_ACTIONS=%s", githubActions => {
    test.each(cases)(
      "$name",
      async ({ secrets, valid, key: missingSecretKey }) => {
        const env: NodeJS.ProcessEnv = {
          ...process.env,
          ...secrets,
          NO_COLOR: "1",
        }
        const secretsFile = join(
          await mkdtemp(join(tmpdir(), "site-secrets-")),
          "secrets.env"
        )
        await writeFile(secretsFile, dotenv(secrets))
        env.SITE_SECRETS_FILE = secretsFile
        delete env.GITHUB_ACTIONS
        delete env.GITHUB_OUTPUT
        delete env.GITHUB_STEP_SUMMARY
        if (githubActions) env.GITHUB_ACTIONS = "true"
        const child = Bun.spawn(
          [
            process.execPath,
            "scripts/deploy.ts",
            "check-secrets",
            "pedrohenridesign",
            "--stage",
            stage,
          ],
          {
            cwd: join(import.meta.dir, ".."),
            env,
            stdout: "pipe",
            stderr: "pipe",
          }
        )
        const [stdout, stderr, code] = await Promise.all([
          new Response(child.stdout).text(),
          new Response(child.stderr).text(),
          child.exited,
        ])
        const masks = stdout
          .split("\n")
          .filter(line => line.startsWith("::add-mask::"))
        const normalOutput =
          stdout
            .split("\n")
            .filter(line => !line.startsWith("::add-mask::"))
            .join("\n") + stderr
        const expectedSecrets =
          secrets === missingPublicUrl
            ? {
                ...secrets,
                S3_PUBLIC_URL: `${secrets.S3_ENDPOINT}/${secrets.S3_BUCKET}`,
              }
            : secrets
        expect(code).toBe(valid ? 0 : 1)
        expect(masks).toEqual(
          valid && githubActions
            ? Object.values(expectedSecrets).map(
                value => `::add-mask::${value}`
              )
            : []
        )
        for (const value of Object.values(expectedSecrets))
          if (value) expect(normalOutput).not.toContain(value)

        if (!valid) {
          expect(normalOutput).toContain(
            `Infisical ${stage} secrets are missing or empty: ${missingSecretKey}.`
          )
        }
      },
      30_000
    )
  })
})

describe("versionUpload secrets", () => {
  test("passes secrets through a file outside the artifact and the upload copy", async () => {
    const artifactDir = await createArtifact()
    const before = await digestDirectory(artifactDir)
    const { calls, deps } = createVersionDeps()
    await versionUpload(
      {
        siteDir: "/repo/websites/pedrohenridesign",
        worker: "pedrohenridesign",
        artifactDir,
        vars: {},
        secrets: completeSecrets,
      },
      deps
    )
    const [args] = calls as [string[]]
    const secretsPath = args[args.indexOf("--secrets-file") + 1]!
    const configPath = args[args.indexOf("-c") + 1]!
    expect(JSON.parse(await readFile(secretsPath, "utf-8"))).toEqual(
      completeSecrets
    )
    expect(secretsPath.startsWith(artifactDir)).toBe(false)
    expect(secretsPath.startsWith(join(configPath, "../.."))).toBe(false)
    expect(await configAt(args)).not.toHaveProperty("secrets")
    expect(await digestDirectory(artifactDir)).toBe(before)
  })

  test("sends no --secrets-file when the site has none", async () => {
    const { calls, deps } = createVersionDeps()
    await versionUpload(
      {
        siteDir: "/repo/websites/transportugal",
        worker: "transportugal",
        artifactDir: await createArtifact(),
        vars: {},
      },
      deps
    )
    expect(calls[0]).not.toContain("--secrets-file")
  })
})
