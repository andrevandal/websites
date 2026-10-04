// @ts-nocheck
import { defineConfig, fontProviders, envField } from "astro/config"
import sunUIAstroIntegration from "@vandal-websites/sun-ui/astro-integration"
import tailwindcss from "@tailwindcss/vite"
import sitemap from "@astrojs/sitemap"
import partytown from "@astrojs/partytown"
import cloudflare from "@astrojs/cloudflare"

const CANONICAL_SITE_URL = "https://brunabraz.com.br"

export default defineConfig({
  output: "server",

  adapter: cloudflare({
    sessionKVBindingName: "SESSION",
    imageService: "passthrough",
    prerenderEnvironment: "node",
  }),

  env: {
    schema: {
      PUBLIC_GOOGLE_ANALYTICS_ID: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
      PUBLIC_GOOGLE_ADS_CONVERSION_ID: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
      PUBLIC_GOOGLE_ADS_CONVERSION_LABEL: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
    },
    validateSecrets: true,
  },

  integrations: [
    sunUIAstroIntegration({
      svelte: true,
    }),
    sitemap(),
    partytown({
      config: {
        forward: [
          ["dataLayer.push", { preserveBehavior: true }],
          ["gtag", { preserveBehavior: true }],
        ],
      },
    }),
  ],
  fonts: [
    {
      name: "DM Sans",
      provider: fontProviders.google(),
      cssVariable: "--font-dm-sans",
      weights: ["400", "500", "600", "700"],
    },
    {
      name: "Averia Serif Libre",
      provider: fontProviders.google(),
      cssVariable: "--font-averia",
      weights: ["400", "500", "600", "700"],
      styles: ["normal", "italic"],
    },
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
