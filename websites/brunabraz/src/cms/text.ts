type Segment = { text: string; emphasis: boolean }

// Editors mark emphasis as *text* in plain string fields; only closed pairs count.
const splitEmphasis = (text: string): Segment[] => {
  const segments: Segment[] = []
  const pattern = /\*(?<inner>[^*]+)\*/g
  let last = 0
  for (const match of text.matchAll(pattern)) {
    if (match.index > last)
      segments.push({ text: text.slice(last, match.index), emphasis: false })
    segments.push({ text: match.groups?.inner ?? "", emphasis: true })
    last = match.index + match[0].length
  }
  if (last < text.length)
    segments.push({ text: text.slice(last), emphasis: false })
  return segments
}

const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map(part => part.trim())
    .filter(Boolean)

export { paragraphs, splitEmphasis, type Segment }
