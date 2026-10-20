import type { AstroComponentFactory } from "astro/runtime/server/index"

declare const SunPTHeading: (props: {
  node: { style?: string; tocId?: string }
  class?: string
}) => AstroComponentFactory
export default SunPTHeading
