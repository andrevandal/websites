import type { AstroComponentFactory } from "astro/runtime/server/index"
import type { ImageProps, ImageConfig } from "./Image.props.ts"

declare const SunImage: (props: ImageProps) => AstroComponentFactory
export default SunImage
export type { ImageProps, ImageConfig }
