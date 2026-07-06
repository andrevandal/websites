import sharp = require("sharp")
import type { CanonicalModifiers } from "../riapi/types"

const toBuffer = async (sourceBytes: Uint8Array | Blob): Promise<Buffer> => {
  if (sourceBytes instanceof Blob)
    return Buffer.from(await sourceBytes.arrayBuffer())

  return Buffer.from(
    sourceBytes.buffer as ArrayBuffer,
    sourceBytes.byteOffset,
    sourceBytes.byteLength
  )
}

const isAnimatedGif = async (
  sourceBytes: Uint8Array | Blob
): Promise<boolean> => {
  const input = await toBuffer(sourceBytes)
  const metadata = await sharp(input).metadata()

  return (
    metadata.format === "gif" &&
    metadata.pages !== undefined &&
    metadata.pages > 1
  )
}

const applySharpModifiers = async (
  sourceBytes: Uint8Array | Blob,
  modifiers: CanonicalModifiers,
  format: "gif" | "webp"
): Promise<Uint8Array> => {
  const input = await toBuffer(sourceBytes)
  let img = sharp(input, { animated: true })

  if (modifiers.width !== undefined || modifiers.height !== undefined) {
    img = img.resize({
      width: modifiers.width,
      height: modifiers.height,
      fit: modifiers.mode === "stretch" ? "fill" : "inside",
      withoutEnlargement: modifiers.scale !== "both",
      kernel: modifiers.filter as keyof sharp.KernelEnum | undefined,
    })
  }

  if (modifiers.rotate !== undefined && modifiers.rotate !== 0)
    img = img.rotate(modifiers.rotate)

  if (modifiers.flip === "x") img = img.flip()
  else if (modifiers.flip === "y") img = img.flop()
  else if (modifiers.flip === "xy") img = img.flip().flop()

  if (
    modifiers.brightness !== undefined ||
    modifiers.saturation !== undefined
  ) {
    img = img.modulate({
      brightness: modifiers.brightness,
      saturation: modifiers.saturation,
    })
  }

  const buffer = await (format === "gif"
    ? img.gif().toBuffer()
    : img.webp({ quality: modifiers.quality ?? 80 }).toBuffer())

  return new Uint8Array(buffer)
}

export { applySharpModifiers, isAnimatedGif }
