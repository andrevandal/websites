import type { SunVideoSources } from "./Video.props"

type SunVideoSource = { src: string; type: "video/mp4" | "video/webm" }

type SunVideoConnectionInfo = {
  saveData?: boolean
  effectiveType?: string
}

const buildVideoSources = (sources: SunVideoSources): SunVideoSource[] => {
    const list: SunVideoSource[] = []
    if (sources.webm) list.push({ src: sources.webm, type: "video/webm" })
    list.push({ src: sources.mp4, type: "video/mp4" })
    return list
  },
  isConstrainedConnection = (connection?: SunVideoConnectionInfo): boolean => {
    if (!connection) return false
    if (connection.saveData) return true
    return (
      connection.effectiveType === "slow-2g" ||
      connection.effectiveType === "2g"
    )
  },
  canAutoplay = (
    connection: SunVideoConnectionInfo | undefined,
    prefersReducedMotion: boolean
  ): boolean => !prefersReducedMotion && !isConstrainedConnection(connection)

export { buildVideoSources, isConstrainedConnection, canAutoplay }
export type { SunVideoSource, SunVideoConnectionInfo }
