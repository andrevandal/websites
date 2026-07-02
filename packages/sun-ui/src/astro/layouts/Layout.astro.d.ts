import type { AstroComponentFactory } from "astro/runtime/server/index.js"
import type { LayoutProps, GtagConfig } from "./Layout.props.ts"

declare const SunLayout: (props: LayoutProps) => AstroComponentFactory
export default SunLayout
export type { LayoutProps, GtagConfig }
