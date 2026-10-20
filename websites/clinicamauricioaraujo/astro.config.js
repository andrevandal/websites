import { defineConfig, fontProviders } from "astro/config"
import { robotsSitemap } from "@vandal-websites/robots-sitemap"
import cloudflare from "@astrojs/cloudflare"
import tailwindcss from "@tailwindcss/vite"
import icon from "astro-iconset"

const CANONICAL_SITE_URL = "https://clinicamauricioaraujo.com.br"

export default defineConfig({
  output: "server",
  adapter: cloudflare({
    sessionKVBindingName: "SESSION",
    imageService: "passthrough",
    prerenderEnvironment: "node",
  }),

  fonts: [
    {
      name: "Inter",
      provider: fontProviders.google(),
      cssVariable: "--font-inter",
      weights: ["400", "500", "600", "700"],
    },
  ],

  integrations: [
    robotsSitemap({ canonicalHost: CANONICAL_SITE_URL }),
    icon({
      include: {
        heroicons: ["arrow-down", "chevron-down", "check", "star-solid"],
        "streamline-logos": [
          "whatsapp-logo",
          "youtube-logo-block",
          "whatsapp-logo-solid",
        ],
        logos: ["google-icon"],
      },
      svgoOptions: {
        plugins: [
          {
            name: "addAttributesToSVGElement",
            params: {
              attributes: [{ "shape-rendering": "auto" }],
            },
          },
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
