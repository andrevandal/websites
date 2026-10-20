import { defineConfig, fontProviders } from "astro/config"
import sunUIAstroIntegration from "@vandal-websites/sun-ui/astro-integration"
import { robotsSitemap } from "@vandal-websites/robots-sitemap"
import cloudflare from "@astrojs/cloudflare"
import tailwindcss from "@tailwindcss/vite"

const CANONICAL_SITE_URL = "https://transportugal.com.br"

export default defineConfig({
  output: "server",

  adapter: cloudflare({
    sessionKVBindingName: "SESSION",
    imageService: "passthrough",
    prerenderEnvironment: "node",
  }),

  fonts: [
    {
      name: "Lexend",
      provider: fontProviders.google(),
      cssVariable: "--font-lexend",
      weights: ["400", "500", "600"],
    },
  ],

  integrations: [
    sunUIAstroIntegration({
      svelte: { configFile: false },
    }),
    robotsSitemap({ canonicalHost: CANONICAL_SITE_URL }),
  ],

  trailingSlash: "ignore",
  site: CANONICAL_SITE_URL,

  vite: {
    plugins: [tailwindcss()],
    // Pre-bundle deps that were being discovered mid-request in the "ssr"
    // (workerd) environment. Late discovery triggers a Vite optimizer
    // reload while a request is in flight; the Cloudflare runner can then
    // reference an already-invalidated `.vite/deps_ssr` chunk and crash
    // with "The file does not exist at ... deps_ssr/*.js". Listing them
    // here gets them into the first scan pass instead.
    // See @astrojs/cloudflare/dist/index.js configEnvironment(), which
    // merges this array into the "ssr" environment's optimizeDeps.include.
    optimizeDeps: {
      include: [
        "astro/app/manifest",
        "astro/assets/services/noop",
        "@astrojs/svelte/server.js",
        "astro-iconset/components",
        "@astro-community/astro-embed-youtube",
      ],
    },
  },
})
