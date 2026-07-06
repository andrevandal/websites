// oxlint-disable import/no-nodejs-modules
import path from "node:path"
import fs from "node:fs"
import { consola } from "consola"
import { Queue, Worker } from "bunqueue/client"
import type { CanonicalModifiers } from "../riapi/types"
import { config } from "../config/env"
import { processor } from "./job"

const logger = consola.withTag("queue")

type TransformJobData = {
  sourceKind: "http" | "fs"
  sourceId: string
  modifiers: CanonicalModifiers
  cacheKey: string
  animatedGif?: boolean
}

// Set bunqueue's DATA_PATH before constructing Queue/Worker
const queueDbPath = path.resolve(config.queueDb)
const queueDbDir = path.dirname(queueDbPath)
// oxlint-disable-next-line node/no-sync
fs.mkdirSync(queueDbDir, { recursive: true })
process.env.DATA_PATH = queueDbPath
logger.debug(`queue db path: ${queueDbPath}`)

const transformQueue = new Queue<TransformJobData>("transform", {
  embedded: true,
})

// Use plain Worker, not SandboxedWorker, because:
// 1. Bun.Image already offloads decode/transform/encode off the main JS thread
//    once a terminal is awaited — the isolation SandboxedWorker provides is redundant.
// 2. SandboxedWorker requires a separately-resolvable processor file, which breaks
//    `bun build --outdir dist` single-entrypoint bundling.
// 3. Plain Worker with inline processor is what bunqueue's docs recommend absent
//    a specific isolation need; easy to revisit once this ships if real traffic changes the tradeoff.
const transformWorker = new Worker<TransformJobData>("transform", processor, {
  embedded: true,
  concurrency: config.maxConcurrent,
})

// Start the worker
transformWorker.run()
logger.log(`worker started, concurrency=${config.maxConcurrent}`)

const enqueueTransform = async (data: TransformJobData): Promise<void> => {
  logger.debug(
    `enqueue: ${data.cacheKey} (${data.sourceKind}: ${data.sourceId})`
  )
  await transformQueue.add("transform", data, { jobId: data.cacheKey })
}

export { transformQueue, enqueueTransform }
export type { TransformJobData }
