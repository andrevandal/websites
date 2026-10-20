import type { HTMLAttributes } from "astro/types"

type FigureAlign = "left" | "center" | "right" | "wide" | "full"

type FigureProps = {
  caption?: string
  captionPlacement?: "below" | "overlay"
  align?: FigureAlign
  maxWidth?: number
  captionClass?: string
} & HTMLAttributes<"figure">

export type { FigureAlign, FigureProps }
