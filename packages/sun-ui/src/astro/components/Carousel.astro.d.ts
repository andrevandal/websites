import type { AstroComponentFactory } from "astro/runtime/server/index"
import type { CarouselProps } from "./Carousel.props.ts"

declare const SunCarousel: (props: CarouselProps) => AstroComponentFactory
export default SunCarousel
export type { CarouselProps }
