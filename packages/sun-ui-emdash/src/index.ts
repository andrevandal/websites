import { annotateHeadingIds, blockText } from "./headings"
import type { Heading } from "./headings"
import { resolveImageLayout } from "./image-layout"
import type { ImageLayout } from "./image-layout"
import type { MediaValue } from "emdash"

type MediaRef = { url?: string; storageKey?: string; id?: string }

type MediaContext = {
  url: URL
  locals: {
    emdash?: { getPublicMediaUrl?: (key: string) => string | undefined }
  }
}

const MEDIA_ROUTE = "/_emdash/api/media/file/"

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value !== "" ? value : undefined

// Public storage bypasses the Worker; local and isolated preview media do not.
const mediaUrl = (
  { url, storageKey, id }: MediaRef,
  { url: page, locals }: MediaContext
): string => {
  const key =
    storageKey ??
    (url?.startsWith(MEDIA_ROUTE)
      ? decodeURIComponent(url.slice(MEDIA_ROUTE.length))
      : undefined)
  const raw = key
    ? (locals.emdash?.getPublicMediaUrl?.(key) ??
      `${MEDIA_ROUTE}${encodeURIComponent(key)}`)
    : (url ?? (id ? `${MEDIA_ROUTE}${encodeURIComponent(id)}` : ""))

  return raw ? new URL(raw, page.origin).toString() : ""
}

const mediaSource = (
  media: MediaValue | undefined | null,
  page: MediaContext
): string =>
  media
    ? mediaUrl(
        {
          url: text(media.src),
          storageKey: text(media.meta?.storageKey),
          id: media.id,
        },
        page
      )
    : ""

// Animated GIFs only survive the image service as GIF output.
const mediaFormat = (media: Pick<MediaValue, "mimeType">): "gif" | "auto" =>
  media.mimeType === "image/gif" ? "gif" : "auto"

export {
  annotateHeadingIds,
  blockText,
  resolveImageLayout,
  type Heading,
  type ImageLayout,
  mediaFormat,
  mediaSource,
  mediaUrl,
  text,
  type MediaContext,
  type MediaRef,
  type MediaValue,
}
