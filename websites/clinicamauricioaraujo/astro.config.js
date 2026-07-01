import { defineConfig, envField, fontProviders } from "astro/config"
import { loadEnv } from "vite"
import sitemap from "@astrojs/sitemap"
import partytown from "@astrojs/partytown"
import cloudflare from "@astrojs/cloudflare"
import tailwindcss from "@tailwindcss/vite"
import icon from "astro-iconset"

const { CF_PAGES_URL, CF_PAGES, CF_PAGES_BRANCH, SITE_URL } = loadEnv(
  import.meta.env.MODE,
  process.cwd(),
  ""
)
const getSite = () => {
  if (SITE_URL) {
    return SITE_URL
  }

  if (CF_PAGES && CF_PAGES_BRANCH !== "main") {
    return CF_PAGES_URL
  }

  return "http://localhost:4321"
}
const siteUrl = getSite()

export default defineConfig({
  output: "server",

  adapter: cloudflare({
    imageService: "passthrough",
  }),

  fonts: [
    {
      name: "Inter",
      provider: fontProviders.fontsource(),
      cssVariable: "--font-inter",
      weights: ["400", "500", "600", "700"],
    },
  ],

  env: {
    schema: {
      SITE_URL: envField.string({
        context: "server",
        access: "public",
        optional: true,
      }),
      PUBLIC_GOOGLE_ANALYTICS_ID: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      PUBLIC_GOOGLE_ADS_CONVERSION_ID: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      PUBLIC_GOOGLE_ADS_CONVERSION_LABEL: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
    },
  },

  integrations: [
    sitemap(),
    partytown({
      config: {
        forward: ["dataLayer.push"],
      },
    }),
    icon({
      include: {
        "heroicons-outline": ["chevron-down"],
        heroicons: ["arrow-down", "chevron-down", "check"],
        "streamline-logos": [
          "whatsapp-logo",
          "youtube-logo-block",
          "whatsapp-logo-solid",
        ],
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
  site: siteUrl,

  vite: {
    plugins: [tailwindcss()],
  },
})
