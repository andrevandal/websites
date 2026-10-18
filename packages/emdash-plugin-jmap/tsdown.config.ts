import { defineConfig } from "tsdown"

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./src/plugin.ts",
    "./src/admin.tsx",
    "./src/settings.ts",
  ],
  dts: true,
  publint: true,
  deps: {
    neverBundle: [
      "emdash",
      /^emdash\//,
      "react",
      /^react\//,
      "@cloudflare/kumo",
      "ofetch",
    ],
  },
})
