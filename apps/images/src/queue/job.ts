// oxlint-disable import/no-nodejs-modules
import path from "node:path"
import { consola } from "consola"
import type { Job } from "bunqueue/client"
import type { CanonicalModifiers } from "../riapi/types"
import { config } from "../config/env"
import { applyModifiers } from "../transform/image"
import { pickBackend } from "../cache/select"
import { readSourceBytes } from "../source/resolve"
import { isAnimatedGif } from "../transform/animated-gif"

const logger = consola.withTag("queue")

type TransformJobData = {
  sourceKind: "http" | "fs"
  sourceId: string
  modifiers: CanonicalModifiers
  cacheKey: string
  animatedGif?: boolean
}

const processor = async (job: Job<TransformJobData>): Promise<void> => {
  const { sourceKind, sourceId, modifiers, cacheKey, animatedGif } = job.data
  const startedAt = performance.now()

  logger.debug(`transform started: ${cacheKey} (${sourceKind}: ${sourceId})`)

  try {
    const sourceBytes = await readSourceBytes(
      sourceKind === "http"
        ? { kind: "http", url: sourceId }
        : { kind: "fs", absolutePath: path.resolve(config.fsDir, sourceId) }
    )

    const useSharp =
      animatedGif === true &&
      (modifiers.format === "gif" || (await isAnimatedGif(sourceBytes)))

    // Apply modifiers and get transformed bytes + format
    const { bytes, format } = await applyModifiers(sourceBytes, modifiers, {
      avifEnabled: config.avifEnabled,
      animatedGif: useSharp,
    })

    // Write to appropriate cache backend
    const backend = pickBackend(sourceKind)
    await backend.put(cacheKey, format, bytes)

    const durationMs = Math.round(performance.now() - startedAt)
    logger.info(
      `transform completed: ${cacheKey} -> ${format} (${bytes.length}b, ${durationMs}ms)`
    )
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt)
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error(
      `transform failed: ${cacheKey} (${durationMs}ms): ${errorMessage}`
    )
    // Never throw — the worker process must stay healthy
  }
}

export { processor }
export type { TransformJobData }
