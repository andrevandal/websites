// Tailwind scans for literal class names, so every variant is spelled out.
const CORNERS = {
  md: {
    top: "rounded-t-md overflow-hidden",
    bottom: "rounded-b-md overflow-hidden",
    both: "rounded-md overflow-hidden",
  },
  lg: {
    top: "rounded-t-lg overflow-hidden",
    bottom: "rounded-b-lg overflow-hidden",
    both: "rounded-lg overflow-hidden",
  },
}

const cornerClass = (
  corners: string | null | undefined,
  radius: keyof typeof CORNERS
): string =>
  corners === "top" || corners === "bottom" || corners === "both"
    ? CORNERS[radius][corners]
    : ""

// Light text on a dark background; the prose modifiers reach descendants.
const DARK_PROSE =
  "prose-headings:text-white prose-p:text-white prose-a:text-white prose-strong:text-white prose-em:text-white prose-li:text-white"

const toneClass = (tone: string | null | undefined): string =>
  tone === "dark" ? DARK_PROSE : ""

const backgroundStyle = (
  background: string | null | undefined
): string | undefined =>
  background ? `background-color: ${background}` : undefined

export { backgroundStyle, cornerClass, toneClass }
