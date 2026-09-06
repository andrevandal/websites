import type { AstroComponentFactory } from "astro/runtime/server/index"
import type { SunVideoProps, SunVideoSources } from "./Video.props.ts"

declare const SunVideo: (props: SunVideoProps) => AstroComponentFactory
export default SunVideo
export type { SunVideoProps, SunVideoSources }
