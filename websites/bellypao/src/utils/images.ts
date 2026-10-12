import type { ImageTransform } from "astro"
import { getSecret } from "astro:env/server"
import { runtimeEnv } from "@vandal-websites/sun-ui/astro/runtime-env"
import { buildImageUrl } from "@vandal-websites/sun-ui/astro-image-service"

const FILES_BASE_URL = "https://files.vandal.services/bellypao"

const fileUrl = (path: string): string => `${FILES_BASE_URL}/${path}`

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
