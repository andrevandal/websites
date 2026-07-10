import type { AstroIntegration } from "astro"
import astroIconset from "astro-iconset"

type Props = {
  iconsetOptions?: Parameters<typeof astroIconset>[0]
  imageServiceBaseUrl?: string
}

const SunUIAstroIntegration = (props: Props = {}): AstroIntegration => {
  const { iconsetOptions, imageServiceBaseUrl } = props

  return {
    name: "sun-ui",
    hooks: {
      "astro:config:setup": ({ updateConfig }) => {
        const config: Parameters<typeof updateConfig>[0] = {
          integrations: [astroIconset(iconsetOptions)],
        }
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
