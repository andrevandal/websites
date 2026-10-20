import { resolve } from "node:path"
import { existsSync, readFileSync } from "node:fs"
import { consola } from "consola"

const repoRoot = resolve(import.meta.dirname, "..")

const readJson = (path: string) =>
  JSON.parse(readFileSync(resolve(repoRoot, path), "utf-8"))

const run = () => {
  const config = readJson("release-please-config.json")
  const manifest = readJson(".release-please-manifest.json")

  const configPaths = Object.keys(config.packages as Record<string, unknown>)
  const manifestPaths = Object.keys(manifest as Record<string, unknown>)

  let failed = false

  for (const pkg of configPaths) {
    if (pkg !== "." && !existsSync(resolve(repoRoot, pkg))) {
      consola.error(`Config references missing path: ${pkg}`)
      failed = true
    }
  }

  const configSet = new Set(configPaths)
  const manifestSet = new Set(manifestPaths)

  for (const pkg of manifestSet) {
    if (!configSet.has(pkg)) {
      consola.error(`Manifest has entry not in config: ${pkg}`)
      failed = true
    }
  }

  for (const pkg of configSet) {
    if (!manifestSet.has(pkg)) {
      consola.error(`Config has entry not in manifest: ${pkg}`)
      failed = true
    }
  }

  if (failed) {
    consola.error("release-please config validation failed")
    process.exit(1)
  }

  consola.success("release-please config valid")
}

run()
