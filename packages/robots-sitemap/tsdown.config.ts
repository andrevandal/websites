import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["./src/index.ts", "./src/robots.ts", "./src/sitemap.ts"],
  dts: true,
  publint: true,
  deps: {
    neverBundle: ["astro", /^virtual:/],
  },
})
