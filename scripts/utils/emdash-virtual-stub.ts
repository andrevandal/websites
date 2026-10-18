// Preload for scripts that import emdash's runtime outside Vite: its virtual
// config module only exists in a Vite build, and these scripts never read it.
import { plugin } from "bun"

plugin({
  name: "emdash-virtual-stub",
  setup: build => {
    build.module("virtual:emdash/config", () => ({
      exports: { default: {} },
      loader: "object",
    }))
  },
})
