type Format = "jpeg" | "png" | "webp" | "avif" | "gif" | "auto"
type Mode = "stretch" | "max" | "pad" | "crop"
type Scale = "down" | "both" | "canvas"
type Flip = "none" | "x" | "y" | "xy"

type CanonicalModifiers = {
  width?: number
  height?: number
  mode: Mode
  scale: Scale
  format: Format
  quality?: number
  rotate?: number
  flip: Flip
  brightness?: number
  saturation?: number
  filter?: string
  compression?: number
}

export type { Format, Mode, Scale, Flip, CanonicalModifiers }
