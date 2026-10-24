// @ts-nocheck
import { defineConfig, fontProviders } from "astro/config"
import sunUIAstroIntegration from "@vandal-websites/sun-ui/astro-integration"
import tailwindcss from "@tailwindcss/vite"
import { robotsSitemap } from "@vandal-websites/robots-sitemap"
import { analyticsPlugin } from "@vandal-websites/emdash-plugin-analytics"
import cloudflare from "@astrojs/cloudflare"
import node from "@astrojs/node"
import react from "@astrojs/react"
import emdash from "emdash/astro"
import { jmapEmailPlugin } from "@vandal-websites/emdash-plugin-jmap"
import { mkdirSync } from "node:fs"
import { builtinModules } from "node:module"
import { esmExternalRequirePlugin, loadEnv } from "vite"
import { resolveEmDashProviders } from "./src/cms/providers.ts"

const CANONICAL_SITE_URL = "https://brunabraz.com.br"

const env = loadEnv(import.meta.env.MODE, process.cwd(), "")

const isDev = process.argv.includes("dev")
if (isDev) mkdirSync("./.data/uploads", { recursive: true })

const { database, storage, auth } = resolveEmDashProviders({ isDev, env })

export default defineConfig({
  output: "server",

  adapter: isDev
    ? node({ mode: "standalone" })
    : cloudflare({
        sessionKVBindingName: "SESSION",
        imageService: "passthrough",
        prerenderEnvironment: "node",
      }),

  integrations: [
    sunUIAstroIntegration({
      svelte: true,
    }),
    robotsSitemap({
      canonicalHost: CANONICAL_SITE_URL,
      sitemapPath: "/sitemap.xml",
      injectRobots: false,
    }),
    react(),
    // No siteUrl: on Workers EmDash records the hostname it is served on, so
    // the admin works on Stage hosts other than the canonical one.
    emdash({
      database,
      storage,
      ...(auth ? { auth } : {}),
      admin: { locales: ["pt-BR"] },
      // Analytics loads in every environment. Only the email plugin is
      // build-only: dev leaves EmDash's console email provider as the only
      // one, so it is auto-selected and magic links print to the terminal.
      plugins: [analyticsPlugin(), ...(isDev ? [] : [jmapEmailPlugin()])],
      // CI applies core migrations (scripts/deploy.ts migrate); the Worker only
      // checks and returns 503 while any are pending.
      migrations: { runtime: "check", dev: "auto" },
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
  site: CANONICAL_SITE_URL,

  // EmDash reads its content locale from here; without it new entries default
  // to "en" while the seeded pages, terms, and menus are pt-BR.
  i18n: { defaultLocale: "pt-BR", locales: ["pt-BR"] },

  vite: {
    plugins: [tailwindcss()],
    // CJS deps (postcss via emdash > sanitize-html) call require("path"), which
    // Rolldown leaves as a throwing __require in workerd. Rewrite externals to
    // imports. See cloudflare/workers-sdk#11948.
    build: {
      rolldownOptions: {
        plugins: isDev
          ? []
          : [
              esmExternalRequirePlugin({
                external: [/^node:/, ...builtinModules],
              }),
            ],
      },
    },
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
    // Node dev leaves node_modules external, but these ship TypeScript or
    // import `virtual:` modules (directly, or through `emdash`) that only Vite
    // can resolve. Workers builds bundle everything, so only Node dev needs it.
    ssr: {
      noExternal: ["astro", "astro-iconset", /^@astro-community\/astro-embed-/],
    },
  },
})
