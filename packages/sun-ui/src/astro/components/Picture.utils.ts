import type {
  SunPictureBreakpoint,
  SunPictureDensity,
  SunPicturePlaceholderMode,
  SunPictureProps,
  SunPictureSource,
} from "./Picture.props.ts"
import { buildImageSrcSet, buildImageUrl } from "../../astro-image-service"

const DENSITIES: SunPictureDensity[] = [1, 1.5, 2, 2.5, 3]

type BuildPictureSourcePropsInput = SunPictureSource &
  Pick<SunPictureProps, "quality" | "format" | "fit" | "densities"> & {
    imageServiceBaseUrl?: string
  }

type ComputeResponsiveImagePropsInput = {
  width: number
  densities?: SunPictureDensity[]
  breakpoints?: SunPictureBreakpoint[]
}

type ComputeResponsiveImagePropsOutput = {
  responsiveWidths: number[] | undefined
  sizes: string | undefined
}

const computeResponsiveImageProps = (
  input: ComputeResponsiveImagePropsInput
): ComputeResponsiveImagePropsOutput => {
  const { width, densities, breakpoints } = input

  const densityFactors = (densities ?? DENSITIES).map(density =>
    typeof density === "number" ? density : Number.parseFloat(density)
  )

  const responsiveWidths =
    breakpoints && breakpoints.length > 0
      ? Array.from(
          new Set(
            [width, ...breakpoints.map(bp => bp.width)].flatMap(tierWidth =>
              densityFactors.map(factor => Math.round(tierWidth * factor))
            )
          )
        ).sort((a, b) => a - b)
      : undefined

  const sizes =
    breakpoints && breakpoints.length > 0
      ? [...breakpoints]
          .sort((a, b) => b.minWidth - a.minWidth)
          .map(bp => `(min-width: ${bp.minWidth}px) ${bp.width}px`)
          .concat(`${width}px`)
          .join(", ")
      : undefined

  return { responsiveWidths, sizes }
}

const buildPictureSourceProps = ({
  media,
  src,
  width,
  height,
  breakpoints,
  quality,
  format,
  fit,
  densities = DENSITIES,
  imageServiceBaseUrl,
}: BuildPictureSourcePropsInput) => {
  const { responsiveWidths, sizes } = computeResponsiveImageProps({
    width,
    breakpoints,
    densities,
  })
  const srcset = imageServiceBaseUrl
    ? buildImageSrcSet({
        src,
        width,
        height,
        quality,
        format,
        fit,
        ...(responsiveWidths ? { widths: responsiveWidths } : { densities }),
      })
        .map(
          entry =>
            `${buildImageUrl(imageServiceBaseUrl, entry.transform)} ${entry.descriptor}`
        )
        .join(", ")
    : src

  return { media, srcset, sizes, width, height }
}

const getPlaceholderModeAttribute = (
  placeholderMode: SunPicturePlaceholderMode | undefined
): SunPicturePlaceholderMode | undefined => placeholderMode

export type {
  BuildPictureSourcePropsInput,
  ComputeResponsiveImagePropsInput,
  ComputeResponsiveImagePropsOutput,
}
export {
  DENSITIES,
  buildPictureSourceProps,
  computeResponsiveImageProps,
  getPlaceholderModeAttribute,
}
