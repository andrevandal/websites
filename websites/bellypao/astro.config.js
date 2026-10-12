import { defineConfig, envField } from "astro/config"
import sunUIAstroIntegration from "@vandal-websites/sun-ui/astro-integration"
import { robotsSitemap } from "@vandal-websites/robots-sitemap"
import partytown from "@astrojs/partytown"
import cloudflare from "@astrojs/cloudflare"
import tailwindcss from "@tailwindcss/vite"

const CANONICAL_SITE_URL = "https://bellypao.com.br"

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
    robotsSitemap({ canonicalHost: CANONICAL_SITE_URL }),
    partytown({
      config: {
        forward: [
          ["dataLayer.push", { preserveBehavior: true }],
          ["gtag", { preserveBehavior: true }],
        ],
      },
    }),
  ],
  trailingSlash: "ignore",
  site: CANONICAL_SITE_URL,
  vite: {
    plugins: [tailwindcss()],
  },
})
