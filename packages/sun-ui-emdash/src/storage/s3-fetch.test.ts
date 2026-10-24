import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { createStorage, resolveConfig } from "./s3-fetch.ts"

const config = {
  endpoint: "https://s3.example.com/",
  bucket: "media",
  accessKeyId: "AKIATEST",
  secretAccessKey: "secret",
}

const realFetch = globalThis.fetch
const envKeys = [
  "S3_ENDPOINT",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_REGION",
  "S3_PUBLIC_URL",
]
const savedEnv = Object.fromEntries(envKeys.map(k => [k, process.env[k]]))

let requests: Request[]
const respondWith = (...responses: Response[]) => {
  requests = []
  globalThis.fetch = (async (input: Request) => {
    requests.push(input)
    return responses.shift() ?? new Response("unexpected", { status: 500 })
  }) as unknown as typeof fetch
}

beforeEach(() => {
  for (const key of envKeys) delete process.env[key]
})
afterEach(() => {
  globalThis.fetch = realFetch
  for (const key of envKeys) {
    if (savedEnv[key] === undefined) delete process.env[key]
    else process.env[key] = savedEnv[key]
  }
})

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    return (error as { code?: string }).code
  }
  return undefined
}

describe("resolveConfig", () => {
  test("explicit values win over env", () => {
    process.env.S3_BUCKET = "from-env"
    process.env.S3_REGION = "eu"
    expect(resolveConfig(config)).toMatchObject({
      bucket: "media",
      region: "eu",
    })
  })

  test("rejects missing endpoint and bucket", () => {
    expect(() => resolveConfig({})).toThrow(/missing required S3 config/)
  })

  test("rejects non-http endpoints", () => {
    expect(() =>
      resolveConfig({ ...config, endpoint: "ftp://s3.example.com" })
    ).toThrow(/valid http\/https URL/)
  })

  test("rejects half a credential pair", () => {
    expect(() => resolveConfig({ ...config, secretAccessKey: "" })).toThrow(
      /credentials missing/
    )
  })
})

describe("download", () => {
  test("serves a suffix range from Content-Range", async () => {
    respondWith(
      new Response("0123456789", {
        status: 206,
        headers: {
          "Content-Range": "bytes 90-99/100",
          "Content-Type": "image/png",
        },
      })
    )
    const result = await createStorage(config).download("a/b.png", {
      range: { suffix: 10 },
    })
    expect(requests[0]!.headers.get("Range")).toBe("bytes=-10")
    expect(result).toMatchObject({
      contentType: "image/png",
      size: 100,
      range: { offset: 90, length: 10 },
    })
  })

  test("retries without Range when the range is unsatisfiable", async () => {
    respondWith(
      new Response("", { status: 416 }),
      new Response("hello", { headers: { "Content-Length": "5" } })
    )
    const result = await createStorage(config).download("a.txt", {
      range: { offset: 999 },
    })
    expect(requests[1]!.headers.has("Range")).toBe(false)
    expect(result.size).toBe(5)
    expect(result.range).toBeUndefined()
  })

  test("maps 404 to NOT_FOUND", async () => {
    respondWith(new Response("", { status: 404 }))
    expect(await codeOf(createStorage(config).download("x"))).toBe("NOT_FOUND")
  })
})

describe("list", () => {
  test("parses contents, unescapes keys and returns the cursor", async () => {
    respondWith(
      new Response(
        `<ListBucketResult>
          <Contents><Key>a/b&amp;c.png</Key><LastModified>2026-01-02T03:04:05.000Z</LastModified><ETag>&quot;e1&quot;</ETag><Size>12</Size></Contents>
          <Contents><Key>a/d.png</Key><LastModified>2026-01-03T00:00:00.000Z</LastModified><ETag>&quot;e2&quot;</ETag><Size>7</Size></Contents>
          <NextContinuationToken>tok</NextContinuationToken>
        </ListBucketResult>`
      )
    )
    const result = await createStorage(config).list({ prefix: "a/", limit: 2 })
    const url = new URL(requests[0]!.url)
    expect(url.pathname).toBe("/media")
    expect(url.searchParams.get("prefix")).toBe("a/")
    expect(url.searchParams.get("max-keys")).toBe("2")
    expect(result.nextCursor).toBe("tok")
    expect(result.files).toEqual([
      {
        key: "a/b&c.png",
        size: 12,
        lastModified: new Date("2026-01-02T03:04:05.000Z"),
        etag: '"e1"',
      },
      {
        key: "a/d.png",
        size: 7,
        lastModified: new Date("2026-01-03T00:00:00.000Z"),
        etag: '"e2"',
      },
    ])
  })

  test("returns no files and no cursor for an empty bucket", async () => {
    respondWith(new Response("<ListBucketResult></ListBucketResult>"))
    expect(await createStorage(config).list()).toEqual({
      files: [],
      nextCursor: undefined,
    })
  })
})

describe("getSignedUploadUrl", () => {
  test("signs a PUT query URL for the path-style object", async () => {
    const result = await createStorage(config).getSignedUploadUrl({
      key: "a/b c.png",
      contentType: "image/png",
      size: 5,
      expiresIn: 900,
    })
    const url = new URL(result.url)
    expect(url.origin + url.pathname).toBe(
      "https://s3.example.com/media/a/b%20c.png"
    )
    expect(url.searchParams.get("X-Amz-Expires")).toBe("900")
    expect(url.searchParams.has("X-Amz-Signature")).toBe(true)
    expect(result.method).toBe("PUT")
    expect(result.headers).toEqual({
      "Content-Type": "image/png",
      "Content-Length": "5",
    })
  })
})

describe("delete", () => {
  test("treats a missing object as deleted", async () => {
    respondWith(new Response("", { status: 404 }))
    await createStorage(config).delete("x")
  })

  test("surfaces server errors as DELETE_FAILED", async () => {
    respondWith(new Response("", { status: 500 }))
    expect(await codeOf(createStorage(config).delete("x"))).toBe(
      "DELETE_FAILED"
    )
  })
})
