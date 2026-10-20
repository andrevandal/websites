import type { ImageTransform } from "astro"
import { getSecret } from "astro:env/server"
import { assetUrl, runtimeEnv } from "@vandal-websites/sun-ui/astro/runtime-env"
import { buildImageUrl } from "@vandal-websites/sun-ui/astro-image-service"

const fileUrl = (path: string): string => assetUrl(getSecret, path)

// Request-time URL through the image service; the raw file when IMAGES_BASE_URL is unset (local dev).
const imageUrl = (
  path: string,
  transform: Omit<ImageTransform, "src">
): string => {
  const base = runtimeEnv(getSecret, "IMAGES_BASE_URL")
  return base
    ? buildImageUrl(base, { ...transform, src: fileUrl(path) })
    : fileUrl(path)
}

export { fileUrl, imageUrl }
