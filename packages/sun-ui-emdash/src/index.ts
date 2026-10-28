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

// An internal media URL may be absolute (stored from another origin) and may
// carry the admin's `?_emdash_media=` cache-buster; only the path holds the key.
const internalKey = (url: string | undefined): string | undefined => {
  if (!url) return undefined
  const { pathname } = new URL(url, "http://internal.invalid")
  return pathname.startsWith(MEDIA_ROUTE)
    ? decodeURIComponent(pathname.slice(MEDIA_ROUTE.length))
    : undefined
}

// Public storage bypasses the Worker; local and isolated preview media do not.
const mediaUrl = (
  { url, storageKey, id }: MediaRef,
  { url: page, locals }: MediaContext
): string => {
  const key = storageKey ?? internalKey(url)
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
