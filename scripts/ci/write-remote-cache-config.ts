import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

// Writes moon's `remote:` block into the CI runner's (or the Docker builder
// stage's) ephemeral .moon/workspace.yml, immediately before moon runs. It is
// never committed: a committed `host:` would make every local moon invocation
// on every machine dial the VPS. Moon has no env-var override for
// `remote.auth.headers` (only MOON_REMOTE_AUTH_TOKEN, which is Bearer-shaped),
// and bazel-remote's auth is genuinely Basic, so this mutation is the
// mechanism.
// NOTE: This script deliberately uses console.log/console.error instead of consola
// because consola output is silently dropped when invoked via Bun.spawnSync from
// within a bun:test process (confirmed by reproduction). Do not revert to consola
// without first fixing that issue.

const repoRoot = resolve(import.meta.dirname, "../..")

const workspaceFile = resolve(
  repoRoot,
  process.env["REMOTE_CACHE_WORKSPACE_FILE"] || ".moon/workspace.yml"
)

const renderRemoteBlock = (host: string, api: string, credential: string) =>
  [
    "",
    "remote:",
    `  host: "${host}"`,
    `  api: ${api}`,
    "  auth:",
    "    headers:",
    `      Authorization: "Basic ${credential}"`,
    "",
  ].join("\n")

const run = () => {
  const host = process.env["MOON_REMOTE_HOST"] || ""
  if (host === "") {
    console.log(
      "MOON_REMOTE_HOST is unset - leaving .moon/workspace.yml unchanged (local execution, no remote cache)"
    )
    return 0
  }

  const username = process.env["MOON_REMOTE_HOST_USERNAME"] || ""
  const password = process.env["MOON_REMOTE_HOST_PASSWORD"] || ""
  if (username === "" || password === "") {
    console.error(
      "MOON_REMOTE_HOST is set, but MOON_REMOTE_HOST_USERNAME and MOON_REMOTE_HOST_PASSWORD must both be set"
    )
    return 1
  }

  const current = readFileSync(workspaceFile, "utf-8")
  if (/^remote:/m.test(current)) {
    console.error(
      `${workspaceFile} already declares a remote block - refusing to write a second one`
    )
    return 1
  }

  const api = host.startsWith("grpc") ? "grpc" : "http"
  const credential = Buffer.from(`${username}:${password}`).toString("base64")
  const next = `${current.trimEnd()}\n${renderRemoteBlock(host, api, credential)}`
  writeFileSync(workspaceFile, next)

  // The sha256 is how CI and the Docker build prove they wrote byte-identical
  // files - moon hashes .moon/*.yml into every task, so a one-byte difference
  // means zero shared cache entries.
  const digest = createHash("sha256").update(next).digest("hex")
  console.log(`remote cache configured (host=${host}, api=${api})`)
  console.log(`workspace.yml sha256=${digest}`)
  return 0
}

process.exit(run())
