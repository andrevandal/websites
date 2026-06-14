import { resolve } from "node:path"
import { readFileSync } from "node:fs"

export const repoRoot = resolve(import.meta.dirname, "..")

export const parseEnvFileKeys = (filepath: string) => {
  try {
    return readFileSync(filepath, "utf-8")
      .split("\n")
      .map(l => l.trim())
      .filter(l => l && !l.startsWith("#"))
      .map(l => {
        const eq = l.indexOf("=")

        if (eq === -1) {
          return null
        }

        const key = l.slice(0, eq).trim()

        return key
      })
      .filter((entry): entry is string => entry !== null)
  } catch (err) {
    console.debug(err)
    throw new Error(`Failed to read env file at ${filepath}`, { cause: err })
  }
}

export const resolveDbUrl = (url: string | undefined): string | undefined => {
  if (!url) {
    return undefined
  }
  if (url.startsWith("file:") && !url.startsWith("file:/")) {
    const relativePath = url.slice("file:".length)
    return `file:${resolve(repoRoot, relativePath)}`
  }
  return url
}
