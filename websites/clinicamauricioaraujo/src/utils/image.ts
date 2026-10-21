import { getSecret, S3_PUBLIC_URL } from "astro:env/server"
import { assetUrl, runtimeEnv } from "@vandal-websites/sun-ui/astro/runtime-env"

export const getImageSource = (imagePath: string) =>
  assetUrl(getSecret, imagePath, S3_PUBLIC_URL)

export const getImageUrl = (imagePath: string, transform = "_") => {
  const source = getImageSource(imagePath)
  const base = runtimeEnv(getSecret, "IMAGES_BASE_URL")
  return base
    ? `${base.replace(/\/+$/, "")}/${transform}/${encodeURIComponent(source)}`
    : source
}
