import { createHash } from "node:crypto"
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

const API_BASE = "https://api.cloudflare.com/client/v4"

type CfListResponse<T> = {
  success: boolean
  errors: { code: number; message: string }[]
  result: T[]
  result_info?: { page: number; total_pages: number }
}

type CfItemResponse<T> = {
  success: boolean
  errors: { code: number; message: string }[]
  result: T | null
}

type KvNamespace = {
  id: string
  title: string
}

const requireEnv = (name: string) => {
  const value = process.env[name]

  if (!value) throw new Error(`Missing required environment variable: ${name}`)

  return value
}

const cfFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const apiToken = requireEnv("CLOUDFLARE_API_TOKEN")

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  const body = (await res.json()) as { success: boolean; errors: unknown[] }

  if (!res.ok || !body.success) {
    throw Object.assign(
      new Error(
        `Cloudflare API request failed (${res.status} ${path}): ${JSON.stringify(body.errors)}`
      ),
      { status: res.status }
    )
  }

  return body as T
}

const listKvNamespaces = async (): Promise<KvNamespace[]> => {
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID")
  const namespaces: KvNamespace[] = []
  let page = 1

  while (true) {
    // oxlint-disable-next-line no-await-in-loop -- each page depends on the previous page's total_pages
    const res = await cfFetch<CfListResponse<KvNamespace>>(
      `/accounts/${accountId}/storage/kv/namespaces?page=${page}&per_page=100`
    )

    namespaces.push(...res.result)

    if (!res.result_info || res.result_info.page >= res.result_info.total_pages)
      break

    page += 1
  }

  return namespaces
}

const findKvNamespaceByTitle = async (
  title: string
): Promise<KvNamespace | undefined> => {
  const namespaces = await listKvNamespaces()

  return namespaces.find(ns => ns.title === title)
}

const createKvNamespace = async (title: string): Promise<KvNamespace> => {
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID")

  const res = await cfFetch<CfItemResponse<KvNamespace>>(
    `/accounts/${accountId}/storage/kv/namespaces`,
    {
      method: "POST",
      body: JSON.stringify({ title }),
    }
  )

  if (!res.result) throw new Error(`Failed to create KV namespace "${title}"`)

  return res.result
}

const findOrCreateKvNamespace = async (
  title: string
): Promise<{ namespace: KvNamespace; created: boolean }> => {
  const existing = await findKvNamespaceByTitle(title)

  if (existing) return { namespace: existing, created: false }

  return { namespace: await createKvNamespace(title), created: true }
}

const deleteKvNamespaceByTitle = async (title: string): Promise<boolean> => {
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID")
  const existing = await findKvNamespaceByTitle(title)

  if (!existing) return false

  await cfFetch<CfItemResponse<null>>(
    `/accounts/${accountId}/storage/kv/namespaces/${existing.id}`,
    { method: "DELETE" }
  )

  return true
}

type D1Database = { uuid: string; name: string }
type R2Bucket = { name: string }
type TokenVerification = { id: string; status: string }

const findD1DatabaseByName = async (
  name: string
): Promise<D1Database | undefined> => {
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID")
  let page = 1
  while (true) {
    // oxlint-disable-next-line no-await-in-loop -- pagination depends on the previous response
    const res = await cfFetch<{
      result: D1Database[]
      result_info?: {
        total_pages?: number
        total_count?: number
        per_page?: number
      }
    }>(
      `/accounts/${accountId}/d1/database?name=${encodeURIComponent(name)}&page=${page}&per_page=100`
    )
    const existing = res.result.find(database => database.name === name)
    if (existing) return existing
    const totalPages =
      res.result_info?.total_pages ??
      Math.ceil(
        (res.result_info?.total_count ?? res.result.length) /
          (res.result_info?.per_page ?? 100)
      )
    if (page >= totalPages) return undefined
    page += 1
  }
}

const findOrCreateD1Database = async (
  name: string
): Promise<{ database: D1Database; created: boolean }> => {
  const existing = await findD1DatabaseByName(name)
  if (existing) return { database: existing, created: false }
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID")
  const res = await cfFetch<CfItemResponse<D1Database>>(
    `/accounts/${accountId}/d1/database`,
    {
      method: "POST",
      body: JSON.stringify({ name }),
    }
  )
  if (!res.result?.uuid || res.result.name !== name)
    throw new Error(`Failed to create D1 database "${name}"`)
  return { database: res.result, created: true }
}

const deleteD1DatabaseByName = async (name: string): Promise<boolean> => {
  const existing = await findD1DatabaseByName(name)
  if (!existing) return false
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID")
  await cfFetch<CfItemResponse<null>>(
    `/accounts/${accountId}/d1/database/${encodeURIComponent(existing.uuid)}`,
    {
      method: "DELETE",
    }
  )
  return true
}

const findR2BucketByName = async (
  name: string
): Promise<R2Bucket | undefined> => {
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID")
  let cursor: string | undefined
  do {
    // oxlint-disable-next-line no-await-in-loop -- each cursor comes from the preceding response
    const res = await cfFetch<{
      result: { buckets: R2Bucket[] }
      result_info?: { cursor?: string }
    }>(
      `/accounts/${accountId}/r2/buckets?name_contains=${encodeURIComponent(name)}&per_page=1000${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`
    )
    const existing = res.result.buckets.find(bucket => bucket.name === name)
    if (existing) return existing
    cursor = res.result_info?.cursor
  } while (cursor)
  return undefined
}

const findOrCreateR2Bucket = async (
  name: string
): Promise<{ bucket: R2Bucket; created: boolean }> => {
  const existing = await findR2BucketByName(name)
  if (existing) return { bucket: existing, created: false }
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID")
  const res = await cfFetch<CfItemResponse<R2Bucket>>(
    `/accounts/${accountId}/r2/buckets`,
    {
      method: "POST",
      body: JSON.stringify({ name }),
    }
  )
  if (res.result?.name !== name)
    throw new Error(`Failed to create R2 bucket "${name}"`)
  return { bucket: res.result, created: true }
}

const r2Client = async (): Promise<S3Client> => {
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID")
  let verification: CfItemResponse<TokenVerification>
  try {
    verification = await cfFetch<CfItemResponse<TokenVerification>>(
      `/accounts/${accountId}/tokens/verify`
    )
  } catch (error) {
    // Owner-specific authentication rejection permits the documented user-token endpoint.
    // Network, parsing and provider failures must propagate, not fall back.
    if (
      !(error instanceof Error) ||
      !("status" in error) ||
      (error.status !== 401 && error.status !== 403)
    )
      throw error
    verification = await cfFetch<CfItemResponse<TokenVerification>>(
      "/user/tokens/verify"
    )
  }
  if (!verification.result?.id || verification.result.status !== "active")
    throw new Error("Cloudflare API token is not active")

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: verification.result.id,
      secretAccessKey: createHash("sha256")
        .update(requireEnv("CLOUDFLARE_API_TOKEN"))
        .digest("hex"),
    },
  })
}

const putR2Object = async (
  bucket: string,
  key: string,
  body: Uint8Array,
  contentType: string
) => {
  const client = await r2Client()
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    )
  } finally {
    client.destroy()
  }
}

type D1QueryResponse<T> = {
  result: { results: T[]; meta: { changes: number } }[]
}

const queryD1 = async <T>(
  databaseId: string,
  sql: string,
  params: unknown[]
): Promise<{ results: T[]; changes: number }> => {
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID")
  const res = await cfFetch<D1QueryResponse<T>>(
    `/accounts/${accountId}/d1/database/${databaseId}/query`,
    { method: "POST", body: JSON.stringify({ sql, params }) }
  )
  const [statement] = res.result
  if (!statement) throw new Error(`D1 query returned no result: ${sql}`)

  return { results: statement.results, changes: statement.meta.changes }
}

const purgeR2Objects = async (name: string) => {
  const client = await r2Client()
  try {
    let continuationToken: string | undefined
    do {
      // oxlint-disable-next-line no-await-in-loop -- purge pages must be processed sequentially
      const page = await client.send(
        new ListObjectsV2Command({
          Bucket: name,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        })
      )
      const objects = (page.Contents ?? []).map(object => {
        if (object.Key === undefined)
          throw new Error("R2 object listing returned an object without a key")
        return { Key: object.Key }
      })
      for (let offset = 0; offset < objects.length; offset += 1000) {
        // oxlint-disable-next-line no-await-in-loop -- each deletion must succeed before deleting the bucket
        const deleted = await client.send(
          new DeleteObjectsCommand({
            Bucket: name,
            Delete: {
              Objects: objects.slice(offset, offset + 1000),
              Quiet: true,
            },
          })
        )
        if (deleted.Errors?.length) {
          throw new Error(
            `Failed to purge R2 bucket "${name}": ${JSON.stringify(deleted.Errors)}`
          )
        }
      }
      if (page.IsTruncated && !page.NextContinuationToken)
        throw new Error("R2 object listing omitted its continuation token")

      continuationToken = page.IsTruncated
        ? page.NextContinuationToken
        : undefined
    } while (continuationToken)
  } finally {
    client.destroy()
  }
}

const deleteR2BucketByName = async (name: string): Promise<boolean> => {
  const existing = await findR2BucketByName(name)
  if (!existing) return false
  await purgeR2Objects(existing.name)
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID")
  await cfFetch<CfItemResponse<null>>(
    `/accounts/${accountId}/r2/buckets/${encodeURIComponent(existing.name)}`,
    {
      method: "DELETE",
    }
  )
  return true
}

export {
  createKvNamespace,
  deleteD1DatabaseByName,
  deleteKvNamespaceByTitle,
  deleteR2BucketByName,
  findD1DatabaseByName,
  findKvNamespaceByTitle,
  findOrCreateD1Database,
  findOrCreateKvNamespace,
  findOrCreateR2Bucket,
  findR2BucketByName,
  listKvNamespaces,
  putR2Object,
  queryD1,
}
