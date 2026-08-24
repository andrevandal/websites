import type { Component, Snippet } from "svelte"
import type { CarouselProps } from "./Carousel.props.ts"

declare const SunCarousel: Component<CarouselProps & { children?: Snippet }>
export default SunCarousel
export type { CarouselProps }
