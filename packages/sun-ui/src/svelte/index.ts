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
export { default as SunCombobox } from "../astro/components/Combobox.svelte"
export type { SunComboboxProps } from "../astro/components/Combobox.props.ts"

// Facade re-export of bits-ui primitives: consuming Svelte apps import
// `Dialog`/`Accordion`/`Popover` (and any other primitive they need) from
// this single entry point instead of depending on `bits-ui` directly,
// keeping it swappable/isolated behind `@vandal-websites/sun-ui/svelte`. `bits-ui`
// itself already ships every primitive as a named namespace export off its
// one `.` entry point (there is no `bits-ui/components/<name>` subpath), so
// re-exporting the specific names this facade curates is a plain named
// re-export, not a subpath import.
export { Dialog, Accordion, Popover } from "bits-ui"
