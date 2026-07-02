import type { AstroComponentFactory } from "astro/runtime/server/index"
import type { YoutubeProps } from "./Youtube.props"

declare const SunYoutube: (props: YoutubeProps) => AstroComponentFactory
export default SunYoutube
export type { YoutubeProps }
