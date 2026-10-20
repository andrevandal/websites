import { createHash } from "node:crypto"
import { describe, expect, spyOn, test } from "bun:test"
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3"
import {
  deleteD1DatabaseByName,
  deleteR2BucketByName,
  findOrCreateD1Database,
  findOrCreateR2Bucket,
} from "./cloudflare"

type FixtureOptions = {
  owner?: "account" | "user"
  pagination?: "total_pages" | "total_count"
  failure?:
    | "list"
    | "create"
    | "delete"
    | "verify"
    | "transport"
    | "objects"
    | "partial"
}

// Only provider transports are replaced; real helpers operate on mutable resources.
const withCloudflare = async (
  options: FixtureOptions,
  run: (state: {
    d1: Map<string, { uuid: string; name: string }>
    r2: Map<string, { name: string }>
    objects: Map<string, Map<string, string>>
    paths: string[]
    credentials: { accessKeyId: string; secretAccessKey: string }[]
    destroyed: () => number
  }) => Promise<void>
) => {
  const env = {
    account: process.env.CLOUDFLARE_ACCOUNT_ID,
    token: process.env.CLOUDFLARE_API_TOKEN,
  }
  process.env.CLOUDFLARE_ACCOUNT_ID = "test-account"
  process.env.CLOUDFLARE_API_TOKEN = "test-token-never-log"
  const d1 = new Map([
    [
      "pedrohenri-pr-42-cms-extra",
      { uuid: "other-db", name: "pedrohenri-pr-42-cms-extra" },
    ],
    [
      "pedrohenri-pr-42-cms",
      { uuid: "existing-db", name: "pedrohenri-pr-42-cms" },
    ],
    ["production-cms", { uuid: "production-db", name: "production-cms" }],
  ])
  const r2 = new Map([
    ["pedrohenri-pr-42-media-extra", { name: "pedrohenri-pr-42-media-extra" }],
    ["pedrohenri-pr-42-media", { name: "pedrohenri-pr-42-media" }],
    ["production-media", { name: "production-media" }],
  ])
  const objects = new Map<string, Map<string, string>>([
    [
      "pedrohenri-pr-42-media",
      new Map(
        Array.from({ length: 2005 }, (_, i) => [
          `image-${String(i).padStart(4, "0")}.jpg`,
          `bytes-${i}`,
        ])
      ),
    ],
    ["production-media", new Map([["keep.jpg", "production bytes"]])],
  ])
  const paths: string[] = []
  const credentials: { accessKeyId: string; secretAccessKey: string }[] = []
  let destroyed = 0
  let nextId = 1
  const originalFetch = globalThis.fetch
  const response = (result: unknown, result_info?: unknown) =>
    Response.json({ success: true, errors: [], result, result_info })
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit
  ) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input : input.url
    )
    const path = url.pathname.replace("/client/v4", "")
    const method = init?.method ?? "GET"
    paths.push(`${method} ${path}${url.search}`)
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`
    )
    if (options.failure === "transport" && path.endsWith("/tokens/verify"))
      throw new Error("network unavailable")
    if (
      (options.failure === "verify" && path.endsWith("/tokens/verify")) ||
      (options.failure === "list" &&
        method === "GET" &&
        !path.endsWith("/tokens/verify")) ||
      (options.failure === "create" && method === "POST") ||
      (options.failure === "delete" && method === "DELETE")
    ) {
      return Response.json(
        {
          success: false,
          errors: [{ code: 1000, message: "provider failure" }],
        },
        { status: 503 }
      )
    }
    if (path.endsWith("/tokens/verify")) {
      if (options.owner === "user" && path.startsWith("/accounts/")) {
        return Response.json(
          {
            success: false,
            errors: [{ code: 10000, message: "Authentication error" }],
          },
          { status: 401 }
        )
      }
      return response({ id: "current-token-id", status: "active" })
    }
    if (path === "/accounts/test-account/d1/database") {
      if (method === "GET") {
        const matching = [...d1.values()].filter(item =>
          item.name.includes(url.searchParams.get("name") ?? "")
        )
        const page = Number(url.searchParams.get("page"))
        expect(url.searchParams.get("per_page")).toBe("100")
        const info =
          options.pagination === "total_count"
            ? { page, per_page: 1, total_count: matching.length }
            : { page, total_pages: matching.length }
        return response(matching.slice(page - 1, page), info)
      }
      const { name } = JSON.parse(String(init?.body))
      const resource = { name, uuid: `new-db-${nextId++}` }
      d1.set(name, resource)
      return response(resource)
    }
    if (path.startsWith("/accounts/test-account/d1/database/")) {
      const uuid = decodeURIComponent(path.split("/").at(-1)!)
      const entry = [...d1.entries()].find(([, item]) => item.uuid === uuid)
      if (!entry) throw new Error("Wrong database deleted")
      d1.delete(entry[0])
      return response(null)
    }
    if (path === "/accounts/test-account/r2/buckets") {
      if (method === "GET") {
        expect(url.searchParams.get("per_page")).toBe("1000")
        const matching = [...r2.values()].filter(item =>
          item.name.includes(url.searchParams.get("name_contains") ?? "")
        )
        const offset = Number(url.searchParams.get("cursor") ?? 0)
        return response(
          { buckets: matching.slice(offset, offset + 1) },
          {
            cursor:
              offset + 1 < matching.length ? String(offset + 1) : undefined,
          }
        )
      }
      const { name } = JSON.parse(String(init?.body))
      const resource = { name }
      r2.set(name, resource)
      objects.set(name, new Map())
      return response(resource)
    }
    if (path.startsWith("/accounts/test-account/r2/buckets/")) {
      const name = decodeURIComponent(path.split("/").at(-1)!)
      if (objects.get(name)?.size)
        throw new Error("Bucket deleted before object purge")
      if (!r2.delete(name)) throw new Error("Wrong bucket deleted")
      objects.delete(name)
      return response(null)
    }
    throw new Error(`Unexpected provider request: ${method} ${path}`)
  }) as typeof fetch
  const send = spyOn(S3Client.prototype, "send")
  send.mockImplementation((async (command: unknown) => {
    const client = send.mock.contexts.at(-1) as S3Client
    credentials.push(await client.config.credentials())
    expect(await client.config.region()).toBe("auto")
    if (options.failure === "objects") throw new Error("S3 transport failure")
    if (command instanceof ListObjectsV2Command) {
      const { Bucket, MaxKeys, ContinuationToken } = command.input
      expect(MaxKeys).toBe(1000)
      const keys = [...(objects.get(Bucket!)?.keys() ?? [])]
        .sort()
        .filter(key => !ContinuationToken || key > ContinuationToken)
      return {
        Contents: keys.slice(0, 1000).map(Key => ({ Key })),
        IsTruncated: keys.length > 1000,
        NextContinuationToken: keys.length > 1000 ? keys[999] : undefined,
      }
    }
    if (command instanceof DeleteObjectsCommand) {
      const { Bucket, Delete } = command.input
      expect(Delete!.Objects!.length).toBeLessThanOrEqual(1000)
      if (options.failure === "partial") {
        return {
          Errors: [{ Key: Delete!.Objects![0]!.Key, Code: "AccessDenied" }],
        }
      }
      for (const item of Delete!.Objects!)
        objects.get(Bucket!)!.delete(item.Key!)
      return { Deleted: Delete!.Objects }
    }
    throw new Error("Unexpected S3 operation")
  }) as never)
  const destroy = spyOn(S3Client.prototype, "destroy").mockImplementation(
    () => {
      destroyed += 1
    }
  )
  try {
    await run({
      d1,
      r2,
      objects,
      paths,
      credentials,
      destroyed: () => destroyed,
    })
  } finally {
    send.mockRestore()
    destroy.mockRestore()
    globalThis.fetch = originalFetch
    if (env.account === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID
    else process.env.CLOUDFLARE_ACCOUNT_ID = env.account
    if (env.token === undefined) delete process.env.CLOUDFLARE_API_TOKEN
    else process.env.CLOUDFLARE_API_TOKEN = env.token
  }
}

describe("Cloudflare preview resource REST helpers", () => {
  test.each(["total_pages", "total_count"] as const)(
    "D1 exact lookup follows %s, reuses UUID, creates and deletes only exact names",
    async pagination => {
      await withCloudflare({ pagination }, async state => {
        expect(await findOrCreateD1Database("pedrohenri-pr-42-cms")).toEqual({
          database: { uuid: "existing-db", name: "pedrohenri-pr-42-cms" },
          created: false,
        })
        const created = await findOrCreateD1Database("brunabraz-pr-43-cms")
        expect(created.created).toBe(true)
        expect(state.d1.get("brunabraz-pr-43-cms")).toEqual(created.database)
        expect(await findOrCreateD1Database("brunabraz-pr-43-cms")).toEqual({
          ...created,
          created: false,
        })
        expect(await deleteD1DatabaseByName("pedrohenri-pr-42-cms")).toBe(true)
        expect(await deleteD1DatabaseByName("pedrohenri-pr-42-cms")).toBe(false)
        expect(state.d1.has("pedrohenri-pr-42-cms-extra")).toBe(true)
        expect(state.d1.has("production-cms")).toBe(true)
      })
    }
  )

  test("R2 cursor lookup preserves exact existing bucket, creates once and purges all media before deletion", async () => {
    await withCloudflare({}, async state => {
      expect(await findOrCreateR2Bucket("pedrohenri-pr-42-media")).toEqual({
        bucket: { name: "pedrohenri-pr-42-media" },
        created: false,
      })
      const created = await findOrCreateR2Bucket("brunabraz-pr-43-media")
      expect(created.created).toBe(true)
      expect(state.r2.get("brunabraz-pr-43-media")).toEqual(created.bucket)
      expect(await findOrCreateR2Bucket("brunabraz-pr-43-media")).toEqual({
        ...created,
        created: false,
      })
      expect(await deleteR2BucketByName("pedrohenri-pr-42-media")).toBe(true)
      expect(await deleteR2BucketByName("pedrohenri-pr-42-media")).toBe(false)
      expect(state.objects.has("pedrohenri-pr-42-media")).toBe(false)
      expect(state.r2.has("pedrohenri-pr-42-media-extra")).toBe(true)
      expect(state.objects.get("production-media")!.get("keep.jpg")).toBe(
        "production bytes"
      )
      expect(state.destroyed()).toBe(1)
      expect(state.credentials.length).toBeGreaterThan(0)
      for (const credentials of state.credentials) {
        expect(credentials).toMatchObject({
          accessKeyId: "current-token-id",
          secretAccessKey: createHash("sha256")
            .update("test-token-never-log")
            .digest("hex"),
        })
      }
    })
  })

  test("user-owned token uses user verify after account-owner authentication rejection", async () => {
    await withCloudflare({ owner: "user" }, async state => {
      expect(await deleteR2BucketByName("pedrohenri-pr-42-media")).toBe(true)
      expect(state.paths).toContain("GET /user/tokens/verify")
      expect(state.r2.has("pedrohenri-pr-42-media")).toBe(false)
    })
  })

  test.each(["verify", "transport", "objects", "partial"] as const)(
    "R2 %s failure propagates without deleting bucket",
    async failure => {
      await withCloudflare({ failure }, async state => {
        await expect(
          deleteR2BucketByName("pedrohenri-pr-42-media")
        ).rejects.toThrow()
        expect(state.r2.has("pedrohenri-pr-42-media")).toBe(true)
        expect(state.objects.get("pedrohenri-pr-42-media")!.size).toBe(2005)
        expect(state.paths.some(path => path.startsWith("DELETE "))).toBe(false)
        if (failure === "verify" || failure === "transport")
          expect(state.paths).not.toContain("GET /user/tokens/verify")
        else expect(state.destroyed()).toBe(1)
      })
    }
  )

  test.each(["list", "create", "delete"] as const)(
    "REST %s failures propagate without fake success",
    async failure => {
      await withCloudflare({ failure }, async state => {
        if (failure === "delete") {
          await expect(
            deleteD1DatabaseByName("pedrohenri-pr-42-cms")
          ).rejects.toThrow("provider failure")
          await expect(
            deleteR2BucketByName("pedrohenri-pr-42-media")
          ).rejects.toThrow("provider failure")
        } else {
          await expect(
            findOrCreateD1Database("brunabraz-pr-43-cms")
          ).rejects.toThrow("provider failure")
          await expect(
            findOrCreateR2Bucket("brunabraz-pr-43-media")
          ).rejects.toThrow("provider failure")
        }
        expect(state.d1.has("brunabraz-pr-43-cms")).toBe(false)
        expect(state.r2.has("brunabraz-pr-43-media")).toBe(false)
        expect(state.d1.has("pedrohenri-pr-42-cms")).toBe(true)
        expect(state.r2.has("pedrohenri-pr-42-media")).toBe(true)
      })
    }
  )
})
