/**
 * Fallback Sun UI configuration, used when a site renders Sun UI components
 * without registering `SunUIAstroIntegration`. The integration replaces this
 * module at build time with `virtual:sun-ui/config`, carrying the options it
 * was given.
 *
 * Components cannot read `image.service.config` themselves: Astro hands that
 * object to the image service module only, and `astro:config/*` deliberately
 * omits it.
 */
const imageServiceBaseUrl: string | undefined = undefined

export { imageServiceBaseUrl }
