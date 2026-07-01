import type { HTMLAttributes } from "astro/types"
import type { ImageConfig } from "../../index"

type ImageProps = {
  src: string
  sizes: string
  alt: string
  imageConfig: ImageConfig
} & HTMLAttributes<"img">

export type { ImageProps, ImageConfig }
