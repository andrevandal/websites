import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test"
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

  test("returns a 200 reply to a ranged request without refetching", async () => {
    respondWith(new Response("hello", { headers: { "Content-Length": "5" } }))
    const result = await createStorage(config).download("a.txt", {
      range: { offset: 2, length: 3 },
    })
    expect(requests).toHaveLength(1)
    expect(requests[0]!.headers.get("Range")).toBe("bytes=2-4")
    expect(result.size).toBe(5)
    expect(result.range).toBeUndefined()
  })

  test("does not refetch after a ranged 404", async () => {
    respondWith(new Response("", { status: 404 }))
    const download = createStorage(config).download("x", {
      range: { offset: 0 },
    })
    expect(await codeOf(download)).toBe("NOT_FOUND")
    expect(requests).toHaveLength(1)
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

  test("decodes numeric entities once and passes the cursor", async () => {
    respondWith(
      new Response(
        "<ListBucketResult><Contents><Key>a&#13;b&#x1F600;&amp;lt;</Key><Size>1</Size></Contents></ListBucketResult>"
      )
    )
    const result = await createStorage(config).list({ cursor: "tok" })
    expect(
      new URL(requests[0]!.url).searchParams.get("continuation-token")
    ).toBe("tok")
    expect(result.files[0]!.key).toBe("a\rb\u{1F600}&lt;")
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

  // 403 is not retried by aws4fetch, which keeps this fast.
  test("surfaces server errors as DELETE_FAILED", async () => {
    respondWith(new Response("", { status: 403 }))
    expect(await codeOf(createStorage(config).delete("x"))).toBe(
      "DELETE_FAILED"
    )
  })
})

describe("signing and config", () => {
  test("signs requests and defaults the region to auto", async () => {
    Object.assign(process.env, {
      S3_ENDPOINT: "https://s3.example.com",
      S3_BUCKET: "media",
      S3_ACCESS_KEY_ID: "AKIAENV",
      S3_SECRET_ACCESS_KEY: "secret",
    })
    respondWith(new Response(""))
    await createStorage({}).exists("k")
    const { headers, url } = requests[0]!
    expect(url).toBe("https://s3.example.com/media/k")
    expect(headers.get("Authorization")).toMatch(
      /Credential=AKIAENV\/\d{8}\/auto\/s3\/aws4_request/
    )
    expect(headers.has("x-amz-date")).toBe(true)
    expect(headers.has("x-amz-content-sha256")).toBe(true)
  })
})

describe("upload", () => {
  test("PUTs a stream and reports size and public URL", async () => {
    respondWith(new Response(""))
    const body = new Response("hello").body!
    const result = await createStorage({
      ...config,
      publicUrl: "https://cdn.example.com/",
    }).upload({
      key: "a/b.txt",
      body,
      contentType: "text/plain",
      cacheControl: "max-age=60",
    })
    const req = requests[0]!
    expect(req.method).toBe("PUT")
    expect(req.headers.get("Content-Type")).toBe("text/plain")
    expect(req.headers.get("Cache-Control")).toBe("max-age=60")
    expect(await req.text()).toBe("hello")
    expect(result).toEqual({
      key: "a/b.txt",
      url: "https://cdn.example.com/a/b.txt",
      size: 5,
    })
  })

  test("falls back to the media route without a public URL", async () => {
    respondWith(new Response(""))
    const result = await createStorage(config).upload({
      key: "k.bin",
      body: new Uint8Array(3),
      contentType: "application/octet-stream",
    })
    expect(result.url).toBe("/_emdash/api/media/file/k.bin")
    expect(requests[0]!.headers.has("Cache-Control")).toBe(false)
  })

  test("maps rejection to UPLOAD_FAILED", async () => {
    respondWith(new Response("", { status: 403 }))
    const upload = createStorage(config).upload({
      key: "k",
      body: new Uint8Array(1),
      contentType: "text/plain",
    })
    expect(await codeOf(upload)).toBe("UPLOAD_FAILED")
  })
})

describe("exists", () => {
  test("maps 200, 404 and other statuses", async () => {
    respondWith(
      new Response(""),
      new Response("", { status: 404 }),
      new Response("", { status: 403 })
    )
    const storage = createStorage(config)
    expect(await storage.exists("a")).toBe(true)
    expect(await storage.exists("a")).toBe(false)
    expect(await codeOf(storage.exists("a"))).toBe("HEAD_FAILED")
    expect(requests[0]!.method).toBe("HEAD")
  })
})

describe("retries", () => {
  test("retries 5xx twice before giving up", async () => {
    const random = spyOn(Math, "random").mockReturnValue(0)
    try {
      respondWith(
        new Response("", { status: 500 }),
        new Response("", { status: 500 }),
        new Response("", { status: 500 })
      )
      expect(await codeOf(createStorage(config).delete("x"))).toBe(
        "DELETE_FAILED"
      )
      expect(requests).toHaveLength(3)
    } finally {
      random.mockRestore()
    }
  })
})
