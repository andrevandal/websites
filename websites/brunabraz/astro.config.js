// @ts-nocheck
import { defineConfig, fontProviders } from "astro/config"
import SunUIAstroIntegration from "@vandal-websites/sun-ui/astro-integration"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  integrations: [SunUIAstroIntegration()],
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
  vite: {
    plugins: [tailwindcss()],
  },
})
