import { defineConfig } from "tsdown"
import { promises } from "node:fs"
import { resolve } from "node:path"

const astroExportFolders = async () => {
  const root = resolve(import.meta.dirname, "src/astro")
  const folders = new Set<string>()
  for await (const entry of promises.glob(resolve(root, "**/*.astro"))) {
    const folder = entry
      .slice(root.length + 1)
      .split("/")
      .slice(0, -1)
      .join("/")
    if (folder) folders.add(folder)
  }
  return folders
}

const astroFolders = await astroExportFolders()

export default defineConfig({
  entry: [
    "./src/index.ts",
    "./src/astro/index.ts",
    "./src/svelte/index.ts",
    "./src/astro-integration.ts",
    "./src/astro-image-service.ts",
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
      ],
      flatten: false,
    },
  ],
  exports: {
    customExports(exports) {
      for (const folder of astroFolders)
        exports[`./astro/${folder}/*`] = `./dist/astro/${folder}/*.astro`

      return exports
    },
  },
})
