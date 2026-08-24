import type { AstroIntegration } from "astro"
import astroIconset from "astro-iconset"
import svelteIntegration from "@astrojs/svelte"

type Props = {
  iconsetOptions?: Parameters<typeof astroIconset>[0]
  imageServiceBaseUrl?: string
  svelte?: boolean | Parameters<typeof svelteIntegration>[0]
}

const SunUIAstroIntegration = (props: Props = {}): AstroIntegration => {
  const { iconsetOptions, imageServiceBaseUrl, svelte } = props

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

        const config: Parameters<typeof updateConfig>[0] = { integrations }
        if (imageServiceBaseUrl) {
          config.image = {
            service: {
              entrypoint: "@vandal-websites/sun-ui/astro-image-service",
              config: { baseUrl: imageServiceBaseUrl },
            },
          }
        }
        updateConfig(config)
      },
    },
  }
}

export default SunUIAstroIntegration
