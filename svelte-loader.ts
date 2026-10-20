import { plugin } from "bun"
import { readFileSync } from "fs"
import { compile, compileModule } from "svelte/compiler"

plugin({
  name: "svelte loader",
  setup(builder) {
    // `.svelte` components — compiled via `compile()`.
    builder.onLoad({ filter: /\.svelte$/ }, ({ path }) => {
      const source = readFileSync(path, "utf-8"),
        result = compile(source, {
          filename: path,
          generate: "client",
          dev: true,
        })
      return {
        contents: result.js.code,
        loader: "js",
      }
    })

    // `.svelte.js`/`.svelte.ts` rune-only modules (e.g. bits-ui's internals)
    // ship raw, uncompiled rune syntax and need `compileModule()`, a
    // distinct API from `compile()` — they are not components.
    builder.onLoad({ filter: /\.svelte\.(?:js|ts)$/ }, ({ path }) => {
      const source = readFileSync(path, "utf-8"),
        result = compileModule(source, {
          filename: path,
          generate: "client",
          dev: true,
        })
      return {
        contents: result.js.code,
        loader: "js",
      }
    })
  },
})
