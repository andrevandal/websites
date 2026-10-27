import { defineConfig, envField } from "astro/config"
import sunUIAstroIntegration from "@vandal-websites/sun-ui/astro-integration"
import { robotsSitemap } from "@vandal-websites/robots-sitemap"
import cloudflare from "@astrojs/cloudflare"
import tailwindcss from "@tailwindcss/vite"

const CANONICAL_SITE_URL = "https://gruice.com.br"
process.env.S3_PUBLIC_URL ||= "https://files.vandal.services/gruice"

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    sessionKVBindingName: "SESSION",
    imageService: "passthrough",
    prerenderEnvironment: "node",
  }),
  integrations: [
    sunUIAstroIntegration({
      svelte: true,
    }),
    robotsSitemap({ canonicalHost: CANONICAL_SITE_URL }),
  ],
  trailingSlash: "ignore",
  site: CANONICAL_SITE_URL,
  env: {
    schema: {
      S3_PUBLIC_URL: envField.string({
        context: "server",
        access: "public",
        default: process.env.S3_PUBLIC_URL,
      }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
