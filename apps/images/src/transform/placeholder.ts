import { consola } from "consola"

const logger = consola.withTag("transform")

const computePlaceholder = async (
  sourceBytes: Uint8Array | Blob
): Promise<Uint8Array> => {
  const startedAt = performance.now()
  const img = new Bun.Image(sourceBytes)
  const dataUrl = await img.placeholder()

  // Extract base64 data from data-url string
  // Format: "data:image/png;base64,<base64-string>"
  const base64Prefix = "data:image/png;base64,"
  if (!dataUrl.startsWith(base64Prefix))
    throw new Error("Unexpected placeholder format")

  const base64Data = dataUrl.slice(base64Prefix.length)
  const buffer = Buffer.from(base64Data, "base64")

  const durationMs = Math.round(performance.now() - startedAt)
  logger.debug(`placeholder computed (${buffer.length}b, ${durationMs}ms)`)

  return new Uint8Array(buffer)
}

export { computePlaceholder }
