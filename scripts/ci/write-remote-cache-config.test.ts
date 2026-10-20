import { expect, test } from "bun:test"
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const repoRoot = resolve(import.meta.dirname, "../..")

const BASE_WORKSPACE = `$schema: ./cache/schemas/workspace.json
projects:
  - apps/*
vcs:
  defaultBranch: main
`

const PASSWORD = "s3cr3t-Passw0rd"

const makeWorkspace = (body = BASE_WORKSPACE) => {
  const dir = mkdtempSync(join(tmpdir(), "remote-cache-"))
  const file = join(dir, "workspace.yml")
  writeFileSync(file, body)
  return file
}

const runScript = (file: string, env: Record<string, string>) => {
  const result = Bun.spawnSync(
    ["bun", "scripts/ci/write-remote-cache-config.ts"],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        MOON_REMOTE_HOST: "",
        MOON_REMOTE_API: "",
        BAZEL_REMOTE_BASIC_AUTH_USERNAME: "",
        BAZEL_REMOTE_BASIC_AUTH_PASSWORD: "",
        REMOTE_CACHE_WORKSPACE_FILE: file,
        ...env,
      },
    }
  )
  const decode = (buf: Uint8Array) => new TextDecoder().decode(buf)
  return {
    exitCode: result.exitCode,
    output: `${decode(result.stdout)}${decode(result.stderr)}`,
    contents: readFileSync(file, "utf-8"),
  }
}

test("no MOON_REMOTE_HOST leaves the workspace file untouched", () => {
  const file = makeWorkspace()
  const result = runScript(file, {})
  expect(result.exitCode).toBe(0)
  expect(result.contents).toBe(BASE_WORKSPACE)
})

test("writes a complete remote block with a Basic Auth header", () => {
  const file = makeWorkspace()
  const result = runScript(file, {
    MOON_REMOTE_HOST: "https://cache.example.dev",
    BAZEL_REMOTE_BASIC_AUTH_USERNAME: "ci-user",
    BAZEL_REMOTE_BASIC_AUTH_PASSWORD: PASSWORD,
  })
  expect(result.exitCode).toBe(0)
  expect(result.contents).toContain(BASE_WORKSPACE.trimEnd())
  expect(result.contents).toContain("\nremote:\n")
  expect(result.contents).toContain('  host: "https://cache.example.dev"')
  expect(result.contents).toContain("  api: http")
  expect(result.contents).toContain(
    '      Authorization: "Basic Y2ktdXNlcjpzM2NyM3QtUGFzc3cwcmQ="'
  )
})

test("MOON_REMOTE_API overrides the api field", () => {
  const file = makeWorkspace()
  const result = runScript(file, {
    MOON_REMOTE_HOST: "grpc://cache.example.dev:9092",
    MOON_REMOTE_API: "grpc",
    BAZEL_REMOTE_BASIC_AUTH_USERNAME: "ci-user",
    BAZEL_REMOTE_BASIC_AUTH_PASSWORD: PASSWORD,
  })
  expect(result.exitCode).toBe(0)
  expect(result.contents).toContain("  api: grpc")
})

test("never prints the password or the encoded credential", () => {
  const file = makeWorkspace()
  const result = runScript(file, {
    MOON_REMOTE_HOST: "https://cache.example.dev",
    BAZEL_REMOTE_BASIC_AUTH_USERNAME: "ci-user",
    BAZEL_REMOTE_BASIC_AUTH_PASSWORD: PASSWORD,
  })
  expect(result.output).not.toContain(PASSWORD)
  expect(result.output).not.toContain("Y2ktdXNlcjpzM2NyM3QtUGFzc3cwcmQ=")
})

test("prints the sha256 of the file it wrote", () => {
  const file = makeWorkspace()
  const result = runScript(file, {
    MOON_REMOTE_HOST: "https://cache.example.dev",
    BAZEL_REMOTE_BASIC_AUTH_USERNAME: "ci-user",
    BAZEL_REMOTE_BASIC_AUTH_PASSWORD: PASSWORD,
  })
  const printed = /workspace\.yml sha256=(?<digest>[0-9a-f]{64})/.exec(
    result.output
  )
  expect(printed).not.toBeNull()
  const digest = new Bun.CryptoHasher("sha256")
    .update(result.contents)
    .digest("hex")
  expect(printed?.groups?.digest).toBe(digest)
})

test("fails when the host is set but a credential is missing", () => {
  const file = makeWorkspace()
  const result = runScript(file, {
    MOON_REMOTE_HOST: "https://cache.example.dev",
    BAZEL_REMOTE_BASIC_AUTH_USERNAME: "ci-user",
  })
  expect(result.exitCode).toBe(1)
  expect(result.output).toContain("BAZEL_REMOTE_BASIC_AUTH_PASSWORD")
  expect(result.contents).toBe(BASE_WORKSPACE)
})

test("refuses to write a second remote block", () => {
  const existing = `${BASE_WORKSPACE}remote:\n  host: "https://old.example.dev"\n`
  const file = makeWorkspace(existing)
  const result = runScript(file, {
    MOON_REMOTE_HOST: "https://cache.example.dev",
    BAZEL_REMOTE_BASIC_AUTH_USERNAME: "ci-user",
    BAZEL_REMOTE_BASIC_AUTH_PASSWORD: PASSWORD,
  })
  expect(result.exitCode).toBe(1)
  expect(result.output).toContain("already declares a remote")
  expect(result.contents).toBe(existing)
})
