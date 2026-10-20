import type { PortableTextBlock } from "emdash"
import { blockText } from "@vandal-websites/sun-ui-emdash"

const blockStyle = (block: PortableTextBlock): string | undefined =>
  typeof block.style === "string" ? block.style : undefined

const readingMinutes = (body: PortableTextBlock[]): number => {
  const text = body.map(blockText).join(" ")
  const words = text.split(/\s+/).filter(Boolean)
  return Math.max(1, Math.ceil(words.length / 200))
}

type ExcerptSource = {
  excerpt?: string | null
  content?: PortableTextBlock[] | null
}

const postExcerpt = (post: ExcerptSource): string => {
  const excerpt = post.excerpt?.trim()
  if (excerpt) return excerpt

  for (const block of post.content ?? []) {
    if (block._type !== "block") continue
    const style = blockStyle(block)
    if (style !== undefined && style !== "normal") continue
    const text = blockText(block)
    if (text) return text
  }
  return ""
}

export { readingMinutes, postExcerpt }
