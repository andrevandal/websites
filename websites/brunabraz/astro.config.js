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

const {
  SITE_URL,
  ENABLE_PARTYTOWN: isPartytownEnabled,
  DEPLOY_ENV,
} = v.parse(
  v.pipe(
    v.object({
      SITE_URL: v.pipe(
        v.optional(v.pipe(v.string(), v.url("The url is badly formatted.")))
      ),
      ENABLE_PARTYTOWN: v.pipe(
        v.optional(v.string(), "false"),
        v.transform(value => value === "true")
      ),
      DEPLOY_ENV: v.optional(
        v.picklist(["staging", "preview", "production"]),
        "preview"
      ),
    })
  ),
  loadEnv(import.meta.env.MODE, process.cwd(), "")
)
console.log(
  `[ASTRO] Partytown is ${isPartytownEnabled ? "enabled" : "disabled"}.`
)

export default defineConfig({
  output: "server",

  adapter: cloudflare({
    sessionKVBindingName: `SESSION_${DEPLOY_ENV.toLocaleUpperCase()}`,
    imageService: "passthrough",
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
      DEPLOY_ENV: envField.enum({
        context: "server",
        access: "secret",
        values: ["staging", "preview", "production"],
        default: "preview",
        optional: true,
      }),
    },
    validateSecrets: true,
  },

  integrations: [
    sunUIAstroIntegration(),
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
