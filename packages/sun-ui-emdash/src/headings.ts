import type { PortableTextBlock } from "emdash"

type Heading = { key: string; id: string; text: string; level: 2 | 3 }

type Span = { _type?: unknown; text?: unknown }

// Only span children carry rendered text; marks, images and other inline
// nodes are ignored.
const blockText = (block: PortableTextBlock): string =>
  (Array.isArray(block.children) ? block.children : [])
    .filter(
      (child): child is Span => typeof child === "object" && child !== null
    )
    .map(child =>
      child._type === "span" && typeof child.text === "string" ? child.text : ""
    )
    .join("")

// NFD-normalize, strip diacritics, lowercase, collapse non-alphanumerics to
// a single hyphen, trim leading/trailing hyphens.
const slugify = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

// H2/H3 blocks get a `tocId` read by SunPTHeading; repeated heading text gets
// -2, -3, ... in document order so ids stay unique within the body.
// shortcut: h2/h3 only, add a levels argument when a site renders h4+ anchors.
const annotateHeadingIds = (
  body: PortableTextBlock[]
): { blocks: PortableTextBlock[]; headings: Heading[] } => {
  const seen = new Map<string, number>()
  const headings: Heading[] = []
  const blocks = body.map(block => {
    if (block._type !== "block") return block
    if (block.style !== "h2" && block.style !== "h3") return block
    const text = blockText(block)
    const base = slugify(text)
    const occurrence = seen.get(base) ?? 0
    seen.set(base, occurrence + 1)
    const id = occurrence === 0 ? base : `${base}-${occurrence + 1}`
    headings.push({
      key: block._key,
      id,
      text,
      level: block.style === "h2" ? 2 : 3,
    })
    return { ...block, tocId: id }
  })
  return { blocks, headings }
}

export { annotateHeadingIds, blockText }
export type { Heading }
