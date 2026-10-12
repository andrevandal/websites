import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, test } from "bun:test"
import {
  cleanupPreview,
  deployPreview,
  digestDirectory,
  nodeFiles,
  resolvePreviewUrl,
  versionDeploy,
  versionUpload,
} from "./deploy"
import type { DeployDeps } from "./deploy"
import { resolveSiteConfig } from "./site-config"

const GENERATED_CONFIG_PATH =
  "/repo/websites/transportugal/dist/server/wrangler.json"

const previewJson = (url: string) =>
  JSON.stringify({
    preview: { id: "p1", name: "pr-42", slug: "pr-42", urls: [url] },
    deployment: { id: "d1", urls: [] },
  })

const createDeps = (
  stdout = previewJson("https://pr-42-transportugal.account.workers.dev")
) => {
  const events: string[] = []
  const files: Record<string, string> = {
    [GENERATED_CONFIG_PATH]: JSON.stringify({
      name: "transportugal",
      main: "entry.mjs",
      kv_namespaces: [{ binding: "SESSION" }],
      vars: {},
    }),
  }
  const deps: DeployDeps = {
    exec: async (args, options) => {
      events.push(
        `exec ${args.join(" ")}${options.reject === false ? " (reject: false)" : ""}`
      )
      return { stdout, exitCode: 0 }
    },
    kv: {
      findOrCreate: async title => {
        events.push(`kv create ${title}`)
        return { id: `id-of-${title}`, created: true }
      },
      deleteByTitle: async title => {
        events.push(`kv delete ${title}`)
        return true
      },
    },
    files: {
      ...nodeFiles,
      read: async path => files[path] ?? "",
      write: async (path, content) => {
        files[path] = content
      },
    },
  }
  const writtenConfig = () => JSON.parse(files[GENERATED_CONFIG_PATH] ?? "{}")

  return { deps, events, writtenConfig }
}

const target = {
  siteDir: "/repo/websites/transportugal",
  generatedConfigPath: GENERATED_CONFIG_PATH,
  worker: "transportugal",
}

describe("deployPreview", () => {
  test("binds the per-PR namespace and preview Stage vars under previews, then creates Preview pr-<N> on the base Worker", async () => {
    const { deps, events, writtenConfig } = createDeps()
    const { vars } = resolveSiteConfig("transportugal", "preview")

    const url = await deployPreview({ ...target, pr: 42, vars }, deps)

    expect(url).toBe("https://pr-42-transportugal.account.workers.dev")
    expect(events).toEqual([
      "kv create transportugal-pr-42",
      "exec wrangler preview --name pr-42 --worker-name transportugal --json",
    ])
    expect(writtenConfig()).toMatchObject({
      name: "transportugal",
      kv_namespaces: [{ binding: "SESSION" }],
      previews: {
        vars,
        kv_namespaces: [
          { binding: "SESSION", id: "id-of-transportugal-pr-42" },
        ],
      },
    })
  })

  test("gives each pull request its own namespace", async () => {
    const first = createDeps()
    const second = createDeps()

    await deployPreview({ ...target, pr: 1, vars: {} }, first.deps)
    await deployPreview({ ...target, pr: 2, vars: {} }, second.deps)

    expect(first.writtenConfig().previews.kv_namespaces[0].id).toBe(
      "id-of-transportugal-pr-1"
    )
    expect(second.writtenConfig().previews.kv_namespaces[0].id).toBe(
      "id-of-transportugal-pr-2"
    )
  })

  test("fails before touching Cloudflare when --pr is missing", async () => {
    const { deps, events } = createDeps()

    await expect(
      deployPreview({ ...target, pr: undefined, vars: {} }, deps)
    ).rejects.toThrow("--pr")
    expect(events).toEqual([])
  })
})

describe("cleanupPreview", () => {
  test("deletes the Preview tolerating a missing one, then its namespace", async () => {
    const { deps, events } = createDeps("")

    await cleanupPreview({ ...target, pr: 42 }, deps)

    expect(events).toEqual([
      "exec wrangler preview delete --name pr-42 --worker-name transportugal --skip-confirmation (reject: false)",
      "kv delete transportugal-pr-42",
    ])
  })

  test("fails before touching Cloudflare when --pr is missing", async () => {
    const { deps, events } = createDeps()

    await expect(
      cleanupPreview({ ...target, pr: undefined }, deps)
    ).rejects.toThrow("--pr")
    expect(events).toEqual([])
  })
})

describe("resolvePreviewUrl", () => {
  test("reads the first Preview URL from wrangler preview --json", () => {
    expect(resolvePreviewUrl(previewJson("https://pr-7-x.workers.dev"))).toBe(
      "https://pr-7-x.workers.dev"
    )
  })

  test("skips wrangler banner lines printed before the JSON", () => {
    const banner = [
      "Using redirected Wrangler configuration.",
      ' - Configuration being used: "dist/server/wrangler.json"',
      "",
    ].join("\n")
    const json = JSON.stringify(
      JSON.parse(previewJson("https://pr-7-x.workers.dev")),
      null,
      2
    )
    expect(resolvePreviewUrl(`${banner}\n${json}`)).toBe(
      "https://pr-7-x.workers.dev"
    )
  })

  test("rejects output that is not Preview JSON or has no URL", () => {
    expect(() => resolvePreviewUrl("Uploaded transportugal")).toThrow(
      "wrangler preview --json"
    )
    expect(() =>
      resolvePreviewUrl(JSON.stringify({ preview: { urls: [] } }))
    ).toThrow("wrangler preview --json")
  })
})

const VERSION_ID = "1f2e3d4c-5b6a-4789-8abc-def012345678"

const createArtifact = async () => {
  const artifactDir = await mkdtemp(join(tmpdir(), "website-dist-"))
  await mkdir(join(artifactDir, "server"), { recursive: true })
  await mkdir(join(artifactDir, "client"), { recursive: true })
  await writeFile(
    join(artifactDir, "server/wrangler.json"),
    JSON.stringify({
      name: "transportugal",
      main: "entry.mjs",
      assets: { directory: "../client" },
      kv_namespaces: [{ binding: "SESSION" }],
      vars: {},
    })
  )
  await writeFile(join(artifactDir, "server/entry.mjs"), "export default {}")
  await writeFile(join(artifactDir, "client/.assetsignore"), "_worker.js")
  return artifactDir
}

const createVersionDeps = (
  stdout = `Uploaded transportugal (1.20 sec)\nWorker Version ID: ${VERSION_ID}\nVersion Preview Alias URL: https://staging-transportugal.account.workers.dev\n`
) => {
  const calls: string[][] = []
  const deps: DeployDeps = {
    exec: async args => {
      calls.push(args)
      return { stdout, exitCode: 0 }
    },
    kv: {
      findOrCreate: async title => ({ id: `id-of-${title}`, created: false }),
      deleteByTitle: async () => false,
    },
    files: nodeFiles,
  }
  return { calls, deps }
}

const configAt = async (args: string[]) =>
  JSON.parse(await readFile(args[args.indexOf("-c") + 1]!, "utf-8"))

describe("versionUpload", () => {
  test("uploads a staging Version of the persistent Worker from a configured copy, aliased staging and never deployed", async () => {
    const artifactDir = await createArtifact()
    const before = await digestDirectory(artifactDir)
    const { calls, deps } = createVersionDeps()
    const { vars } = resolveSiteConfig("transportugal", "staging")

    const result = await versionUpload(
      {
        siteDir: "/repo/websites/transportugal",
        worker: "transportugal",
        artifactDir,
        vars,
        previewAlias: "staging",
      },
      deps
    )

    expect(result).toEqual({
      versionId: VERSION_ID,
      previewAliasUrl: "https://staging-transportugal.account.workers.dev",
    })
    expect(calls).toHaveLength(1)
    const [args] = calls as [string[]]
    const configPath = args[args.indexOf("-c") + 1]!
    expect(args).toEqual([
      "wrangler",
      "versions",
      "upload",
      "--name",
      "transportugal",
      "-c",
      configPath,
      "--preview-alias",
      "staging",
    ])
    expect(configPath.startsWith(artifactDir)).toBe(false)
    expect(await configAt(args)).toMatchObject({
      vars,
      kv_namespaces: [{ binding: "SESSION", id: "id-of-transportugal" }],
    })
    expect(await digestDirectory(artifactDir)).toBe(before)
  })

  test("uploads production from the same artifact with production vars and no alias", async () => {
    const artifactDir = await createArtifact()
    const before = await digestDirectory(artifactDir)
    const staging = createVersionDeps()
    const production = createVersionDeps(`Worker Version ID: ${VERSION_ID}\n`)
    const versionTarget = {
      siteDir: "/repo/websites/transportugal",
      worker: "transportugal",
      artifactDir,
    }

    await versionUpload(
      {
        ...versionTarget,
        vars: { STAGE_FLAG: "staging" },
        previewAlias: "staging",
      },
      staging.deps
    )
    const result = await versionUpload(
      { ...versionTarget, vars: { STAGE_FLAG: "production" } },
      production.deps
    )

    expect(result).toEqual({
      versionId: VERSION_ID,
      previewAliasUrl: undefined,
    })
    const [args] = production.calls as [string[]]
    expect(args).not.toContain("--preview-alias")
    expect((await configAt(args)).vars).toEqual({ STAGE_FLAG: "production" })
    expect(await digestDirectory(artifactDir)).toBe(before)
    for (const call of [...staging.calls, ...production.calls]) {
      expect(call.join(" ")).not.toContain("transportugal-staging")
      expect(call.slice(0, 2)).not.toEqual(["wrangler", "deploy"])
    }
  })

  test("fails when wrangler prints no Worker Version ID", async () => {
    const { deps } = createVersionDeps("Uploaded transportugal (1.20 sec)\n")

    await expect(
      versionUpload(
        {
          siteDir: "/repo/websites/transportugal",
          worker: "transportugal",
          artifactDir: await createArtifact(),
          vars: {},
        },
        deps
      )
    ).rejects.toThrow(
      "Could not determine Worker Version ID from wrangler output."
    )
  })
})

describe("versionDeploy", () => {
  test("promotes exactly the uploaded Version to all traffic", async () => {
    const { calls, deps } = createVersionDeps()

    await versionDeploy(
      {
        siteDir: "/repo/websites/transportugal",
        worker: "transportugal",
        versionId: VERSION_ID,
      },
      deps
    )

    expect(calls).toEqual([
      [
        "wrangler",
        "versions",
        "deploy",
        `${VERSION_ID}@100%`,
        "--name",
        "transportugal",
        "--yes",
      ],
    ])
  })

  test("rejects anything but a Version UUID before calling wrangler", async () => {
    const { calls, deps } = createVersionDeps()

    await expect(
      versionDeploy(
        {
          siteDir: "/repo/websites/transportugal",
          worker: "transportugal",
          versionId: "latest",
        },
        deps
      )
    ).rejects.toThrow("Worker Version ID")
    expect(calls).toEqual([])
  })
})

describe("digestDirectory", () => {
  test("changes when a file's content or path changes, including hidden files", async () => {
    const first = await createArtifact()
    const second = await createArtifact()

    expect(await digestDirectory(first)).toBe(await digestDirectory(second))

    await writeFile(join(second, "client/.assetsignore"), "_routes.json")
    expect(await digestDirectory(second)).not.toBe(await digestDirectory(first))

    const third = await createArtifact()
    await writeFile(join(third, "client/extra.txt"), "")
    expect(await digestDirectory(third)).not.toBe(await digestDirectory(first))
  })
})
