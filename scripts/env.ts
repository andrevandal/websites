import { randomUUID } from "node:crypto"
import { resolve } from "node:path"
import { resolveSiteConfig } from "./site-config"
import type { Stage } from "./site-config"

const repoRoot = resolve(import.meta.dirname, "..")

const extractSiteIdFromLocation = (location: string[]): string => {
  const [directory, siteId] = location
  if (directory !== "websites" || !siteId) {
    throw new Error(
      `Invalid project location: ${location.join("/")}. Expected ["websites", "<site-id>"]`
    )
  }
  return siteId
}

const resolveTargetEnvVars = (
  siteLocation: string[],
  stage: Stage
): Record<string, string> =>
  resolveSiteConfig(extractSiteIdFromLocation(siteLocation), stage).vars

const formatGitHubEnvironmentFile = (vars: Record<string, string>): string =>
  Object.entries(vars)
    .map(([key, value]) => {
      const delimiter = `ghadelim_${randomUUID()}`
      return `${key}<<${delimiter}\n${value}\n${delimiter}`
    })
    .join("\n") + (Object.keys(vars).length > 0 ? "\n" : "")

const resolveDbUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined

  if (url.startsWith("file:") && !url.startsWith("file:/")) {
    const relativePath = url.slice("file:".length)
    return `file:${resolve(repoRoot, relativePath)}`
  }
  return url
}

export {
  formatGitHubEnvironmentFile,
  repoRoot,
  resolveDbUrl,
  resolveTargetEnvVars,
}
