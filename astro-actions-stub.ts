import { plugin } from "bun"

// `astro:actions` is a virtual module Astro's Vite pipeline resolves at
// dev/build time; it does not exist as a real package, so plain `bun test`
// cannot import it. This test-only stub lets action-definition files
// (e.g. `src/actions/route.ts`) import the real `defineAction`/`ActionError`
// API shape under `bun test`, matching the idiomatic Astro Actions code
// verbatim — `defineAction` returns its config unchanged (handler stays
// directly callable), and `ActionError` is a real `Error` subclass with a
// `code` property, mirroring Astro's runtime behavior closely enough for
// unit-testing the pure logic these handlers thinly wrap.
plugin({
  name: "astro:actions stub",
  setup(builder) {
    builder.module("astro:actions", () => ({
      exports: {
        defineAction: (config: unknown) => config,
        ActionError: class ActionError extends Error {
          code: string

          constructor(config: { code: string; message?: string }) {
            super(config.message ?? config.code)
            this.code = config.code
          }
        },
        actions: {},
      },
      loader: "object",
    }))
  },
})
