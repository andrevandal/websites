import { resolve } from "node:path"

const repoRoot = resolve(import.meta.dirname, "..")

type Stage = "preview" | "staging" | "production"

// EmDash previews are Access-protected with their own media; the image
// service cannot fetch from them, so they serve originals.
const EMDASH_SITES: Record<string, true> = {
  pedrohenridesign: true,
  brunabraz: true,
}

const extractSiteIdFromLocation = (location: string[]): string => {
  const [directory, siteId] = location
  if (directory !== "websites" || !siteId) {
    throw new Error(
      `Invalid project location: ${location.join("/")}. Expected ["websites", "<site-id>"]`
    )
  }
  return siteId
}

// Non-secret Worker vars. IMAGES_BASE_URL comes from the GitHub environment
// secret of the deploying job. Previews read S3_PUBLIC_URL from Preview Base,
// so it is never set here (a var would override it).
const resolveTargetEnvVars = (
  siteLocation: string[],
  stage: Stage,
  env: NodeJS.ProcessEnv = process.env
): Record<string, string> => {
  const siteId = extractSiteIdFromLocation(siteLocation)
  return {
    IMAGES_BASE_URL:
      stage === "preview" && Object.hasOwn(EMDASH_SITES, siteId)
        ? ""
        : (env["IMAGES_BASE_URL"] ?? ""),
  }
}

const resolveDbUrl = (url: string | undefined): string | undefined => {
  if (!url) return undefined

  if (url.startsWith("file:") && !url.startsWith("file:/")) {
    const relativePath = url.slice("file:".length)
    return `file:${resolve(repoRoot, relativePath)}`
  }
  return url
}

export { EMDASH_SITES, repoRoot, resolveDbUrl, resolveTargetEnvVars }
export type { Stage }
