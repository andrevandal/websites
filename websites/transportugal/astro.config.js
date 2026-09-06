import { defineConfig, envField, fontProviders } from "astro/config"
import { loadEnv } from "vite"
import sunUIAstroIntegration from "@vandal-websites/sun-ui/astro-integration"
import sitemap from "@astrojs/sitemap"
import partytown from "@astrojs/partytown"
import cloudflare from "@astrojs/cloudflare"
import tailwindcss from "@tailwindcss/vite"
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

export default defineConfig({
  output: "server",

  adapter: cloudflare({
    sessionKVBindingName: "SESSION",
    imageService: IMAGES_BASE_URL ? "custom" : "passthrough",
    prerenderEnvironment: "node",
  }),

  fonts: [
    {
      name: "Lexend",
      provider: fontProviders.google(),
      cssVariable: "--font-lexend",
      weights: ["400", "500", "600"],
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
      svelte: { configFile: false },
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

  trailingSlash: "ignore",
  site: SITE_URL,

  vite: {
    plugins: [tailwindcss()],
    // Pre-bundle deps that were being discovered mid-request in the "ssr"
    // (workerd) environment. Late discovery triggers a Vite optimizer
    // reload while a request is in flight; the Cloudflare runner can then
    // reference an already-invalidated `.vite/deps_ssr` chunk and crash
    // with "The file does not exist at ... deps_ssr/*.js". Listing them
    // here gets them into the first scan pass instead.
    // See @astrojs/cloudflare/dist/index.js configEnvironment(), which
    // merges this array into the "ssr" environment's optimizeDeps.include.
    optimizeDeps: {
      include: [
        "astro/app/manifest",
        "astro/assets/services/noop",
        "@astrojs/svelte/server.js",
        "astro-iconset/components",
        "@astro-community/astro-embed-youtube",
      ],
    },
  },
})
