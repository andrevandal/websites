import { v } from "./utils/schemas"
import { createHash } from "node:crypto"
import { cp, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, relative, resolve } from "node:path"

import yargs from "yargs"
import { hideBin } from "yargs/helpers"

import { consola } from "consola"
import { execa } from "execa"
import { repoRoot, resolveTargetEnvVars } from "./env"
import { queryTargets } from "./utils"
import {
  deleteKvNamespaceByTitle,
  findOrCreateKvNamespace,
} from "./utils/cloudflare"

type KvBinding = { binding: string; id?: string }

type WranglerConfig = {
  name: string
  kv_namespaces?: KvBinding[]
  vars?: Record<string, string>
  previews?: {
    vars?: Record<string, string>
    kv_namespaces?: KvBinding[]
  }
}

type DeployDeps = {
  // Runs `bunx <args>`; `reject: false` returns a failed exit code instead of throwing.
  exec: (
    args: string[],
    options: { cwd: string; reject?: boolean }
  ) => Promise<{ stdout: string; exitCode: number }>
  kv: {
    findOrCreate: (title: string) => Promise<{ id: string; created: boolean }>
    deleteByTitle: (title: string) => Promise<boolean>
  }
  files: {
    read: (path: string) => Promise<string>
    write: (path: string, content: string) => Promise<void>
    copyDir: (from: string, to: string) => Promise<void>
    tempDir: () => Promise<string>
  }
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
  // The one persistent Worker; staging and production are Versions of it.
  worker: string
}

// Only production workers can have a Cloudflare Custom Domain bound in the
// dashboard (see websites/vandallabs/README.md). Keyed by the base Worker name
// (wrangler.json's `name` field), not the CLI target string.
const CUSTOM_DOMAINS: Record<string, string> = {
  vandallabs: "https://vandallabs.com.br",
  bellypao: "https://bellypao.com.br",
}

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

const requirePr = (pr: number | undefined): number => {
  if (!pr) {
    throw new Error(
      "Preview deploys and cleanup require --pr <N> (the pull request number)."
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

// Workers Previews do not provision KV, so each PR gets its own SESSION
// namespace, bound only in the `previews` block. Top-level config stays the
// persistent Worker's.
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
): Promise<string> => {
  const prNumber = requirePr(pr)
  const namespace = await deps.kv.findOrCreate(`${worker}-pr-${prNumber}`)
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
      worker,
      "--json",
    ],
    { cwd: siteDir }
  )

  return resolvePreviewUrl(stdout)
}

const cleanupPreview = async (
  { siteDir, worker, pr }: Omit<PreviewTarget, "generatedConfigPath">,
  deps: DeployDeps
): Promise<{ previewDeleted: boolean; kvDeleted: boolean }> => {
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
      worker,
      "--skip-confirmation",
    ],
    { cwd: siteDir, reject: false }
  )
  const kvDeleted = await deps.kv.deleteByTitle(`${worker}-pr-${prNumber}`)

  return { previewDeleted: exitCode === 0, kvDeleted }
}

// Uploads, never deploys, a Version built from `artifactDir`. The artifact is
// copied first so its bytes, and therefore its digest, never carry Stage
// config; only the disposable copy gets the Stage vars and SESSION binding.
const versionUpload = async (
  {
    worker,
    artifactDir,
    vars,
    previewAlias,
  }: VersionTarget & {
    artifactDir: string
    vars: Record<string, string>
    previewAlias?: string
  },
  deps: DeployDeps
): Promise<{ versionId: string; previewAliasUrl: string | undefined }> => {
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

  const { stdout } = await deps.exec(
    [
      "wrangler",
      "versions",
      "upload",
      "--name",
      worker,
      "-c",
      configPath,
      ...(previewAlias ? ["--preview-alias", previewAlias] : []),
    ],
    { cwd: uploadDir }
  )
  const versionId = stdout.match(
    new RegExp(`Worker Version ID:\\s*(?<id>${UUID_PATTERN.source})`, "i")
  )?.groups?.["id"]

  if (!versionId) {
    throw new Error(
      "Could not determine Worker Version ID from wrangler output."
    )
  }

  return {
    versionId,
    previewAliasUrl: stdout.match(/Version Preview Alias URL:\s*(?<url>\S+)/)
      ?.groups?.["url"],
  }
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

const realDeps: DeployDeps = {
  exec: async (args, { cwd, reject = true }) => {
    const proc = execa("bunx", args, { cwd, reject })
    proc.stdout?.pipe(process.stdout)
    proc.stderr?.pipe(process.stderr)
    const { stdout, exitCode } = await proc
    return { stdout: String(stdout), exitCode: exitCode ?? 1 }
  },
  kv: {
    findOrCreate: async title => {
      const { namespace, created } = await findOrCreateKvNamespace(title)
      return { id: namespace.id, created }
    },
    deleteByTitle: deleteKvNamespaceByTitle,
  },
  files: nodeFiles,
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
        "Delete Workers Preview pr-<N> and its KV namespace",
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
            .option("preview-alias", {
              type: "string",
              describe: "Version Preview alias, e.g. staging",
            })
      )
      .command(
        "version-deploy <target>",
        "Send 100% of traffic to an uploaded Version",
        builder =>
          builder.positional("target", targetPositional).option("version-id", {
            type: "string",
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
        "$0 version-upload vandallabs --stage staging --artifact-dir websites/vandallabs/dist --preview-alias staging",
        "Upload the staging Version"
      )
      .example(
        "$0 version-deploy vandallabs --version-id <uuid>",
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
      const { previewDeleted, kvDeleted } = await cleanupPreview(
        { siteDir, worker, pr },
        realDeps
      )
      const lines = [
        `Preview "pr-${pr}" of Worker "${worker}": ${previewDeleted ? "deleted" : "not deleted (absent or failed, see log)"}`,
        `KV namespace "${worker}-pr-${pr}": ${kvDeleted ? "deleted" : "not found"}`,
      ]

      for (const line of lines) consola.info(line)
      await appendGitHubFile(
        "GITHUB_STEP_SUMMARY",
        `### Cleanup: \`${worker}\`\n${lines.map(line => `- ${line}`).join("\n")}\n\n`
      )
    }

    if (command === "preview") {
      const url = await deployPreview(
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
    }

    if (command === "version-upload") {
      const stage = args["stage"] as "staging" | "production",
        { versionId, previewAliasUrl } = await versionUpload(
          {
            siteDir,
            worker,
            artifactDir: resolve(`${args["artifactDir"]}`),
            vars: resolveTargetEnvVars(project.location, stage),
            previewAlias: args["previewAlias"] as string | undefined,
          },
          realDeps
        )

      consola.success(
        `Uploaded ${stage} Version ${versionId} of "${worker}"${previewAliasUrl ? ` at ${previewAliasUrl}` : ""}`
      )
      await appendGitHubFile(
        "GITHUB_OUTPUT",
        `version-id=${versionId}\n${previewAliasUrl ? `deploy-url=${previewAliasUrl}\n` : ""}`
      )
      await appendGitHubFile(
        "GITHUB_STEP_SUMMARY",
        `### ${stage} Version: \`${worker}\`\n- Version ID: ${versionId}\n${previewAliasUrl ? `- Version Preview: ${previewAliasUrl}\n` : ""}\n`
      )
    }

    if (command === "version-deploy") {
      const versionId = `${args["versionId"]}`,
        customDomain = CUSTOM_DOMAINS[worker]

      await versionDeploy({ siteDir, worker, versionId }, realDeps)
      consola.success(
        `Version ${versionId} of "${worker}" serves 100% of traffic.`
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
        `### Production: \`${worker}\`\n- Deployed Version: ${versionId} (100%)\n${customDomain ? `- Production domain: ${customDomain}\n` : ""}\n`
      )
    }
  } catch (err) {
    consola.error((err as Error).message)
    process.exit(1)
  }
}

export {
  cleanupPreview,
  deployPreview,
  digestDirectory,
  nodeFiles,
  resolvePreviewUrl,
  versionDeploy,
  versionUpload,
}
export type { DeployDeps }
