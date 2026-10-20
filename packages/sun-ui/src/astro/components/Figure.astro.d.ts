import type { AstroComponentFactory } from "astro/runtime/server/index"
import type { FigureAlign, FigureProps } from "./Figure.props.ts"

declare const SunFigure: (props: FigureProps) => AstroComponentFactory
export default SunFigure
export type { FigureAlign, FigureProps }
