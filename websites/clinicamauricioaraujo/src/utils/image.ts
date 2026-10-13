import { getSecret } from "astro:env/server"
import { runtimeEnv } from "@vandal-websites/sun-ui/astro/runtime-env"

const BUCKET_ENDPOINT = "https://files.vandal.services"
const BUCKET_NAME = "clinicamauricioaraujo"

const screens = {
  xs: "480px",
  sm: "640px",
  lg: "1024px",
  xl: "1280px",
} as Record<string, string>

type Sizes = Record<string, string>
export const getImageUrl = (imagePath: string, transform = "_") => {
  const source = `${BUCKET_ENDPOINT}/${BUCKET_NAME}/${imagePath}`.replace(
    // oxlint-disable-next-line prefer-named-capture-group
    /([^:]\/)\/+/g,
    "$1"
  )
  const base = runtimeEnv(getSecret, "IMAGES_BASE_URL")
  return base
    ? `${base.replace(/\/+$/, "")}/${transform}/${encodeURIComponent(source)}`
    : source
}

export const parseSizes = (sizes: string) => {
  const sizePairs = sizes.split(" ")
  const result: Record<string, string> = {}

  sizePairs.forEach(sizePair => {
    const [breakpoint, size] = sizePair.includes(":")
      ? sizePair.split(":")
      : ["default", sizePair]

    if (!breakpoint || !size)
      throw new Error("Invalid image breakpoint or size")

    result[breakpoint] = size
  })

  // checking for missing default
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

export const generateSrcSet = (src: string, sizes: Sizes) => {
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

export const generateSizesString = (sizes: Record<string, string>) => {
  const sizesParts: { mediaQuery: string; size: string }[] = []
  const defaultSize = sizes["default"]

  for (const size in sizes) {
    if (Object.hasOwn(sizes, size) && size !== "default") {
      const mediaQuery = screens[size]
      const newSize = sizes[size]

      if (mediaQuery && newSize) sizesParts.push({ mediaQuery, size: newSize })
    }
  }

  // Ordenar sizesParts em ordem crescente de mediaQuery
  sizesParts.sort((a, b) => parseInt(b.mediaQuery) - parseInt(a.mediaQuery))

  const sizesStringParts = sizesParts.map(
    part => `(min-width: ${part.mediaQuery}) ${part.size}`
  )

  if (defaultSize) sizesStringParts.push(`${defaultSize}`)

  return sizesStringParts.join(", ")
}

export const generateImageProps = (src: string, sizes: string) => {
  const parsedSizes = parseSizes(sizes)

  const maxWidth = Math.max(
    ...Object.values(parsedSizes).map(size => parseInt(size.replace("px", "")))
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
