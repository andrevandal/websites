import { consola } from "consola"
import type { CanonicalModifiers } from "../riapi/types"
import { negotiateFormat } from "../http/negotiate"
import { applySharpModifiers } from "./animated-gif"

const logger = consola.withTag("transform")

// Minimal 1x1 transparent PNG, used only to probe whether this machine's
// Bun.Image backend can actually encode AVIF (Linux: never; macOS: Apple
// Silicon M3+ only; Windows: needs the AV1 Video Extension). The result is
// platform-dependent, not per-image, so probing once and memoizing is safe
// and keeps the cache-key format resolution and the real encode in sync —
// without this, a request that optimistically resolves to "avif" for the
// cache key while the real encode silently falls back to "webp" would look
// up the wrong cache entry forever.
const AVIF_PROBE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
)

let avifSupported: boolean | null = null
const isAvifSupported = async (): Promise<boolean> => {
  if (avifSupported !== null) return avifSupported
  try {
    await new Bun.Image(AVIF_PROBE_PNG).avif({ quality: 1 }).bytes()
    avifSupported = true
  } catch {
    avifSupported = false
  }
  logger.debug(`avif capability probed: ${avifSupported}`)
  return avifSupported
}

// Single source of truth for "which format will this request actually be
// encoded/served as" — called both by the request handler (before the cache
// lookup, so it checks the right cache key) and by applyModifiers (before
// encoding), so the two can never disagree.
type TransformOptions = {
  avifEnabled: boolean
  acceptHeader?: string
  animatedGif?: boolean
}

const resolveAnimatedGifTargetFormat = (
  modifiers: CanonicalModifiers,
  acceptHeader?: string
): "gif" | "webp" => {
  if (modifiers.format === "gif" || modifiers.format === "webp")
    return modifiers.format

  if (modifiers.format !== "auto") return "webp"

  const acceptedTypes =
    acceptHeader
      ?.split(",")
      .map(entry => entry.split(";")[0]?.trim() || "")
      .filter(Boolean) ?? []

  if (acceptedTypes.length === 0) return "gif"

  for (const accepted of acceptedTypes) {
    if (
      accepted === "image/webp" ||
      accepted === "image/*" ||
      accepted === "*/*"
    )
      return "webp"

    if (accepted === "image/gif") return "gif"
  }

  return "gif"
}

const resolveTargetFormat = async (
  modifiers: CanonicalModifiers,
  opts: TransformOptions
): Promise<Exclude<CanonicalModifiers["format"], "auto">> => {
  if (opts.animatedGif)
    return resolveAnimatedGifTargetFormat(modifiers, opts.acceptHeader)

  const avifUsable = opts.avifEnabled && (await isAvifSupported())
  if (modifiers.format === "auto")
    return negotiateFormat(opts.acceptHeader, avifUsable)

  if (modifiers.format === "avif" && !avifUsable) return "webp"
  if (modifiers.format === "gif") return "webp"
  return modifiers.format
}

const applyModifiers = async (
  sourceBytes: Uint8Array | Blob,
  modifiers: CanonicalModifiers,
  opts: TransformOptions
): Promise<{ bytes: Uint8Array; format: string }> => {
  const startedAt = performance.now()

  // Format resolution — shared with the request handler's cache-key lookup
  const format = await resolveTargetFormat(modifiers, opts)
  logger.debug(`format resolved: ${format}`)

  if (opts.animatedGif) {
    // resolveAnimatedGifTargetFormat (called via resolveTargetFormat above
    // when opts.animatedGif is set) only ever returns "gif" or "webp" — this
    // guard makes that invariant visible to the type checker.
    if (format !== "gif" && format !== "webp")
      throw new Error(`unexpected animated gif format: ${format}`)

    const bytes = await applySharpModifiers(sourceBytes, modifiers, format)
    const durationMs = Math.round(performance.now() - startedAt)
    logger.info(`encoded ${format} (${bytes.length}b, ${durationMs}ms)`)

    return { bytes, format }
  }

  let img = new Bun.Image(sourceBytes)
  // Resize handling
  const { width, height, filter } = modifiers
  if (width !== undefined || height !== undefined) {
    const resizeOpts: Bun.Image.ResizeOptions = {
      fit: modifiers.mode === "stretch" ? "fill" : "inside",
      withoutEnlargement: modifiers.scale !== "both",
    }

    if (filter !== undefined) resizeOpts.filter = filter as Bun.Image.Filter

    if (width !== undefined && height !== undefined) {
      // Both width and height provided
      img = await img.resize(width, height, resizeOpts)
    } else if (width !== undefined) {
      // Width only
      img = await img.resize(width, undefined, resizeOpts)
    } else {
      // Height only: compute width from aspect ratio
      const metadata = await img.metadata()
      const sourceWidth = metadata.width
      const sourceHeight = metadata.height
      const computedWidth = Math.round((sourceWidth * height!) / sourceHeight)
      img = await img.resize(computedWidth, height, {
        fit: "fill",
        withoutEnlargement: resizeOpts.withoutEnlargement,
        filter: resizeOpts.filter,
      })
    }
  }

  // Rotate handling
  if (modifiers.rotate !== undefined && modifiers.rotate !== 0) {
    const validRotations = [-270, -180, -90, 0, 90, 180, 270]
    if (validRotations.includes(modifiers.rotate))
      img = await img.rotate(modifiers.rotate)
  }

  // Flip handling
  if (modifiers.flip === "x") img = await img.flip()
  else if (modifiers.flip === "y") img = await img.flop()
  else if (modifiers.flip === "xy") img = await img.flip().flop()

  // Modulate handling (brightness/saturation)
  if (
    modifiers.brightness !== undefined ||
    modifiers.saturation !== undefined
  ) {
    const modulateOpts: Bun.Image.ModulateOptions = {}
    if (modifiers.brightness !== undefined)
      modulateOpts.brightness = modifiers.brightness

    if (modifiers.saturation !== undefined)
      modulateOpts.saturation = modifiers.saturation

    img = await img.modulate(modulateOpts)
  }

  // Encode to target format
  const { bytes, actualFormat } = await (async (): Promise<{
    bytes: Uint8Array
    actualFormat: string
  }> => {
    if (format === "jpeg") {
      return {
        bytes: await img.jpeg({ quality: modifiers.quality ?? 80 }).bytes(),
        actualFormat: format,
      }
    }
    if (format === "png") {
      return {
        bytes: await img
          .png({ compressionLevel: modifiers.compression })
          .bytes(),
        actualFormat: format,
      }
    }
    if (format === "webp") {
      return {
        bytes: await img.webp({ quality: modifiers.quality ?? 80 }).bytes(),
        actualFormat: format,
      }
    }
    if (format === "avif") {
      try {
        return {
          bytes: await img.avif({ quality: modifiers.quality ?? 50 }).bytes(),
          actualFormat: format,
        }
      } catch (e) {
        const error = e as Error & { code?: string }
        if (error.code !== "ERR_IMAGE_FORMAT_UNSUPPORTED") throw e
        logger.warn(
          "avif encode unsupported on this runtime, falling back to webp"
        )
        return {
          bytes: await img.webp({ quality: modifiers.quality ?? 80 }).bytes(),
          actualFormat: "webp",
        }
      }
    }
    // Fallback to jpeg if format is somehow invalid
    return {
      bytes: await img.jpeg({ quality: modifiers.quality ?? 80 }).bytes(),
      actualFormat: "jpeg",
    }
  })()

  const durationMs = Math.round(performance.now() - startedAt)
  logger.info(`encoded ${actualFormat} (${bytes.length}b, ${durationMs}ms)`)

  return { bytes, format: actualFormat }
}

export { applyModifiers, resolveTargetFormat, isAvifSupported }
