import { plugin } from "bun"
import { transform } from "@astrojs/compiler-rs"
import { experimental_AstroContainer } from "astro/container"
import type { ContainerRenderOptions } from "astro/container"
import type { AstroComponentFactory } from "astro/runtime/server/index.js"

const repoRoot = Bun.fileURLToPath(
  new URL("../../../", import.meta.url)
).replaceAll("\\", "/")

plugin({
  name: "astro container loader",
  setup: builder => {
    builder.onLoad({ filter: /\.astro$/ }, async ({ path }) => {
      const result = transform(await Bun.file(path).text(), {
        filename: path,
        normalizedFilename: `/${path.replaceAll("\\", "/").slice(repoRoot.length)}`,
        internalURL: "astro/compiler-runtime",
        resultScopedSlot: true,
        resolvePath: specifier => specifier,
      })
      const errors = result.diagnostics.filter(
        diagnostic => diagnostic.severity === "error"
      )
      if (errors.length)
        throw new Error(errors.map(diagnostic => diagnostic.text).join("\n"))
      return { contents: result.code, loader: "ts" }
    })
    builder.module("astro:env/server", () => ({
      exports: { getSecret: (key: string) => process.env[key] },
      loader: "object",
    }))
  },
})

const renderAstro = async (
  componentUrl: URL,
  options: ContainerRenderOptions = {}
): Promise<string> => {
  // Runtime-selected components must load after the Bun plugin is registered.
  const module = await import(componentUrl.href)
  const container = await experimental_AstroContainer.create()
  return container.renderToString(
    module.default as AstroComponentFactory,
    options
  )
}

export { renderAstro }
