type Dimensions = { width?: number; height?: number }

type ImageLayout = {
  // Figure max-width: the authored/derived display width, if any.
  maxWidth?: number
  baseWidth: number
  baseHeight: number
  breakpoints: { minWidth: number; width: number }[]
  sizes: string
}

const FALLBACK_RATIO = 3 / 2
const FALLBACK_SIZE = { width: 1200, height: 800 }
const TIERS = [
  { minWidth: 464, width: 432 },
  { minWidth: 1024, width: 896 },
  { minWidth: 1280, width: 1152 },
]
const BASE_WIDTH = 343

const positive = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined

// Block dimension, then asset dimension, then stored metadata dimension.
const originalSize = (...sources: Dimensions[]) => {
  const width = sources.map(s => positive(s.width)).find(Boolean)
  const height = sources.map(s => positive(s.height)).find(Boolean)
  if (width && height) return { width, height }
  if (width) return { width, height: width / FALLBACK_RATIO }
  if (height) return { width: height * FALLBACK_RATIO, height }
  return FALLBACK_SIZE
}

// Same rules as EmDash's Image: both given use both, one given derives the
// other from the original aspect ratio.
const displaySize = (
  original: { width: number; height: number },
  displayWidth: unknown,
  displayHeight: unknown
): Dimensions => {
  const width = positive(displayWidth)
  const height = positive(displayHeight)
  const ratio = original.width / original.height
  if (width && height) return { width, height }
  if (width) return { width, height: width / ratio }
  if (height) return { width: height * ratio, height }
  return {}
}

const resolveImageLayout = (
  node: Dimensions & { displayWidth?: number; displayHeight?: number },
  asset: Dimensions,
  meta: Dimensions
): ImageLayout => {
  const original = originalSize(node, asset, meta)
  const display = displaySize(original, node.displayWidth, node.displayHeight)
  const cap = display.width
  const ratio =
    display.width && display.height
      ? display.width / display.height
      : original.width / original.height

  const capped = (width: number) => (cap ? Math.min(cap, width) : width)
  const css = (expression: string) =>
    cap ? `min(${cap}px, ${expression})` : expression
  const baseWidth = Math.round(capped(BASE_WIDTH))

  return {
    maxWidth: cap ? Math.round(cap) : undefined,
    baseWidth,
    baseHeight: Math.round(baseWidth / ratio),
    breakpoints: TIERS.map(tier => ({
      minWidth: tier.minWidth,
      width: Math.round(capped(tier.width)),
    })),
    sizes: `auto, (min-width: 1280px) ${css("1152px")}, (min-width: 1024px) ${css("896px")}, (min-width: 464px) ${css("432px")}, ${css("calc(100vw - 32px)")}`,
  }
}

export { resolveImageLayout }
export type { ImageLayout }
