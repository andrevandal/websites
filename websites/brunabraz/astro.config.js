// @ts-nocheck
import { defineConfig, fontProviders, envField } from "astro/config"
import sunUIAstroIntegration from "@vandal-websites/sun-ui/astro-integration"
import tailwindcss from "@tailwindcss/vite"
import sitemap from "@astrojs/sitemap"
import partytown from "@astrojs/partytown"
import cloudflare from "@astrojs/cloudflare"
import { loadEnv } from "vite"
// oxlint-disable-next-line import/no-namespace
import * as v from "valibot"

const env = loadEnv(import.meta.env.MODE, process.cwd(), "")
if (env.IMAGES_BASE_URL === "") delete env.IMAGES_BASE_URL

const {
  SITE_URL,
  IMAGES_BASE_URL,
  ENABLE_PARTYTOWN: isPartytownEnabled,
} = v.parse(
  v.pipe(
    v.object({
      SITE_URL: v.pipe(
        v.optional(v.pipe(v.string(), v.url("The url is badly formatted.")))
      ),
      IMAGES_BASE_URL: v.pipe(
        v.optional(v.pipe(v.string(), v.url("The url is badly formatted.")))
      ),
      ENABLE_PARTYTOWN: v.pipe(
        v.optional(v.string(), "false"),
        v.transform(value => value === "true")
      ),
    })
  ),
  env
)
console.log(
  `[ASTRO] Partytown is ${isPartytownEnabled ? "enabled" : "disabled"}.`
)
console.log(
  `[ASTRO] Image service: ${IMAGES_BASE_URL ? "custom" : "passthrough"}.`
)

export default defineConfig({
  output: "server",

  adapter: cloudflare({
    sessionKVBindingName: "SESSION",
    imageService: IMAGES_BASE_URL ? "custom" : "passthrough",
    prerenderEnvironment: "node",
  }),

  env: {
    schema: {
      SITE_URL: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
      ENABLE_PARTYTOWN: envField.boolean({
        context: "server",
        access: "secret",
        optional: true,
        default: false,
      }),
      IMAGES_BASE_URL: envField.string({
        context: "server",
        access: "secret",
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
    validateSecrets: true,
  },

  integrations: [
    sunUIAstroIntegration({
      imageServiceBaseUrl: IMAGES_BASE_URL,
      svelte: true,
    }),
    sitemap(),
    isPartytownEnabled &&
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
  site: SITE_URL,

  vite: {
    plugins: [tailwindcss()],
  },
})
