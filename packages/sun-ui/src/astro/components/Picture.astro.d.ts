import type { AstroComponentFactory } from "astro/runtime/server/index"
import type { SunPictureProps, SunPictureBreakpoint } from "./Picture.props.ts"

declare const SunPicture: (props: SunPictureProps) => AstroComponentFactory
export default SunPicture
export type { SunPictureProps, SunPictureBreakpoint }
