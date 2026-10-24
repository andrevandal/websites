import { v } from "./utils/schemas"
import { createHash } from "node:crypto"
import { cp, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, relative, resolve } from "node:path"
import { parseEnv } from "node:util"

import yargs from "yargs"
import { hideBin } from "yargs/helpers"

import { consola } from "consola"
import { execa } from "execa"
import { repoRoot, resolveTargetEnvVars } from "./env"
import { s3PublicUrl } from "../packages/sun-ui/src/astro/runtime-env"
import { queryTargets } from "./utils"
import {
  deleteD1DatabaseByName,
  deleteKvNamespaceByTitle,
  deleteR2BucketByName,
  findOrCreateD1Database,
  findOrCreateKvNamespace,
  findOrCreateR2Bucket,
  putR2Object,
  queryD1,
} from "./utils/cloudflare"
import { applySeedExtensions } from "./seed-extensions"
import type { PutMedia, Seed, SeedDb } from "./seed-extensions"

type KvBinding = { binding: string; id?: string }
type D1Binding = { binding: string; database_name: string; database_id: string }
type R2Binding = { binding: string; bucket_name: string }

type WranglerConfig = {
  name: string
  kv_namespaces?: KvBinding[]
  d1_databases?: D1Binding[]
  r2_buckets?: R2Binding[]
  vars?: Record<string, string>
  previews?: {
    vars?: Record<string, string>
    kv_namespaces?: KvBinding[]
    d1_databases?: D1Binding[]
    r2_buckets?: R2Binding[]
  }
}

type DeployDeps = {
  // Runs `bunx <args>`; `reject: false` returns a failed exit code instead of throwing.
  exec: (
    args: string[],
    options: { cwd: string; reject?: boolean; env?: Record<string, string> }
  ) => Promise<{ stdout: string; stderr?: string; exitCode: number }>
  kv: {
    findOrCreate: (title: string) => Promise<{ id: string; created: boolean }>
    deleteByTitle: (title: string) => Promise<boolean>
  }
  d1: {
    findOrCreate: (name: string) => Promise<{ id: string; created: boolean }>
    deleteByName: (name: string) => Promise<boolean>
  }
  r2: {
    findOrCreate: (name: string) => Promise<{ name: string; created: boolean }>
    deleteByName: (name: string) => Promise<boolean>
  }
  files: {
    read: (path: string) => Promise<string>
    write: (path: string, content: string) => Promise<void>
    copyDir: (from: string, to: string) => Promise<void>
    tempDir: () => Promise<string>
  }
}

// What setupPreview needs on top of the deploy deps: the preview's HTTP
// surface plus D1 and R2 access for the seed extensions.
type SetupDeps = DeployDeps & {
  fetch: typeof fetch
  seedDb: (databaseId: string) => SeedDb
  putMedia: (bucket: string) => PutMedia
}

type PreviewTarget = {
  siteDir: string
  generatedConfigPath: string
  // Base Worker name; Previews are scoped to it, never separate Workers.
  worker: string
  pr: number | undefined
}

type VersionTarget = {
  siteDir: string
  // Production is the base Worker; staging is its own `<worker>-staging`
  // Worker, so its workers.dev host is `<site>-staging`.
  worker: string
}

const stageWorkerName = (worker: string, stage: "staging" | "production") =>
  stage === "staging" ? `${worker}-staging` : worker

// Only production workers can have a Cloudflare Custom Domain bound in the
// dashboard (see websites/vandallabs/README.md). Keyed by the base Worker name
// (wrangler.json's `name` field), not the CLI target string.
const CUSTOM_DOMAINS: Record<string, string> = {
  vandallabs: "https://vandallabs.com.br",
  bellypao: "https://bellypao.com.br",
  pedrohenridesign: "https://pedrohenridesign.com.br",
}

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

const requirePr = (pr: number | undefined): number => {
  if (pr === undefined || !Number.isInteger(pr) || pr <= 0) {
    throw new Error(
      "Preview deploys and cleanup require --pr <N> (a positive integer pull request number)."
    )
  }

  return pr
}

const previewJsonSchema = v.object({
  preview: v.object({ urls: v.pipe(v.array(v.string()), v.minLength(1)) }),
})

// wrangler prints notices (e.g. "Using redirected Wrangler configuration.")
// to stdout ahead of the --json payload, so parse from the line that opens it.
const resolvePreviewUrl = (stdout: string): string => {
  const parsed = v.safeParse(
    v.pipe(v.string(), v.parseJson(), previewJsonSchema),
    stdout.slice(Math.max(stdout.search(/^\{/m), 0))
  )

  if (!parsed.success) {
    throw new Error(
      `Could not read a Preview URL from wrangler preview --json output: ${stdout.slice(0, 200)}`
    )
  }

  return parsed.output.preview.urls[0]!
}

// Sites whose EmDash core migrations CI applies; their Worker runs
// `migrations.runtime: "check"` and never migrates (or locks) itself.
const CI_MIGRATED_SITES: Record<string, true> = {
  pedrohenridesign: true,
  brunabraz: true,
}

const migrationStatusSchema = v.object({
  target: v.object({ fingerprint: v.string(), label: v.string() }),
  pending: v.array(v.string()),
  unknownApplied: v.array(v.string()),
})

// `emdash migrate --status --json` prints header lines to stderr and one JSON
// object to stdout, but exec pipes both through, so parse from the opening line.
const parseMigrationStatus = (stdout: string) => {
  const parsed = v.safeParse(
    v.pipe(v.string(), v.parseJson(), migrationStatusSchema),
    stdout.slice(Math.max(stdout.search(/^\{/m), 0))
  )

  if (!parsed.success) {
    throw new Error(
      `Could not read emdash migrate --status --json output: ${stdout.slice(0, 200)}`
    )
  }

  return parsed.output
}

// Applies the build's pending core migrations to the target `targetArgs`
// selects, pinned to the fingerprint the status call just reported so the
// apply cannot land on a different database. Returns the applied names.
const applyCoreMigrations = async (
  {
    cwd,
    targetArgs,
    env,
  }: { cwd: string; targetArgs: string[]; env?: Record<string, string> },
  deps: DeployDeps
): Promise<string[]> => {
  const { stdout } = await deps.exec(
    ["emdash", "migrate", "--status", "--json", ...targetArgs],
    { cwd, env }
  )
  const report = parseMigrationStatus(stdout)

  if (report.unknownApplied.length > 0) {
    throw new Error(
      `Database ${report.target.label} has migration records unknown to this build: ${report.unknownApplied.join(", ")}. Not migrating.`
    )
  }
  if (report.pending.length === 0) return []

  await deps.exec(
    [
      "emdash",
      "migrate",
      "--json",
      "--expected-target-fingerprint",
      report.target.fingerprint,
      ...targetArgs,
    ],
    { cwd, env }
  )

  return report.pending
}

// PR resources bind only under previews; the persistent Worker's config stays
// untouched. Selected native EmDash previews add isolated CMS data and media.
const deployPreview = async (
  {
    siteDir,
    generatedConfigPath,
    worker,
    pr,
    vars,
  }: PreviewTarget & {
    vars: Record<string, string>
  },
  deps: DeployDeps
): Promise<{
  url: string
  databaseId?: string | undefined
  bucketName?: string | undefined
}> => {
  const prNumber = requirePr(pr)
  const namespace = await deps.kv.findOrCreate(`${worker}-pr-${prNumber}`)
  const nativeBindings: {
    d1_databases?: D1Binding[]
    r2_buckets?: R2Binding[]
  } = {}
  let databaseId: string | undefined
  let bucketName: string | undefined
  if (worker === "pedrohenridesign" || worker === "brunabraz") {
    const databaseName = `${worker}-pr-${prNumber}-cms`
    const database = await deps.d1.findOrCreate(databaseName)
    if (Object.hasOwn(CI_MIGRATED_SITES, worker)) {
      const accountId = process.env["CLOUDFLARE_ACCOUNT_ID"]
      if (!accountId) {
        throw new Error(
          `CLOUDFLARE_ACCOUNT_ID is required to migrate ${databaseName}.`
        )
      }
      const applied = await applyCoreMigrations(
        {
          cwd: siteDir,
          targetArgs: ["--d1", database.id, "--account-id", accountId],
        },
        deps
      )
      consola.info(
        applied.length > 0
          ? `Applied ${applied.length} EmDash migrations to ${databaseName}: ${applied.join(", ")}`
          : `No pending EmDash migrations for ${databaseName}`
      )
    }
    const bucket = await deps.r2.findOrCreate(`${worker}-pr-${prNumber}-media`)
    databaseId = database.id
    bucketName = bucket.name
    nativeBindings.d1_databases = [
      { binding: "DB", database_name: databaseName, database_id: database.id },
    ]
    nativeBindings.r2_buckets = [{ binding: "MEDIA", bucket_name: bucket.name }]
  }
  const generatedConfig = JSON.parse(
    await deps.files.read(generatedConfigPath)
  ) as WranglerConfig

  await deps.files.write(
    generatedConfigPath,
    JSON.stringify(
      {
        ...generatedConfig,
        previews: {
          ...generatedConfig.previews,
          vars,
          kv_namespaces: [{ binding: "SESSION", id: namespace.id }],
          ...nativeBindings,
        },
      },
      null,
      2
    )
  )

  const { stdout } = await deps.exec(
    [
      "wrangler",
      "preview",
      "--name",
      `pr-${prNumber}`,
      "--worker-name",
      stageWorkerName(worker, "staging"),
      "--json",
    ],
    { cwd: siteDir }
  )

  return { url: resolvePreviewUrl(stdout), databaseId, bucketName }
}

type SetupSeed = Seed & { settings: { title: string; tagline?: string } }

const SETUP_MAX_REQUESTS = 20

// Runs EmDash setup on a fresh Preview from CI: the bundled seed through the
// Worker's public setup route (repeated until it reports the seed complete),
// then the extras the seed format cannot carry. A 409 means a human or an
// earlier run already configured it; that data is left alone.
const setupPreview = async (
  {
    siteDir,
    url,
    databaseId,
    bucketName,
    accessClientId,
    accessClientSecret,
  }: {
    siteDir: string
    url: string
    databaseId: string
    bucketName: string
    accessClientId: string
    accessClientSecret: string
  },
  deps: SetupDeps
): Promise<"configured" | "already-configured"> => {
  const seed = JSON.parse(
    await deps.files.read(join(siteDir, "seed/seed.json"))
  ) as SetupSeed
  const body = JSON.stringify({
    title: seed.settings.title,
    tagline: seed.settings.tagline,
    includeContent: true,
  })

  let seeded = false
  let alreadyConfigured = false
  for (let request = 0; request < SETUP_MAX_REQUESTS && !seeded; request += 1) {
    // oxlint-disable-next-line no-await-in-loop -- each request resumes where the last stopped
    const response = await deps.fetch(`${url}/_emdash/api/setup`, {
      method: "POST",
      redirect: "manual",
      headers: {
        "Content-Type": "application/json",
        "X-EmDash-Request": "1",
        "CF-Access-Client-Id": accessClientId,
        "CF-Access-Client-Secret": accessClientSecret,
      },
      body,
    })
    if (response.status >= 300 && response.status < 400) {
      throw new Error(
        `Access did not accept the service token for ${url}; add the Service Auth policy (docs/guides/cloudflare-access-for-previews.md)`
      )
    }
    if (response.status === 409) {
      alreadyConfigured = true
      break
    }
    // oxlint-disable-next-line no-await-in-loop -- read once per request
    const text = await response.text()
    if (!response.ok) {
      throw new Error(
        `Preview setup failed (${response.status}): ${text.slice(0, 300)}`
      )
    }
    const payload = JSON.parse(text) as { data?: { seedComplete?: boolean } }
    seeded = payload.data?.seedComplete === true
  }
  if (!seeded && !alreadyConfigured) {
    throw new Error(
      `Preview setup did not finish seeding after ${SETUP_MAX_REQUESTS} requests.`
    )
  }

  const db = deps.seedDb(databaseId)
  const { settings, entries, bylines, failed } = await applySeedExtensions({
    seed,
    db,
    putMedia: deps.putMedia(bucketName),
  })
  consola.info(`Settings media resolved: ${settings.join(", ") || "none"}`)
  consola.info(`SEO panels seeded: ${entries.join(", ") || "none"}`)
  consola.info(`Bylines updated: ${bylines.join(", ") || "none"}`)
  for (const failedUrl of failed)
    consola.warn(`Media download failed: ${failedUrl}`)

  return alreadyConfigured ? "already-configured" : "configured"
}

const cleanupPreview = async (
  { siteDir, worker, pr }: Omit<PreviewTarget, "generatedConfigPath">,
  deps: DeployDeps
): Promise<{
  previewDeleted: boolean
  kvDeleted: boolean
  d1Deleted?: boolean
  r2Deleted?: boolean
}> => {
  const prNumber = requirePr(pr)
  // Idempotent: the Preview may never have been created for this PR.
  const { exitCode } = await deps.exec(
    [
      "wrangler",
      "preview",
      "delete",
      "--name",
      `pr-${prNumber}`,
      "--worker-name",
      stageWorkerName(worker, "staging"),
      "--skip-confirmation",
    ],
    { cwd: siteDir, reject: false }
  )
  const kvDeleted = await deps.kv.deleteByTitle(`${worker}-pr-${prNumber}`)
  if (worker === "pedrohenridesign" || worker === "brunabraz") {
    const d1Deleted = await deps.d1.deleteByName(`${worker}-pr-${prNumber}-cms`)
    const r2Deleted = await deps.r2.deleteByName(
      `${worker}-pr-${prNumber}-media`
    )
    return { previewDeleted: exitCode === 0, kvDeleted, d1Deleted, r2Deleted }
  }

  return { previewDeleted: exitCode === 0, kvDeleted }
}

// Preview Base holds this one; staging and production never receive it.
const PREVIEW_ONLY_SECRET_KEYS = new Set(["CF_ACCESS_AUDIENCE"])

// EmDash sites CI migrates need their database, bucket and encryption key.
// S3_PUBLIC_URL is derived from endpoint and bucket when absent, so it is
// not required; the other sites read their asset base from build defaults.
const requiredSecretKeys = (worker: string): string[] =>
  Object.hasOwn(CI_MIGRATED_SITES, worker)
    ? [
        "TURSO_DATABASE_URL",
        "TURSO_AUTH_TOKEN",
        "S3_ENDPOINT",
        "S3_BUCKET",
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY",
        "EMDASH_ENCRYPTION_KEY",
      ]
    : []

// The Infisical action exports `/websites/<target>` for the job's Stage here.
const SITE_SECRETS_FILE =
  process.env["SITE_SECRETS_FILE"] ?? resolve(repoRoot, ".site-secrets.env")

// Every key under the site's Infisical path is a runtime secret. A key left
// empty would make `wrangler versions upload` keep the previous Version's
// value, so production would inherit staging's: empty values are rejected
// (an explicitly empty S3_PUBLIC_URL included). Only names are reported.
const parseStageSecrets = (
  worker: string,
  stage: "staging" | "production",
  content: string
): Record<string, string> => {
  const secrets = Object.fromEntries(
    Object.entries(parseEnv(content)).filter(
      ([key]) => !PREVIEW_ONLY_SECRET_KEYS.has(key)
    )
  )
  const missing = [
    ...requiredSecretKeys(worker).filter(key => !(key in secrets)),
    ...Object.keys(secrets).filter(key => !secrets[key]),
  ]
  if (missing.length > 0) {
    throw new Error(
      `Infisical ${stage} secrets are missing or empty: ${missing.join(", ")}.`
    )
  }
  // Endpoint and bucket are validated above, so a CMS site always derives one.
  const publicUrl = s3PublicUrl(key => secrets[key])
  if (Object.hasOwn(CI_MIGRATED_SITES, worker) && publicUrl)
    secrets["S3_PUBLIC_URL"] = publicUrl

  return secrets
}

const readStageSecrets = async (
  worker: string,
  stage: "staging" | "production"
): Promise<Record<string, string>> =>
  parseStageSecrets(
    worker,
    stage,
    await readFile(SITE_SECRETS_FILE, "utf-8").catch(() => "")
  )

// Uploads, never deploys, a Version built from `artifactDir`. The artifact is
// copied first so its bytes, and therefore its digest, never carry Stage
// config or secrets; only the disposable copy gets the Stage vars and SESSION
// binding, and `secrets` go to wrangler through a separate --secrets-file.
const versionUpload = async (
  {
    worker,
    artifactDir,
    vars,
    secrets = {},
  }: VersionTarget & {
    artifactDir: string
    vars: Record<string, string>
    secrets?: Record<string, string>
  },
  deps: DeployDeps
): Promise<{ versionId: string }> => {
  const namespace = await deps.kv.findOrCreate(worker)
  const uploadDir = await deps.files.tempDir()
  await deps.files.copyDir(artifactDir, uploadDir)

  const configPath = join(uploadDir, "server/wrangler.json")
  const config = JSON.parse(await deps.files.read(configPath)) as WranglerConfig

  if (!config.kv_namespaces?.length) {
    throw new Error(
      `${configPath} has no kv_namespaces entry; is ${artifactDir} a website build?`
    )
  }

  await deps.files.write(
    configPath,
    JSON.stringify(
      {
        ...config,
        vars: { ...config.vars, ...vars },
        kv_namespaces: [{ binding: "SESSION", id: namespace.id }],
      },
      null,
      2
    )
  )

  // Outside the upload copy, so the secrets never sit next to the artifact.
  let secretsPath: string | undefined
  if (Object.keys(secrets).length > 0) {
    secretsPath = join(await deps.files.tempDir(), "secrets.json")
    await deps.files.write(secretsPath, JSON.stringify(secrets))
  }

  const wranglerArgs = [
    "--name",
    worker,
    "-c",
    configPath,
    ...(secretsPath ? ["--secrets-file", secretsPath] : []),
  ]
  let upload = await deps.exec(
    ["wrangler", "versions", "upload", ...wranglerArgs],
    { cwd: uploadDir, reject: false }
  )
  // `versions upload` cannot create a Worker; the first `deploy` must. Later
  // runs find the Worker and take the normal Version path.
  if (upload.exitCode !== 0 && upload.stderr?.includes("does not yet exist")) {
    upload = await deps.exec(["wrangler", "deploy", ...wranglerArgs], {
      cwd: uploadDir,
      reject: false,
    })
  }
  if (upload.exitCode !== 0)
    throw new Error(`wrangler failed for ${worker} (exit ${upload.exitCode}).`)

  const versionId = upload.stdout.match(
    new RegExp(
      `(?:Worker|Current) Version ID:\\s*(?<id>${UUID_PATTERN.source})`,
      "i"
    )
  )?.groups?.["id"]

  if (!versionId) {
    throw new Error(
      "Could not determine Worker Version ID from wrangler output."
    )
  }

  return { versionId }
}

const versionDeploy = async (
  { siteDir, worker, versionId }: VersionTarget & { versionId: string },
  deps: DeployDeps
): Promise<void> => {
  if (!new RegExp(`^${UUID_PATTERN.source}$`, "i").test(versionId))
    throw new Error(`Not a Worker Version ID: "${versionId}".`)

  await deps.exec(
    [
      "wrangler",
      "versions",
      "deploy",
      `${versionId}@100%`,
      "--name",
      worker,
      "--yes",
    ],
    { cwd: siteDir }
  )
}

type EmdashManifest = {
  database: { executorEntrypoint: string; executorConfig: object }
}

// Applies the build's pending core migrations to the stage's Turso database.
// The manifest was built without TURSO_DATABASE_URL, so a copy outside the
// artifact (like secrets.json) carries the stage's real URL; the auth token
// reaches the libSQL executor through the env var the manifest names.
const migrateStage = async (
  {
    siteDir,
    manifestPath,
    secrets,
  }: {
    siteDir: string
    manifestPath: string
    secrets: Record<string, string>
  },
  deps: DeployDeps
): Promise<string[]> => {
  const manifest = JSON.parse(
    await deps.files.read(manifestPath)
  ) as EmdashManifest
  const { executorEntrypoint } = manifest.database
  if (executorEntrypoint !== "emdash/internal/db/libsql-migrations") {
    throw new Error(
      `${manifestPath} is not a libSQL build manifest (executor ${executorEntrypoint}).`
    )
  }
  const url = secrets["TURSO_DATABASE_URL"]
  const authToken = secrets["TURSO_AUTH_TOKEN"]
  if (!url || !authToken) {
    throw new Error(
      "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are required to migrate the stage database."
    )
  }

  const tempManifestPath = join(await deps.files.tempDir(), "migrations.json")
  await deps.files.write(
    tempManifestPath,
    JSON.stringify({
      ...manifest,
      database: {
        ...manifest.database,
        executorConfig: { ...manifest.database.executorConfig, url },
      },
    })
  )

  return applyCoreMigrations(
    {
      cwd: siteDir,
      targetArgs: ["--manifest", tempManifestPath],
      env: { TURSO_AUTH_TOKEN: authToken },
    },
    deps
  )
}

// Content digest of a build output: every file (hidden ones included), by
// relative path and bytes, in sorted path order.
const digestDirectory = async (dir: string): Promise<string> => {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true })
  const paths = entries
    .filter(entry => entry.isFile())
    .map(entry => relative(dir, join(entry.parentPath, entry.name)))
    .toSorted()
  const hash = createHash("sha256")

  for (const path of paths) {
    // oxlint-disable-next-line no-await-in-loop -- digest order must follow sorted paths
    const content = await readFile(join(dir, path))
    hash.update(
      `${path}\0${createHash("sha256").update(content).digest("hex")}\n`
    )
  }

  return hash.digest("hex")
}

const appendGitHubFile = async (variable: string, content: string) => {
  const path = process.env[variable]
  if (path) await writeFile(path, content, { flag: "a" })
}

const nodeFiles: DeployDeps["files"] = {
  read: path => readFile(path, "utf-8"),
  write: (path, content) => writeFile(path, content),
  copyDir: (from, to) => cp(from, to, { recursive: true }),
  tempDir: () => mkdtemp(join(tmpdir(), "website-upload-")),
}

const realDeps: SetupDeps = {
  exec: async (args, { cwd, reject = true, env }) => {
    const proc = execa("bunx", args, { cwd, reject, env })
    proc.stdout?.pipe(process.stdout)
    proc.stderr?.pipe(process.stderr)
    const { stdout, stderr, exitCode } = await proc
    return {
      stdout: String(stdout),
      stderr: String(stderr ?? ""),
      exitCode: exitCode ?? 1,
    }
  },
  kv: {
    findOrCreate: async title => {
      const { namespace, created } = await findOrCreateKvNamespace(title)
      return { id: namespace.id, created }
    },
    deleteByTitle: deleteKvNamespaceByTitle,
  },
  d1: {
    findOrCreate: async name => {
      const { database, created } = await findOrCreateD1Database(name)
      return { id: database.uuid, created }
    },
    deleteByName: deleteD1DatabaseByName,
  },
  r2: {
    findOrCreate: async name => {
      const { bucket, created } = await findOrCreateR2Bucket(name)
      return { name: bucket.name, created }
    },
    deleteByName: deleteR2BucketByName,
  },
  files: nodeFiles,
  fetch,
  seedDb: databaseId => ({
    get: async <T>(sql: string, params: unknown[]) =>
      (await queryD1<T>(databaseId, sql, params)).results[0],
    all: async <T>(sql: string, params: unknown[]) =>
      (await queryD1<T>(databaseId, sql, params)).results,
    run: async (sql, params) => ({
      changes: (await queryD1(databaseId, sql, params)).changes,
    }),
  }),
  putMedia: bucket => (key, body, mimeType) =>
    putR2Object(bucket, key, body, mimeType),
}

if (import.meta.main) {
  const availableTargets = await queryTargets(),
    targetPositional = {
      describe: "The website target name",
      type: "string",
      choices: Object.keys(availableTargets),
      demandOption: true,
    } as const,
    prOption = {
      type: "number",
      describe: "Pull request number; names Preview pr-<N>",
      demandOption: true,
    } as const,
    args = await yargs(hideBin(process.argv))
      .scriptName("deploy")
      .command(
        "preview <target>",
        "Create or update Workers Preview pr-<N> of the target's Worker",
        builder =>
          builder.positional("target", targetPositional).option("pr", prOption)
      )
      .command(
        "cleanup <target>",
        "Delete Workers Preview pr-<N> and its KV, plus selected sites' D1 and R2 resources",
        builder =>
          builder.positional("target", targetPositional).option("pr", prOption)
      )
      .command(
        "version-upload <target>",
        "Upload (not deploy) a Version from a built dist with one Stage's config",
        builder =>
          builder
            .positional("target", targetPositional)
            .option("stage", {
              choices: ["staging", "production"] as const,
              demandOption: true,
            })
            .option("artifact-dir", {
              type: "string",
              describe: "Restored website dist directory (client/ and server/)",
              demandOption: true,
            })
      )
      .command(
        "check-secrets <target>",
        "Check the stage's Infisical secrets are in the environment, without uploading",
        builder =>
          builder.positional("target", targetPositional).option("stage", {
            choices: ["staging", "production"] as const,
            demandOption: true,
          })
      )
      .command(
        "version-deploy <target>",
        "Send 100% of traffic to an uploaded Version",
        builder =>
          builder
            .positional("target", targetPositional)
            .option("stage", {
              choices: ["staging", "production"] as const,
              demandOption: true,
            })
            .option("version-id", {
              type: "string",
              demandOption: true,
            })
      )
      .command(
        "migrate <target>",
        "Apply the build's pending EmDash core migrations to a stage's Turso database (secrets from the environment)",
        builder =>
          builder
            .positional("target", targetPositional)
            .option("stage", {
              choices: ["staging", "production"] as const,
              demandOption: true,
            })
            .option("manifest", {
              type: "string",
              describe: "EmDash build manifest (.emdash/migrations.json)",
              demandOption: true,
            })
      )
      .command(
        "digest <dir>",
        "Print the content digest of a build output directory",
        builder =>
          builder.positional("dir", { type: "string", demandOption: true })
      )
      .example("$0 preview vandallabs --pr 123", "Create Preview pr-123")
      .example("$0 cleanup vandallabs --pr 123", "Delete Preview pr-123")
      .example(
        "$0 version-upload vandallabs --stage staging --artifact-dir websites/vandallabs/dist",
        "Upload the staging Version of Worker vandallabs-staging"
      )
      .example(
        "$0 version-deploy vandallabs --stage production --version-id <uuid>",
        "Promote a production-configured Version"
      )
      .demandCommand(1)
      .strict()
      .help()
      .parse()

  try {
    const [command] = args._

    if (command === "digest") {
      console.log(await digestDirectory(resolve(`${args["dir"]}`)))
      process.exit(0)
    }

    const project = availableTargets[`${args["target"]}`]

    if (!project) throw new Error(`Target not found.`)

    const siteDir = resolve(repoRoot, ...project.location),
      { name: worker } = JSON.parse(
        await readFile(resolve(siteDir, "wrangler.json"), "utf-8")
      ) as WranglerConfig,
      pr = args["pr"] as number | undefined

    if (command === "cleanup") {
      const { previewDeleted, kvDeleted, d1Deleted, r2Deleted } =
        await cleanupPreview({ siteDir, worker, pr }, realDeps)
      const lines = [
        `Preview "pr-${pr}" of Worker "${worker}": ${previewDeleted ? "deleted" : "not deleted (absent or failed, see log)"}`,
        `KV namespace "${worker}-pr-${pr}": ${kvDeleted ? "deleted" : "not found"}`,
      ]
      if (d1Deleted !== undefined) {
        lines.push(
          `D1 database "${worker}-pr-${pr}-cms": ${d1Deleted ? "deleted" : "not found"}`
        )
      }
      if (r2Deleted !== undefined) {
        lines.push(
          `R2 bucket "${worker}-pr-${pr}-media": ${r2Deleted ? "emptied and deleted" : "not found"}`
        )
      }

      for (const line of lines) consola.info(line)
      await appendGitHubFile(
        "GITHUB_STEP_SUMMARY",
        `### Cleanup: \`${worker}\`\n${lines.map(line => `- ${line}`).join("\n")}\n\n`
      )
    }

    if (command === "preview") {
      const { url, databaseId, bucketName } = await deployPreview(
        {
          siteDir,
          generatedConfigPath: resolve(siteDir, "dist/server/wrangler.json"),
          worker,
          pr,
          vars: resolveTargetEnvVars(project.location, "preview"),
        },
        realDeps
      )

      consola.success(`Preview deployed to: ${url}`)
      await appendGitHubFile("GITHUB_OUTPUT", `deploy-url=${url}\n`)
      await appendGitHubFile(
        "GITHUB_STEP_SUMMARY",
        `### Preview: \`${worker}\` pr-${pr}\n- Preview URL: ${url}\n\n`
      )

      if (
        Object.hasOwn(CI_MIGRATED_SITES, worker) &&
        databaseId &&
        bucketName
      ) {
        const accessClientId = process.env["CF_ACCESS_CLIENT_ID"],
          accessClientSecret = process.env["CF_ACCESS_CLIENT_SECRET"]
        if (!accessClientId || !accessClientSecret) {
          consola.warn(
            "Skipping preview setup: CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET are not set"
          )
        } else {
          const outcome = await setupPreview(
            {
              siteDir,
              url,
              databaseId,
              bucketName,
              accessClientId,
              accessClientSecret,
            },
            realDeps
          )
          await appendGitHubFile(
            "GITHUB_STEP_SUMMARY",
            outcome === "configured"
              ? "- CMS setup: configured from seed/seed.json\n\n"
              : "- CMS setup: already configured\n\n"
          )
        }
      }
    }

    if (command === "check-secrets") {
      const stage = args["stage"] as "staging" | "production"
      const secrets = await readStageSecrets(worker, stage)
      // Keeps secret values out of every later log line of the job, e.g. the
      // Turso URL `emdash migrate` prints as its target label.
      if (process.env["GITHUB_ACTIONS"] === "true") {
        for (const value of Object.values(secrets))
          console.log(`::add-mask::${value}`)
      }
      consola.success(`${stage} secrets for "${worker}" are valid.`)
    }

    if (command === "migrate") {
      const stage = args["stage"] as "staging" | "production",
        applied = await migrateStage(
          {
            siteDir,
            manifestPath: resolve(`${args["manifest"]}`),
            secrets: await readStageSecrets(worker, stage),
          },
          realDeps
        )

      consola.success(
        applied.length > 0
          ? `Applied ${applied.length} EmDash migrations to the ${stage} database of "${worker}": ${applied.join(", ")}`
          : `No pending EmDash migrations for the ${stage} database of "${worker}"`
      )
      await appendGitHubFile(
        "GITHUB_STEP_SUMMARY",
        `### ${stage} migrations: \`${worker}\`\n${applied.length > 0 ? applied.map(name => `- ${name}`).join("\n") : "- none pending"}\n\n`
      )
    }

    if (command === "version-upload") {
      const stage = args["stage"] as "staging" | "production",
        stageWorker = stageWorkerName(worker, stage),
        { versionId } = await versionUpload(
          {
            siteDir,
            worker: stageWorker,
            artifactDir: resolve(`${args["artifactDir"]}`),
            vars: resolveTargetEnvVars(project.location, stage),
            secrets: await readStageSecrets(worker, stage),
          },
          realDeps
        )

      consola.success(
        `Uploaded ${stage} Version ${versionId} of "${stageWorker}"`
      )
      await appendGitHubFile("GITHUB_OUTPUT", `version-id=${versionId}\n`)
      await appendGitHubFile(
        "GITHUB_STEP_SUMMARY",
        `### ${stage} Version: \`${stageWorker}\`\n- Version ID: ${versionId}\n\n`
      )
    }

    if (command === "version-deploy") {
      const versionId = `${args["versionId"]}`,
        stage = args["stage"] as "staging" | "production",
        stageWorker = stageWorkerName(worker, stage),
        customDomain =
          stage === "production" ? CUSTOM_DOMAINS[worker] : undefined

      await versionDeploy({ siteDir, worker: stageWorker, versionId }, realDeps)
      consola.success(
        `Version ${versionId} of "${stageWorker}" serves 100% of traffic.`
      )
      if (customDomain) {
        consola.info(
          `Production custom domain (dashboard-managed): ${customDomain}`
        )
      }

      await appendGitHubFile(
        "GITHUB_OUTPUT",
        customDomain ? `custom-domain=${customDomain}\n` : ""
      )
      await appendGitHubFile(
        "GITHUB_STEP_SUMMARY",
        `### ${stage}: \`${stageWorker}\`\n- Deployed Version: ${versionId} (100%)\n${customDomain ? `- Production domain: ${customDomain}\n` : ""}\n`
      )
    }
  } catch (err) {
    consola.error((err as Error).message)
    process.exit(1)
  }
}

export {
  applyCoreMigrations,
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
}
export type { DeployDeps, SetupDeps }
