// @ts-nocheck
import { defineConfig, fontProviders } from "astro/config"
import sunUIAstroIntegration from "@vandal-websites/sun-ui/astro-integration"
import tailwindcss from "@tailwindcss/vite"
import { robotsSitemap } from "@vandal-websites/robots-sitemap"
import cloudflare from "@astrojs/cloudflare"

const CANONICAL_SITE_URL = "https://vandallabs.com.br"

export default defineConfig({
  output: "server",

  adapter: cloudflare({
    sessionKVBindingName: "SESSION",
    imageService: "passthrough",
    prerenderEnvironment: "node",
  }),

  i18n: {
    locales: ["en", "pt"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: true,
    },
  },

  integrations: [
    sunUIAstroIntegration(),
    robotsSitemap({ canonicalHost: CANONICAL_SITE_URL }),
  ],
  fonts: [
    {
      name: "Archivo",
      provider: fontProviders.google(),
      cssVariable: "--font-archivo",
      weights: ["400", "700"],
    },
    {
      name: "Archivo",
      provider: fontProviders.google(),
      cssVariable: "--font-archivo-expanded",
      weights: ["800"],
      stretch: "125%",
    },
    {
      name: "Newsreader",
      provider: fontProviders.google(),
      cssVariable: "--font-newsreader",
      weights: ["400"],
      styles: ["normal", "italic"],
    },
    {
      name: "JetBrains Mono",
      provider: fontProviders.google(),
      cssVariable: "--font-jetbrains-mono",
      weights: ["400", "500"],
    },
  ],

  trailingSlash: "ignore",
  site: CANONICAL_SITE_URL,

  vite: {
    plugins: [tailwindcss()],
  },
})
