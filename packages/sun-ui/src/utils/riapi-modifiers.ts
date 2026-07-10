// Builds an apps/images (RIAPI-flavored) modifiers segment — see
// apps/images/README.md "Modifiers reference" — from Astro ImageTransform-shaped
// options. Kept free of any `astro` import so it stays trivially unit-testable;
// astro-image-service.ts adapts the real `ImageTransform` shape onto this.

type ModifierOptions = {
  width?: number
  height?: number
  format?: string
  quality?: string | number
  fit?: string
}

// Mirrors astro's own Sharp service quality preset table
// (astro/dist/assets/services/sharp.js `qualityTable`) so
// quality="low"|"mid"|"high"|"max" behaves the same across image services.
const QUALITY_PRESETS = {
  low: 25,
  mid: 50,
  high: 80,
  max: 100,
} as const

const isQualityPreset = (key: string): key is keyof typeof QUALITY_PRESETS =>
  Object.hasOwn(QUALITY_PRESETS, key)

const SUPPORTED_FORMATS = {
  jpeg: true,
  jpg: true,
  png: true,
  webp: true,
  avif: true,
  gif: true,
  auto: true,
} as const

const isSupportedFormat = (
  key: string
): key is keyof typeof SUPPORTED_FORMATS =>
  Object.hasOwn(SUPPORTED_FORMATS, key)

// Astro's `fit` is CSS object-fit vocabulary; apps/images' `mode` is RIAPI
// vocabulary. apps/images degrades mode=crop/mode=pad to mode=max today (see
// README "RIAPI coverage"), but we still emit the semantically correct mode so
// behavior improves for free if that degradation is ever lifted. "mode=pad" has
// no `fit` equivalent, so it's never emitted here.
const FIT_TO_MODE = {
  fill: "stretch",
  contain: "max",
  cover: "crop",
  none: "max",
  "scale-down": "max",
} as const

const isFitValue = (key: string): key is keyof typeof FIT_TO_MODE =>
  Object.hasOwn(FIT_TO_MODE, key)

const clampQuality = (value: number): number =>
  Math.min(100, Math.max(1, Math.round(value)))

const resolveQuality = (
  quality: string | number | undefined
): number | undefined => {
  if (quality === undefined) return undefined
  if (typeof quality === "number") return clampQuality(quality)

  const parsed = Number.parseInt(quality, 10)
  if (!Number.isNaN(parsed)) return clampQuality(parsed)

  return isQualityPreset(quality) ? QUALITY_PRESETS[quality] : undefined
}

const resolveFormat = (format: string | undefined): string | undefined =>
  format && isSupportedFormat(format) ? format : undefined

const buildRiapiModifiers = (options: ModifierOptions): string => {
  const parts: string[] = []

  if (options.width) parts.push(`w_${Math.round(options.width)}`)
  if (options.height) parts.push(`h_${Math.round(options.height)}`)

  const format = resolveFormat(options.format)
  if (format) parts.push(`f_${format}`)

  const quality = resolveQuality(options.quality)
  if (quality !== undefined) parts.push(`q_${quality}`)

  const mode =
    options.fit && isFitValue(options.fit)
      ? FIT_TO_MODE[options.fit]
      : undefined
  if (mode) parts.push(`mode_${mode}`)

  return parts.length > 0 ? parts.join(",") : "_"
}

export type { ModifierOptions }
export { buildRiapiModifiers }
