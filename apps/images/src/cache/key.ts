import type { CanonicalModifiers } from "../riapi/types"

// Default values for CanonicalModifiers fields (to skip in key when at default)
const defaults: Partial<Record<keyof CanonicalModifiers, any>> = {
  mode: "max",
  scale: "down",
  flip: "none",
}

// Fixed sort order matching CanonicalModifiers type declaration
const fieldOrder: (keyof CanonicalModifiers)[] = [
  "width",
  "height",
  "mode",
  "scale",
  // format excluded
  "quality",
  "rotate",
  "flip",
  "brightness",
  "saturation",
  "filter",
  "compression",
]

const buildSourceKey = (sourceId: string): string => {
  // Handle HTTP sources: extract host and path structure
  const httpMatch = sourceId.match(
    /^https?:\/\/(?<host>[^/]+)\/(?<pathPrefix>[^/]+)\/(?<rest>.+)$/
  )
  if (httpMatch?.groups) {
    const { host = "", pathPrefix = "", rest = "" } = httpMatch.groups
    const hostParts = host.split(".")
    const hostLabel = hostParts.length > 2 ? hostParts[0] : host
    return `${hostLabel}-${pathPrefix}/${rest}`
  }

  // HTTP source with only one path segment
  const httpSimpleMatch = sourceId.match(
    /^https?:\/\/(?<host>[^/]+)\/(?<filePath>.+)$/
  )
  if (httpSimpleMatch?.groups) {
    const { host = "", filePath = "" } = httpSimpleMatch.groups
    return `${host}/${filePath}`
  }

  // FS source: just the path
  return sourceId.startsWith("/") ? sourceId.slice(1) : sourceId
}

const buildCacheKey = (
  sourceId: string,
  modifiers: CanonicalModifiers
): string => {
  // Build modifier string: sorted key_value pairs, excluding format and default values
  const modStr =
    fieldOrder
      .filter(key => {
        if (key === "format") return false // format excluded from key
        const val = modifiers[key]
        // Skip undefined and default values
        return val !== undefined && val !== defaults[key]
      })
      .map(key => `${key}_${modifiers[key]}`)
      .join(",") || "_"

  return `${buildSourceKey(sourceId)}/${modStr}`
}

export { buildCacheKey, buildSourceKey }
