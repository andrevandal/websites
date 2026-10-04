import { defineConfig } from "tsdown"
import { promises } from "node:fs"
import { resolve } from "node:path"

const astroExportFolders = async () => {
    const root = resolve(import.meta.dirname, "src/astro"),
      folders = new Set<string>()
    for await (const entry of promises.glob(resolve(root, "**/*.astro"))) {
      const folder = entry
        .slice(root.length + 1)
        .split("/")
        .slice(0, -1)
        .join("/")
      if (folder) folders.add(folder)
    }
    return folders
  },
  astroFolders = await astroExportFolders()

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./src/astro/index.ts",
    "./src/astro/runtime-env.ts",
    "./src/svelte/index.ts",
    "./src/astro-integration.ts",
    "./src/astro-image-service.ts",
    "./src/config.ts",
  ],
  dts: true,
  publint: true,
  deps: {
    neverBundle: [
      "astro-iconset",
      "astro",
      "@astro-community/astro-embed-youtube",
      /\.astro$/,
      /\.svelte$/,
      "svelte",
      "@astrojs/svelte",
      "bits-ui",
    ],
  },
  copy: [
    {
      from: [
        "src/astro/**/*.astro",
        "src/astro/**/*.astro.d.ts",
        "src/astro/**/*.props.ts",
        "src/astro/**/*.utils.ts",
        "src/astro/**/*.svelte",
        "src/astro/**/*.svelte.d.ts",
        "src/svelte/**/*.svelte",
        "src/svelte/**/*.svelte.d.ts",
        "!src/astro/**/*.{test,spec}.*",
        "!src/svelte/**/*.{test,spec}.*",
      ],
      flatten: false,
    },
  ],
  exports: {
    customExports(exports) {
      exports["./svelte"] = {
        types: "./dist/svelte/index.d.mts",
        default: "./dist/svelte/index.mjs",
      }

      for (const folder of astroFolders)
        exports[`./astro/${folder}/*`] = `./dist/astro/${folder}/*.astro`

      return exports
    },
  },
})
