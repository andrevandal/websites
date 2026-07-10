import type {
  SunPictureBreakpoint,
  SunPictureDensity,
  SunPicturePlaceholderMode,
} from "./Picture.props.ts"

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

  const densityFactors = (densities ?? [1]).map(density =>
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

const getPlaceholderModeAttribute = (
  placeholderMode: SunPicturePlaceholderMode | undefined
): SunPicturePlaceholderMode | undefined => placeholderMode

export type {
  ComputeResponsiveImagePropsInput,
  ComputeResponsiveImagePropsOutput,
}
export { computeResponsiveImageProps, getPlaceholderModeAttribute }
