import { isInCidrs } from "../security/client-ip"

// A ban on an address in these ranges is a ban on the reverse proxy, which
// locks out every visitor. Real visitors never have these addresses.
const PRIVATE_RANGES = [
  "10.0.0.0/8",
  "172.16.0.0/12",
  "192.168.0.0/16",
  "127.0.0.0/8",
  "fc00::/7",
  "::1/128",
]

type HealthStatus =
  | { status: "ok" }
  | { status: "degraded"; reason: "proxy-banned" }

export const getHealthStatus = (
  bannedIps: string[] = [],
  trustedProxyCidrs: string[] = []
): HealthStatus => {
  const proxyRanges = [...PRIVATE_RANGES, ...trustedProxyCidrs]

  return bannedIps.some(ip => isInCidrs(ip, proxyRanges))
    ? { status: "degraded", reason: "proxy-banned" }
    : { status: "ok" }
}

export type DeepHealthDeps = {
  imageUrl: string
  loadImage: (url: string) => Promise<Uint8Array | Blob>
  decodeImage: (bytes: Uint8Array | Blob) => Promise<Uint8Array>
}

export type DeepHealthStatus = {
  status: "ok" | "degraded"
  checks: {
    proxy: "ok" | "banned"
    image: "ok" | "failed" | "skipped"
  }
}

// Fetches the configured image from its source and decodes it with the same
// engine the transform queue uses, so a broken source or image runtime shows
// up here instead of as silent redirects to the raw source.
export const getDeepHealthStatus = async (
  bannedIps: string[],
  trustedProxyCidrs: string[],
  deps: DeepHealthDeps
): Promise<DeepHealthStatus> => {
  const proxy =
    getHealthStatus(bannedIps, trustedProxyCidrs).status === "ok"
      ? "ok"
      : "banned"

  const image = await (async () => {
    if (!deps.imageUrl) return "skipped" as const
    try {
      const bytes = await deps.loadImage(deps.imageUrl)
      const decoded = await deps.decodeImage(bytes)
      return decoded.length > 0 ? ("ok" as const) : ("failed" as const)
    } catch {
      return "failed" as const
    }
  })()

  return {
    status: proxy === "ok" && image !== "failed" ? "ok" : "degraded",
    checks: { proxy, image },
  }
}
