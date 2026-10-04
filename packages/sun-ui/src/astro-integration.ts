import type { AstroIntegration } from "astro"
import astroIconset from "astro-iconset"
import svelteIntegration from "@astrojs/svelte"

type Props = {
  iconsetOptions?: Parameters<typeof astroIconset>[0]
  svelte?: boolean | Parameters<typeof svelteIntegration>[0]
}

const VIRTUAL_CONFIG_ID = "virtual:sun-ui/config",
  RESOLVED_VIRTUAL_CONFIG_ID = `\0${VIRTUAL_CONFIG_ID}`,
  // `src/config.ts` when consumed from source, `dist/config.mjs` once published.
  FALLBACK_CONFIG_SUFFIXES = [
    "/sun-ui/src/config.ts",
    "/sun-ui/dist/config.mjs",
  ],
  isFallbackConfigModule = (id: string) => {
    const path = id.replace(/\\/g, "/")
    return FALLBACK_CONFIG_SUFFIXES.some(suffix => path.endsWith(suffix))
  },
  // Sun UI components import the real `config` module so a site that never
  // registers this integration still builds. When the integration *is* present it
  // overrides that module, which is how its options reach component frontmatter.
  virtualConfigPlugin = () => ({
    name: "sun-ui:config",
    resolveId: (id: string) =>
      id === VIRTUAL_CONFIG_ID ? RESOLVED_VIRTUAL_CONFIG_ID : undefined,
    load: (id: string) =>
      id === RESOLVED_VIRTUAL_CONFIG_ID || isFallbackConfigModule(id)
        ? `export const imageServiceBaseUrl = undefined\n`
        : undefined,
  }),
  SunUIAstroIntegration = (props: Props = {}): AstroIntegration => {
    const { iconsetOptions, svelte } = props

    return {
      name: "sun-ui",
      hooks: {
        "astro:config:setup": ({ updateConfig }) => {
          const integrations: NonNullable<
            Parameters<typeof updateConfig>[0]["integrations"]
          > = [astroIconset(iconsetOptions)]

          if (svelte) {
            integrations.push(
              svelteIntegration(typeof svelte === "object" ? svelte : undefined)
            )
          }

          const config: Parameters<typeof updateConfig>[0] = {
            integrations,
            vite: { plugins: [virtualConfigPlugin()] },
          }
          updateConfig(config)
        },
      },
    }
  }

export default SunUIAstroIntegration
