import { defineConfig } from "tsdown"

export default defineConfig({
  entry: ["./src/index.ts", "./src/astro/index.ts"],
  dts: true,
  publint: true,
  deps: {
    neverBundle: ["emdash", /^emdash\//, /^@websites\/sun-ui/, /\.astro$/],
  },
  copy: [
    {
      from: ["src/astro/**/*.astro", "src/astro/**/*.astro.d.ts"],
      flatten: false,
    },
  ],
})
