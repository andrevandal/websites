import type { ExternalImageService } from "astro"
import { buildRiapiModifiers } from "./utils/riapi-modifiers"

type SunImageServiceConfig = {
  baseUrl: string
}

const requireBaseUrl = (config: SunImageServiceConfig | undefined): string => {
  const baseUrl = config?.baseUrl
  if (!baseUrl) {
    throw new Error(
      `@vandal-websites/sun-ui/astro-image-service requires \`image.service.config.baseUrl\` in astro.config (the apps/images deployment URL, e.g. https://images.example.com)`
    )
  }
  return baseUrl.replace(/\/+$/, "")
}

const validateOptions: ExternalImageService<SunImageServiceConfig>["validateOptions"] =
  options => {
    if (typeof options.src !== "string") {
      throw new Error(
        `@vandal-websites/sun-ui/astro-image-service only supports remote URL sources (\`src\` must be a string). Co-located/imported local assets are not supported by this image service.`
      )
    }

    const protocol = URL.canParse(options.src)
      ? new URL(options.src).protocol
      : undefined

    if (protocol !== "http:" && protocol !== "https:") {
      throw new Error(
        `@vandal-websites/sun-ui/astro-image-service only supports remote URL sources (\`src\` must be a valid http/https URL). Local paths are not supported.`
      )
    }

    if (options.width) options.width = Math.round(options.width)
    if (options.height) options.height = Math.round(options.height)

    return options
  }

const getURL: ExternalImageService<SunImageServiceConfig>["getURL"] = (
  options,
  imageConfig
) => {
  const baseUrl = requireBaseUrl(imageConfig.service.config)
  const modifiers = buildRiapiModifiers(options)
  // validateOptions runs before getURL (Astro's getImage() calls it first and
  // passes its return value on) and guarantees `src` is a string.
  const source = encodeURIComponent(options.src as string)

  return `${baseUrl}/${modifiers}/${source}`
}

const getHTMLAttributes: ExternalImageService<SunImageServiceConfig>["getHTMLAttributes"] =
  options => {
    const {
      src: _src,
      format: _format,
      quality: _quality,
      fit: _fit,
      position: _position,
      background: _background,
      widths: _widths,
      densities: _densities,
      layout: _layout,
      ...attributes
    } = options

    return {
      ...attributes,
      loading: attributes.loading ?? "lazy",
      decoding: attributes.decoding ?? "async",
    }
  }

const getSrcSet: ExternalImageService<SunImageServiceConfig>["getSrcSet"] =
  options => {
    const { densities, widths, width, height } = options
    if (!width) return []

    if (densities) {
      const factors = densities
        .map(density =>
          typeof density === "number" ? density : Number.parseFloat(density)
        )
        .sort((a, b) => a - b)

      return factors.map(factor => ({
        transform: {
          ...options,
          width: Math.round(width * factor),
          height: height ? Math.round(height * factor) : undefined,
        },
        descriptor: `${factor}x`,
      }))
    }

    if (widths) {
      const aspectRatio = height ? height / width : undefined
      const targetWidths = [...widths].sort((a, b) => a - b)

      return targetWidths.map(targetWidth => ({
        transform: {
          ...options,
          width: targetWidth,
          height: aspectRatio
            ? Math.round(targetWidth * aspectRatio)
            : undefined,
        },
        descriptor: `${targetWidth}w`,
      }))
    }

    return []
  }

// apps/images' placeholder endpoint (README "Placeholder"): GET /{modifiers}/{source}?placeholder.
// Ignores the modifiers segment entirely and returns a fixed small ThumbHash PNG blur, keyed by
// source only. This is separate from the getURL()/getSrcSet() Astro pipeline — callers request it
// as their own plain <img>, typically layered behind the real <Image> for a blur-up effect.
const getPlaceholderUrl = (baseUrl: string, source: string): string =>
  `${baseUrl.replace(/\/+$/, "")}/_/${encodeURIComponent(source)}?placeholder`

const sunImageService: ExternalImageService<SunImageServiceConfig> = {
  validateOptions,
  getURL,
  getSrcSet,
  getHTMLAttributes,
}

export type { SunImageServiceConfig }
export { getPlaceholderUrl }
export default sunImageService
