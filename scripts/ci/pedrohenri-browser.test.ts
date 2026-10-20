import { afterAll, beforeAll, describe, expect, it } from "bun:test"
import { createHmac, timingSafeEqual } from "node:crypto"
import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import {
  corruptPreviewUrl,
  isTransformedImage,
  parseCliArgs,
  validateFixtures,
  validateOrigin,
} from "./pedrohenri-browser"
import type { FixtureConfig } from "./pedrohenri-browser"

const SENTINEL = "DO_NOT_ECHO_ISSUE197_572314"
const ORIGIN = "https://issue197-preview.example"
const fixtures: FixtureConfig = {
  postPreviewUrl: `${ORIGIN}/posts/never-published/?_preview=${SENTINEL}a`,
  categoryPreviewUrl: `${ORIGIN}/categorias/never-published/?_preview=${SENTINEL}b`,
  renderingPath: "/posts/issue-197-rendering/",
  gtagId: "G-TEST197",
  conversionId: "AW-123456789",
  conversionLabel: "test_label-197",
}
let directory: string
let fixturePath: string
let statePath: string
const script = fileURLToPath(
  new URL("./pedrohenri-browser.ts", import.meta.url)
)

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "issue197-browser-"))
  fixturePath = join(directory, "fixtures.json")
  statePath = join(directory, "state.json")
  await writeFile(fixturePath, JSON.stringify(fixtures))
  await writeFile(statePath, JSON.stringify({ cookies: [], origins: [] }))
})
afterAll(async () => {
  await rm(directory, { recursive: true, force: true })
})

const rejectedCli = async (args: string[]) => {
  const process = Bun.spawn([Bun.which("bun") ?? "bun", script, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  })
  const [code, stdout, stderr] = await Promise.all([
    process.exited,
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
  ])
  expect(code).not.toBe(0)
  expect(stdout + stderr).not.toContain(SENTINEL)
  // A rejected input must never proceed to the browser assertion phase.
  expect(stdout + stderr).not.toContain("failed assertions")
}
const args = () => [
  "--url",
  ORIGIN,
  "--storage-state",
  statePath,
  "--fixtures",
  fixturePath,
  "--phase",
  "analytics",
]

describe("fixtures and pure assertion logic", () => {
  it("retains exact valid settings including hostile script strings", () => {
    const hostile = {
      ...fixtures,
      gtagId:
        '</script><script id="issue197-injected">window.issue197Injected=1</script>',
      conversionLabel: "x',value:(window.issue197Injected=1),unused:'x",
    }
    expect(validateFixtures(hostile)).toEqual(hostile)
  })
  it("rejects nonobjects, missing keys, wrong types, and extra keys", () => {
    for (const value of [
      null,
      [],
      false,
      42,
      SENTINEL,
      {},
      { ...fixtures, gtagId: undefined },
      { ...fixtures, conversionId: null },
      { ...fixtures, conversionLabel: 1 },
      { ...fixtures, extra: SENTINEL },
    ])
      expect(() => validateFixtures(value)).toThrow()
  })
  it("rejects missing tokens, non-HTTPS URLs, credentials, and wrong rendering paths", () => {
    for (const value of [
      { ...fixtures, postPreviewUrl: `${ORIGIN}/posts/no-token/` },
      { ...fixtures, postPreviewUrl: "http://example.com/?_preview=token" },
      {
        ...fixtures,
        categoryPreviewUrl: "https://user:password@example.com/?_preview=token",
      },
      { ...fixtures, renderingPath: "//untrusted.example/" },
      { ...fixtures, gtagId: "" },
    ])
      expect(() => validateFixtures(value)).toThrow()
  })
  it("requires one bare origin matching both signed fixture URLs", () => {
    expect(validateOrigin(ORIGIN, fixtures)).toBe(ORIGIN)
    for (const value of [
      "not a URL",
      "http://example.com",
      `${ORIGIN}/path`,
      `${ORIGIN}?x=1`,
      `${ORIGIN}#fragment`,
      "https://other.example",
    ])
      expect(() => validateOrigin(value, fixtures)).toThrow()

    expect(() =>
      validateOrigin(ORIGIN, {
        ...fixtures,
        categoryPreviewUrl: "https://other.example/?_preview=token",
      })
    ).toThrow()
  })
  it("corrupts decoded HMAC signature bytes, not unused base64 padding bits", () => {
    const key = "issue197-test-signing-key"
    const header = Buffer.from('{"alg":"HS256"}').toString("base64url")
    let token = ""
    // Ending Y has the same decoded padding bits as a. This makes the old
    // last-character mutation demonstrably ineffective instead of probabilistic.
    for (let nonce = 0; nonce < 4096; nonce++) {
      const payload = Buffer.from(JSON.stringify({ nonce })).toString(
        "base64url"
      )
      const data = `${header}.${payload}`
      const signature = createHmac("sha256", key)
        .update(data)
        .digest("base64url")
      if (signature.endsWith("Y")) {
        token = `${data}.${signature}`
        break
      }
    }
    expect(token).not.toBe("")
    const valid = (value: string) => {
      const separator = value.lastIndexOf(".")
      const signature = Buffer.from(value.slice(separator + 1), "base64url")
      const expected = createHmac("sha256", key)
        .update(value.slice(0, separator))
        .digest()
      return (
        signature.length === expected.length &&
        timingSafeEqual(signature, expected)
      )
    }
    expect(valid(token)).toBe(true)
    const original = new URL(`${ORIGIN}/posts/draft/?x=1`)
    original.searchParams.set("_preview", token)
    const changed = new URL(corruptPreviewUrl(original.href))
    const changedToken = changed.searchParams.get("_preview") ?? ""
    expect(changed.pathname).toBe("/posts/draft/")
    expect(changed.searchParams.get("x")).toBe("1")
    expect(valid(changedToken)).toBe(false)
    expect(
      Buffer.from(changedToken.split(".").at(-1) ?? "", "base64url")
    ).not.toEqual(Buffer.from(token.split(".").at(-1) ?? "", "base64url"))
    expect(
      new URL(corruptPreviewUrl(`${ORIGIN}/?_preview=token`)).searchParams.get(
        "_preview"
      )
    ).toBe("aoken")
    expect(() => corruptPreviewUrl(ORIGIN)).toThrow()
  })
  it("detects actual transform endpoints, not host-prefix lookalikes", () => {
    expect(isTransformedImage("/_image?href=x", ORIGIN)).toBe(true)
    expect(
      isTransformedImage(
        "https://images-staging.example.invalid/width=432/image.png",
        ORIGIN
      )
    ).toBe(false)
    expect(
      isTransformedImage("https://images.example.invalid/image.png", ORIGIN)
    ).toBe(false)
    expect(isTransformedImage("/media/image.png", ORIGIN)).toBe(false)
    expect(
      isTransformedImage(
        "https://images.example.invalid.example/image.png",
        ORIGIN
      )
    ).toBe(false)
  })
  it("parses supported CLI arguments without launching a browser", async () => {
    const parsed = await parseCliArgs(["bun", script, ...args()])
    expect(parsed.phase).toBe("analytics")
    expect(parsed.url).toBe(ORIGIN)
  })
})

describe("spawned CLI rejection without input disclosure", () => {
  it.each(["--url", "--storage-state", "--fixtures", "--phase"])(
    "rejects missing %s",
    async missing => {
      const input = args()
      input.splice(input.indexOf(missing), 2)
      await rejectedCli(input)
    }
  )
  it("rejects malformed fixtures JSON without echoing its contents", async () => {
    const path = join(directory, "malformed.json")
    await writeFile(path, `{ "${SENTINEL}": `)
    const input = args()
    input[input.indexOf("--fixtures") + 1] = path
    await rejectedCli(input)
  })
  it("rejects extra fixture keys and values without echoing either", async () => {
    const path = join(directory, "extra.json")
    await writeFile(path, JSON.stringify({ ...fixtures, [SENTINEL]: SENTINEL }))
    const input = args()
    input[input.indexOf("--fixtures") + 1] = path
    await rejectedCli(input)
  })
  it("rejects wrong-origin signed URLs without echoing their tokens", async () => {
    const path = join(directory, "wrong-origin.json")
    await writeFile(
      path,
      JSON.stringify({
        ...fixtures,
        categoryPreviewUrl: `https://other.example/?_preview=${SENTINEL}`,
      })
    )
    const input = args()
    input[input.indexOf("--fixtures") + 1] = path
    await rejectedCli(input)
  })
  it("rejects invalid --url without echoing the input", async () => {
    const input = args()
    input[input.indexOf("--url") + 1] = SENTINEL
    await rejectedCli(input)
  })
  it("rejects unreadable storage state without echoing its path", async () => {
    const input = args()
    input[input.indexOf("--storage-state") + 1] = join(directory, SENTINEL)
    await rejectedCli(input)
  })
  it("rejects malformed storage state without echoing its contents", async () => {
    const path = join(directory, "invalid-state.json")
    await writeFile(path, `{ "cookies": "${SENTINEL}" }`)
    const input = args()
    input[input.indexOf("--storage-state") + 1] = path
    await rejectedCli(input)
  })
  it("rejects an unsupported phase without echoing it", async () => {
    const input = args()
    input[input.indexOf("--phase") + 1] = SENTINEL
    await rejectedCli(input)
  })
  it("rejects unknown flags without echoing them", async () => {
    await rejectedCli([...args(), `--${SENTINEL}`, SENTINEL])
  })
})
