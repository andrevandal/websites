import { AwsClient } from "aws4fetch"
import { EmDashStorageError } from "emdash"
import type {
  ByteRange,
  CreateStorageFn,
  DownloadResult,
  ListResult,
  S3StorageConfig,
  SignedUploadUrl,
  Storage,
  UploadResult,
} from "emdash"

// S3 storage on aws4fetch for Workers: the AWS SDK needs patched bundling there.
// Mirrors emdash/storage/s3 (config precedence, error codes, range fallback).
// Importing that module would pull the SDK back in.

const ENV_KEYS = {
  endpoint: "S3_ENDPOINT",
  bucket: "S3_BUCKET",
  accessKeyId: "S3_ACCESS_KEY_ID",
  secretAccessKey: "S3_SECRET_ACCESS_KEY",
  region: "S3_REGION",
  publicUrl: "S3_PUBLIC_URL",
} as const

const fail = (message: string): never => {
  throw new EmDashStorageError(message, "MISSING_S3_CONFIG")
}

const resolveConfig = (partial: Record<string, unknown>): S3StorageConfig => {
  const merged: Record<string, string | undefined> = {}
  for (const [field, envKey] of Object.entries(ENV_KEYS)) {
    const explicit = partial[field]
    const value =
      typeof explicit === "string" && explicit !== ""
        ? explicit
        : // Read at call time: Workers populates process.env with its secrets.
          process.env[envKey]
    if (value) merged[field] = value
  }

  const { endpoint, bucket, accessKeyId, secretAccessKey } = merged
  if (endpoint) {
    let protocol: string | undefined
    try {
      ;({ protocol } = new URL(endpoint))
    } catch {
      // handled below
    }
    if (protocol !== "http:" && protocol !== "https:")
      fail(`${ENV_KEYS.endpoint} is not a valid http/https URL`)
  }
  if (!endpoint || !bucket) {
    const missing = []
    if (!endpoint) {
      missing.push(
        `endpoint: set ${ENV_KEYS.endpoint} or pass endpoint to s3Fetch({...})`
      )
    }
    if (!bucket) {
      missing.push(
        `bucket: set ${ENV_KEYS.bucket} or pass bucket to s3Fetch({...})`
      )
    }
    fail(`missing required S3 config: ${missing.join("; ")}`)
  }
  if (!accessKeyId || !secretAccessKey) {
    fail(
      `S3 credentials missing: set ${ENV_KEYS.accessKeyId} and ${ENV_KEYS.secretAccessKey}`
    )
  }

  return { ...merged, endpoint, bucket } as S3StorageConfig
}

const CONTENT_RANGE = /^bytes (?<start>\d+)-(?<end>\d+)\/(?<total>\d+)$/

const formatRange = (range: ByteRange) => {
  if ("suffix" in range) return `bytes=-${range.suffix}`
  const end = range.length === undefined ? "" : range.offset + range.length - 1
  return `bytes=${range.offset}-${end}`
}

const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
}
// Single pass, so "&amp;lt;" decodes to "&lt;" and not "<".
const unescapeXml = (value: string) =>
  value.replace(
    /&(?:#x(?<hex>[\dA-Fa-f]+)|#(?<dec>\d+)|(?<name>amp|lt|gt|quot|apos));/g,
    (...args) => {
      const { hex, dec, name } = args.at(-1) as Record<
        string,
        string | undefined
      >
      return name
        ? XML_ENTITIES[name]!
        : String.fromCodePoint(hex ? Number.parseInt(hex, 16) : Number(dec))
    }
  )

const xmlTag = (xml: string, tag: string) => {
  const match = new RegExp(`<${tag}>(?<value>[\\s\\S]*?)</${tag}>`).exec(xml)
  return match ? unescapeXml(match.groups!.value!) : undefined
}

const httpError = (operation: string, res: Response) => {
  const requestId = res.headers.get("x-amz-request-id")
  return new Error(
    `${operation} ${res.status}${requestId ? ` (request ${requestId})` : ""}`
  )
}

// EmDash logs only the stack of a failed storage call, so the message and the
// cause go to the Worker log here.
const storageError = (message: string, code: string, cause: unknown) => {
  const detail = cause instanceof Error ? cause.message : String(cause)
  console.error(`[s3-fetch] ${code}: ${message}: ${detail}`)
  return new EmDashStorageError(message, code, cause)
}

class S3FetchStorage implements Storage {
  private readonly client: AwsClient
  private readonly base: string
  private readonly bucket: string
  private readonly publicUrl: string | undefined

  constructor(config: S3StorageConfig) {
    this.client = new AwsClient({
      accessKeyId: config.accessKeyId!,
      secretAccessKey: config.secretAccessKey!,
      service: "s3",
      region: config.region || "auto",
      // aws4fetch defaults to 10 retries on 5xx; the AWS SDK this replaces made 3 attempts.
      retries: 2,
    })
    this.base = config.endpoint.replace(/\/+$/, "")
    this.bucket = config.bucket
    this.publicUrl = config.publicUrl
  }

  private objectUrl(key: string) {
    return `${this.base}/${this.bucket}/${key.split("/").map(encodeURIComponent).join("/")}`
  }

  async upload(
    options: Parameters<Storage["upload"]>[0]
  ): Promise<UploadResult> {
    const { key, body, contentType, cacheControl } = options
    try {
      const bytes =
        body instanceof ReadableStream
          ? new Uint8Array(await new Response(body).arrayBuffer())
          : body
      const res = await this.client.fetch(this.objectUrl(key), {
        method: "PUT",
        body: bytes as BodyInit,
        headers: {
          "Content-Type": contentType,
          ...(cacheControl ? { "Cache-Control": cacheControl } : {}),
        },
      })
      if (!res.ok) throw httpError(`PUT ${key}`, res)
      return { key, url: this.getPublicUrl(key), size: bytes.byteLength }
    } catch (error) {
      throw storageError(
        `Failed to upload file: ${key}`,
        "UPLOAD_FAILED",
        error
      )
    }
  }

  async download(
    key: string,
    options: { range?: ByteRange } = {}
  ): Promise<DownloadResult> {
    try {
      const url = this.objectUrl(key)
      const get = (range?: string) =>
        this.client.fetch(url, range ? { headers: { Range: range } } : {})

      let res = await get(options.range && formatRange(options.range))
      const served =
        res.status === 206
          ? CONTENT_RANGE.exec(res.headers.get("Content-Range") ?? "")?.groups
          : undefined
      if (served) {
        const offset = Number(served.start)
        return {
          ...this.describe(res, key),
          size: Number(served.total),
          range: { offset, length: Number(served.end) - offset + 1 },
        }
      }
      if (res.status === 206 || res.status === 416) {
        // Unsatisfiable or unparsable range: serve the whole file instead.
        await res.body?.cancel()
        res = await get()
      }
      if (res.status === 404)
        throw new EmDashStorageError(`File not found: ${key}`, "NOT_FOUND")
      if (!res.ok) throw httpError(`GET ${key}`, res)
      return {
        ...this.describe(res, key),
        size: Number(res.headers.get("Content-Length")) || 0,
      }
    } catch (error) {
      if (error instanceof EmDashStorageError) throw error
      throw storageError(
        `Failed to download file: ${key}`,
        "DOWNLOAD_FAILED",
        error
      )
    }
  }

  private describe(res: Response, key: string) {
    if (!res.body)
      throw new EmDashStorageError(`File not found: ${key}`, "NOT_FOUND")
    const modified = res.headers.get("Last-Modified")
    return {
      body: res.body as ReadableStream<Uint8Array>,
      contentType:
        res.headers.get("Content-Type") || "application/octet-stream",
      ...(modified ? { lastModified: new Date(modified) } : {}),
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const res = await this.client.fetch(this.objectUrl(key), {
        method: "DELETE",
      })
      if (!res.ok && res.status !== 404) throw httpError(`DELETE ${key}`, res)
    } catch (error) {
      throw storageError(
        `Failed to delete file: ${key}`,
        "DELETE_FAILED",
        error
      )
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const res = await this.client.fetch(this.objectUrl(key), {
        method: "HEAD",
      })
      if (res.ok) return true
      if (res.status === 404) return false
      throw httpError(`HEAD ${key}`, res)
    } catch (error) {
      throw storageError(
        `Failed to check file existence: ${key}`,
        "HEAD_FAILED",
        error
      )
    }
  }

  async list(
    options: { prefix?: string; limit?: number; cursor?: string } = {}
  ): Promise<ListResult> {
    try {
      const query = new URLSearchParams({ "list-type": "2" })
      if (options.prefix) query.set("prefix", options.prefix)
      if (options.limit) query.set("max-keys", String(options.limit))
      if (options.cursor) query.set("continuation-token", options.cursor)
      const res = await this.client.fetch(
        `${this.base}/${this.bucket}?${query}`
      )
      if (!res.ok) throw httpError("LIST", res)
      const xml = await res.text()
      const files = []
      for (const { groups } of xml.matchAll(
        /<Contents>(?<block>[\s\S]*?)<\/Contents>/g
      )) {
        const block = groups!.block!
        files.push({
          key: xmlTag(block, "Key") ?? "",
          size: Number(xmlTag(block, "Size")) || 0,
          lastModified: new Date(xmlTag(block, "LastModified") ?? Date.now()),
          etag: xmlTag(block, "ETag"),
        })
      }
      return { files, nextCursor: xmlTag(xml, "NextContinuationToken") }
    } catch (error) {
      throw storageError("Failed to list files", "LIST_FAILED", error)
    }
  }

  async getSignedUploadUrl(
    options: Parameters<Storage["getSignedUploadUrl"]>[0]
  ): Promise<SignedUploadUrl> {
    const { key, contentType, size } = options
    try {
      const expiresIn = options.expiresIn ?? 3600
      const headers = {
        "Content-Type": contentType,
        ...(size === undefined ? {} : { "Content-Length": String(size) }),
      }
      const signed = await this.client.sign(
        `${this.objectUrl(key)}?X-Amz-Expires=${expiresIn}`,
        { method: "PUT", headers, aws: { signQuery: true } }
      )
      return {
        url: signed.url,
        method: "PUT",
        headers,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      }
    } catch (error) {
      throw storageError(
        `Failed to generate signed URL for: ${key}`,
        "SIGNED_URL_FAILED",
        error
      )
    }
  }

  getPublicUrl(key: string): string {
    if (this.publicUrl) return `${this.publicUrl.replace(/\/$/, "")}/${key}`
    return `/_emdash/api/media/file/${key}`
  }

  // EmDash adds this origin to the admin CSP connect-src for direct uploads.
  getClientUploadOrigin(): string {
    return new URL(this.base).origin
  }
}

const createStorage: CreateStorageFn = config =>
  new S3FetchStorage(resolveConfig(config))

export { createStorage, resolveConfig }
