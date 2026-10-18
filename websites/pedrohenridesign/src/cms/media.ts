import type { Post } from "../../emdash-env"

// The stored value of an `image` field (post cover, block images, ...).
type MediaValue = Post["cover"]

type MediaRef = {
  // external URL, or EmDash's internal `/_emdash/api/media/file/<key>` URL
  url?: string
  storageKey?: string
  id?: string
}

type PageContext = { url: URL; locals: App.Locals }

const MEDIA_ROUTE = "/_emdash/api/media/file/"

const text = (value: unknown): string | undefined =>
  typeof value === "string" && value !== "" ? value : undefined

// Absolute URL the image service (and browsers) fetch the original from: the
// bucket's public URL when it has one, otherwise EmDash's own media route on
// this site. External URLs pass through. Empty string when nothing resolves.
const mediaUrl = (
  { url, storageKey, id }: MediaRef,
  { url: page, locals }: PageContext
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

const mediaSource = (media: MediaValue, page: PageContext): string =>
  mediaUrl(
    {
      url: text(media.src),
      storageKey: text(media.meta?.storageKey),
      id: media.id,
    },
    page
  )

// animated GIFs only survive the image service as `gif` output
const mediaFormat = (media: MediaValue): "gif" | "auto" =>
  media.mimeType === "image/gif" ? "gif" : "auto"

export { mediaFormat, mediaSource, mediaUrl, text }
export type { MediaRef, MediaValue }
