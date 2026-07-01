import type { AstroIntegration } from "astro"
import astroIconset from "astro-iconset"

type Props = {
  iconsetOptions: Parameters<typeof astroIconset>[0]
}

const SunUIAstroIntegration = (props: Props): AstroIntegration => {
  const { iconsetOptions } = props ?? {}

  return {
    name: "sun-ui",
    hooks: {
      "astro:config:setup": ({ updateConfig }) => {
        updateConfig({ integrations: [astroIconset(iconsetOptions)] })
      },
    },
  }
}

export default SunUIAstroIntegration
