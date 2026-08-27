import { resolve } from "node:path"
import { readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { v } from "./utils/schemas"

export const repoRoot = resolve(import.meta.dirname, "..")

export const loadAndResolveEnv = (_: string) => ({
  PLATFORM_DB_URL: "",
})

export const parseEnvFileKeys = (filepath: string) => {
  try {
    // oxlint-disable-next-line node/no-sync
    return readFileSync(filepath, "utf-8")
      .split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#"))
      .map(l => {
        const eq = l.indexOf("=")

        if (eq === -1) return null

        const key = l.slice(0, eq).trim()

        return key
      })
      .filter((entry): entry is string => entry !== null)
  } catch (err) {
    console.debug(err)
    throw new Error(`Failed to read env file at ${filepath}`, { cause: err })
  }
}

export const envVarNameForTarget = (projectId: string): string =>
  `ENV_VARS_${projectId.toUpperCase().split(/[.-]/)[0]}`

export const filterEnvVars = (
  rawJson: string,
  allowedKeys: string[]
): Record<string, string> => {
  const parsed = v.parse(
    v.pipe(v.string(), v.parseJson(), v.record(v.string(), v.string())),
    rawJson.replaceAll("\\", "").replace(/^\uFEFF/, "")
  )
  return Object.fromEntries(
    Object.entries(parsed).filter(([key]) => allowedKeys.includes(key))
  )
}

export const resolveTargetEnvVars = (
  siteLocation: string[],
  envVarName: string
): Record<string, string> => {
  const keys = parseEnvFileKeys(
      resolve(repoRoot, ...siteLocation, ".env.example")
    ),
    raw = process.env[envVarName]
  return keys.length > 0 && raw ? filterEnvVars(raw, keys) : {}
}

export const formatGithubEnvBlock = (vars: Record<string, string>): string =>
  Object.entries(vars)
    .map(([key, value]) => {
      const delimiter = `ghadelim_${randomUUID()}`
      return `${key}<<${delimiter}\n${value}\n${delimiter}`
    })
    .join("\n") + (Object.keys(vars).length > 0 ? "\n" : "")

export const resolveDbUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined

  if (url.startsWith("file:") && !url.startsWith("file:/")) {
    const relativePath = url.slice("file:".length)
    return `file:${resolve(repoRoot, relativePath)}`
  }
  return url
}
