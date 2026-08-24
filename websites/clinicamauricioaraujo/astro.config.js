import { defineConfig, envField, fontProviders } from "astro/config"
import { loadEnv } from "vite"
import sitemap from "@astrojs/sitemap"
import partytown from "@astrojs/partytown"
import cloudflare from "@astrojs/cloudflare"
import tailwindcss from "@tailwindcss/vite"
import icon from "astro-iconset"
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

  fonts: [
    {
      name: "Inter",
      provider: fontProviders.google(),
      cssVariable: "--font-inter",
      weights: ["400", "500", "600", "700"],
    },
  ],

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
  site: SITE_URL,

  vite: {
    plugins: [tailwindcss()],
  },
})
