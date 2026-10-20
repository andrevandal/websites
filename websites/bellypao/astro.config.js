import { defineConfig, fontProviders } from "astro/config"
import sunUIAstroIntegration from "@vandal-websites/sun-ui/astro-integration"
import { robotsSitemap } from "@vandal-websites/robots-sitemap"
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

  fonts: [
    {
      provider: fontProviders.local(),
      name: "Fields",
      cssVariable: "--belly-font-fields",
      weights: [200, 300, 400, 500, 600, 700, 800, 900],
      styles: ["normal"],
      options: {
        variants: [
          {
            src: ["./public/fonts/Fields-ExtraLight.woff2"],
            weight: 200,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./public/fonts/Fields-Light.woff2"],
            weight: 300,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./public/fonts/Fields-Regular.woff2"],
            weight: 400,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./public/fonts/Fields-Medium.woff2"],
            weight: 500,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./public/fonts/Fields-SemiBold.woff2"],
            weight: 600,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./public/fonts/Fields-Bold.woff2"],
            weight: 700,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./public/fonts/Fields-ExtraBold.woff2"],
            weight: 800,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./public/fonts/Fields-Black.woff2"],
            weight: 900,
            style: "normal",
            display: "swap",
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Quicksand",
      cssVariable: "--belly-font-quicksand",
      weights: [300, 400, 500, 600, 700],
      styles: ["normal"],
      options: {
        variants: [
          {
            src: ["./public/fonts/Quicksand-Light.woff2"],
            weight: 300,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./public/fonts/Quicksand-Regular.woff2"],
            weight: 400,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./public/fonts/Quicksand-Medium.woff2"],
            weight: 500,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./public/fonts/Quicksand-SemiBold.woff2"],
            weight: 600,
            style: "normal",
            display: "swap",
          },
          {
            src: ["./public/fonts/Quicksand-Bold.woff2"],
            weight: 700,
            style: "normal",
            display: "swap",
          },
        ],
      },
    },
  ],
  integrations: [
    sunUIAstroIntegration({
      svelte: true,
    }),
    robotsSitemap({ canonicalHost: CANONICAL_SITE_URL }),
  ],
  trailingSlash: "ignore",
  site: CANONICAL_SITE_URL,
  vite: {
    plugins: [tailwindcss()],
  },
})
