// Deliberately NOT part of `../astro/index.ts`'s shared barrel
// (`export * from "./components"`). `Carousel.svelte`'s raw source
// requires `@astrojs/svelte`'s Vite plugin to even parse — any site that
// imports it (directly or transitively, even for an unused re-export)
// forces its own bundler to touch `.svelte` syntax, which fails outright
// for a site that never registered the integration. Keeping this as a
// separate, dedicated Svelte entry point means only sites that explicitly
// `import { SunCarousel } from "@vandal-websites/sun-ui/svelte"` ever pull
// `Carousel.svelte` into their module graph — a structural guarantee, not
// just an opt-in convention.
export { default as SunCarousel } from "../astro/components/Carousel.svelte"
export type { CarouselProps } from "../astro/components/Carousel.props.ts"
