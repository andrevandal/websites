import type { AstroComponentFactory } from "astro/runtime/server/index"

declare const SunPTImage: (props: {
  node: Record<string, unknown>
  class?: string
  captionClass?: string
}) => AstroComponentFactory
export default SunPTImage
