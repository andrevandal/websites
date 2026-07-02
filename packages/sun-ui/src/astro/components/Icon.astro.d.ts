import type { AstroComponentFactory } from "astro/runtime/server/index"
import type { IconProps } from "./Icon.props.ts"

declare const SunIcon: (props: IconProps) => AstroComponentFactory
export default SunIcon
export type { IconProps }
