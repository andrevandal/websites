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

const resolveDbUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined

  if (url.startsWith("file:") && !url.startsWith("file:/")) {
    const relativePath = url.slice("file:".length)
    return `file:${resolve(repoRoot, relativePath)}`
  }
  return url
}

export { repoRoot, resolveDbUrl, resolveTargetEnvVars }
