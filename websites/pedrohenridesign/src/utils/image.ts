import { createImageUtils } from "@vandal-websites/astro/utils"
import { SITE_IMAGE_CONFIG } from "../config/image"

const {
  getImageUrl,
  parseSizes,
  generateSrcSet,
  generateSizesString,
  generateImageProps,
} = createImageUtils(SITE_IMAGE_CONFIG)

export {
  getImageUrl,
  parseSizes,
  generateSrcSet,
  generateSizesString,
  generateImageProps,
}
