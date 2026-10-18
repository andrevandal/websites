import type { ImageTransform } from "astro"
import { getSecret } from "astro:env/server"
import { runtimeEnv } from "@vandal-websites/sun-ui/astro/runtime-env"
import { buildImageUrl } from "@vandal-websites/sun-ui/astro-image-service"

const FILES_BASE_URL = "https://files.vandal.services/pedrohenridesign"

const fileUrl = (path: string): string => `${FILES_BASE_URL}/${path}`

// Pixel densities the image service serves. Sources in the bucket should be
// at least 3x the widest rendered size so the largest one is never upscaled.
const DENSITIES = [1, 1.5, 2, 2.5, 3]

// Request-time URL through the image service; the raw source when
// IMAGES_BASE_URL is unset (local dev, where the service cannot reach the source).
const imageUrl = (
  src: string,
  transform: Omit<ImageTransform, "src">
): string => {
  const base = runtimeEnv(getSecret, "IMAGES_BASE_URL")
  return base ? buildImageUrl(base, { ...transform, src }) : src
}

export { DENSITIES, fileUrl, imageUrl }
