type ImageConfig = {
  ipxEndpoint: string
  bucketEndpoint: string
  bucketName: string
}

type Screens = Record<string, string>

const screens: Screens = {
  xs: "480px",
  sm: "640px",
  lg: "1024px",
  xl: "1280px",
}

type Sizes = Record<string, string>

const createImageUtils = (config: ImageConfig) => {
  const getImageUrl = (imagePath: string, transform = "_") =>
    `${config.ipxEndpoint}/${transform}/${config.bucketEndpoint}/${config.bucketName}/${imagePath}`.replace(
      /(?:[^:]\/)\/+/g,
      "$1"
    )

  const parseSizes = (sizes: string): Sizes => {
    const sizePairs = sizes.split(" ")
    const result: Sizes = {}

    sizePairs.forEach(sizePair => {
      const parts = sizePair.includes(":")
        ? sizePair.split(":")
        : ["default", sizePair]
      const breakpoint = parts[0] ?? "default"
      const size = parts[1] ?? sizePair
      result[breakpoint] = size
    })

    if (!result["default"]) {
      result["default"] = `${Object.entries(result).reduce<number>(
        (biggest, el) => {
          const [, size] = el
          const sizeNumber = parseInt(size.replace("px", ""))

          if (sizeNumber > biggest) return sizeNumber

          return biggest
        },
        0
      )}px`
    }

    return result
  }

  const generateSrcSet = (src: string, sizes: Sizes): string => {
    const DENSITIES = [1, 1.5, 2, 2.5, 3]
    const calculateWidth = (size: string) => {
      const width = parseInt(size.replace("px", ""))
      return DENSITIES.map(density => width * density)
    }

    const widths = Object.values(sizes).flatMap(size =>
      calculateWidth(size).map(width => {
        const format = src.endsWith(".gif") ? "gif" : "auto"
        const imageUrl = getImageUrl(src, `f_${format},q_90,w_${width}`)
        return `${imageUrl} ${width}w`
      })
    )
    return widths.join(", ")
  }

  const generateSizesString = (sizes: Sizes): string => {
    const sizesParts: { mediaQuery: string; size: string }[] = []
    const defaultSize = sizes["default"]

    for (const size in sizes) {
      if (size !== "default") {
        const mediaQuery = screens[size]
        if (mediaQuery) sizesParts.push({ mediaQuery, size: sizes[size] ?? "" })
      }
    }

    sizesParts.sort((a, b) => parseInt(b.mediaQuery) - parseInt(a.mediaQuery))

    const sizesStringParts = sizesParts.map(
      part => `(min-width: ${part.mediaQuery}) ${part.size}`
    )

    if (defaultSize) sizesStringParts.push(`${defaultSize}`)

    return sizesStringParts.join(", ")
  }

  const generateImageProps = (src: string, sizes: string) => {
    const parsedSizes = parseSizes(sizes)

    const maxWidth = Math.max(
      ...Object.values(parsedSizes).map(size =>
        parseInt(size.replace("px", ""))
      )
    )

    const srcSet = generateSrcSet(src, parsedSizes)
    const sizesString = generateSizesString(parsedSizes)

    const format = src.endsWith(".gif") ? "gif" : "auto"

    return {
      src: getImageUrl(src, `f_${format},q_90,w_${maxWidth}`),
      srcSet,
      sizes: sizesString,
    }
  }

  return {
    getImageUrl,
    parseSizes,
    generateSrcSet,
    generateSizesString,
    generateImageProps,
  }
}

export type { ImageConfig, Sizes }
export { createImageUtils }
