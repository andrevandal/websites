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

const { SITE_URL, ENABLE_PARTYTOWN: isPartytownEnabled } = v.parse(
  v.pipe(
    v.object({
      SITE_URL: v.pipe(
        v.optional(v.pipe(v.string(), v.url("The url is badly formatted.")))
      ),
      ENABLE_PARTYTOWN: v.pipe(
        v.optional(v.string(), "false"),
        v.transform(value => value === "true")
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
    sessionKVBindingName: "SESSION",
    imageService: "passthrough",
    prerenderEnvironment: "node",
  }),

  i18n: {
    locales: ["en", "pt"],
    defaultLocale: "en",
    routing: {
      prefixDefaultLocale: false,
    },
  },

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
  site: SITE_URL,

  vite: {
    plugins: [tailwindcss()],
  },
})
