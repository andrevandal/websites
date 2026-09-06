import type { HTMLAttributes } from "astro/types"

type SunPictureFit = "fill" | "contain" | "cover" | "none" | "scale-down"
type SunPictureFormat =
  | "jpeg"
  | "jpg"
  | "png"
  | "webp"
  | "avif"
  | "gif"
  | "auto"
type SunPictureQuality = number | "low" | "mid" | "high" | "max"
type SunPictureDensity = number | `${number}x`

type SunPicturePlaceholderMode = "circle"
type SunPictureBreakpoint = {
  /** `min-width` (px) for this tier's `sizes` media condition. */
  minWidth: number
  /** Rendered CSS width (px) of the image at this tier. */
  width: number
}

type SunPictureProps = Omit<
  HTMLAttributes<"img">,
  "src" | "width" | "height" | "class"
> & {
  /** Remote source URL. Only http(s) sources are supported by the Sun image service. */
  src: string
  alt: string
  width: number
  height: number
  quality?: SunPictureQuality
  format?: SunPictureFormat
  fit?: SunPictureFit
  /**
   * Pixel densities (e.g. `[1, 1.5, 2, 3]`) to generate a `srcset` for. Combined
   * with `breakpoints`, applied at every tier (base `width` included) instead of
   * scaling a single fixed size.
   */
  densities?: SunPictureDensity[]
  /**
   * Extra rendered-width tiers (e.g. Tailwind `lg`/`xl` breakpoints) so the
   * `srcset`/`sizes` pair describes the correct source width for each screen
   * size, not just density variants of the base `width`. The base `width`/`height`
   * remain the smallest/default tier.
   */
  breakpoints?: SunPictureBreakpoint[]
  /** Class applied to the rendered `<img>`. */
  class?: string
  /** Class applied to the wrapping element (sizing, aspect-ratio, etc). */
  wrapperClass?: string
  /**
   * Render the blur-up placeholder. Defaults to `true`. Requires the consuming
   * site to configure `SunUIAstroIntegration({ imageServiceBaseUrl })`; without
   * it there is no image service to request a placeholder from and the image
   * renders with no placeholder regardless of this flag.
   */
  placeholder?: boolean
  /** Apply a CSS-only mask to the blur-up placeholder. */
  placeholderMode?: SunPicturePlaceholderMode
}

export type {
  SunPictureProps,
  SunPictureBreakpoint,
  SunPictureDensity,
  SunPicturePlaceholderMode,
}
