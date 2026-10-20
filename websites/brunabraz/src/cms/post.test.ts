import { describe, expect, it } from "bun:test"
import { postExcerpt, readingMinutes } from "./post"
import type { PortableTextBlock } from "emdash"

const paragraph = (
  key: string,
  text: string,
  style = "normal"
): PortableTextBlock => ({
  _type: "block",
  _key: key,
  style,
  children: [{ _type: "span", _key: `${key}-s`, text, marks: [] }],
})

const heading = (
  key: string,
  text: string,
  level: "h2" | "h3"
): PortableTextBlock => ({
  _type: "block",
  _key: key,
  style: level,
  children: [{ _type: "span", _key: `${key}-s`, text, marks: [] }],
})

describe("readingMinutes", () => {
  it("gives 3 for a 401-word body", () => {
    const words = Array.from({ length: 401 }, (_, i) => `palavra${i}`).join(" ")
    expect(readingMinutes([paragraph("p1", words)])).toBe(3)
  })

  it("gives 1 for an empty body", () => {
    expect(readingMinutes([])).toBe(1)
  })

  it("only counts text from span children, ignoring non-span nodes", () => {
    const block: PortableTextBlock = {
      _type: "block",
      _key: "p1",
      style: "normal",
      children: [
        { _type: "span", _key: "s1", text: "um dois tres", marks: [] },
        { _type: "image", _key: "img1" },
      ],
    }
    expect(readingMinutes([block])).toBe(1)
  })
})

describe("postExcerpt", () => {
  it("returns a filled excerpt as is", () => {
    expect(postExcerpt({ excerpt: "Resumo definido pelo editor" })).toBe(
      "Resumo definido pelo editor"
    )
  })

  it("falls back to the first paragraph's text when excerpt is empty", () => {
    const body = [
      heading("h1", "Titulo", "h2"),
      paragraph("p1", "Primeiro paragrafo."),
    ]
    expect(postExcerpt({ excerpt: "", content: body })).toBe(
      "Primeiro paragrafo."
    )
  })

  it("falls back to the first paragraph when excerpt is only whitespace", () => {
    const body = [paragraph("p1", "Primeiro paragrafo.")]
    expect(postExcerpt({ excerpt: "   ", content: body })).toBe(
      "Primeiro paragrafo."
    )
  })

  it("returns empty string with no excerpt and no paragraph", () => {
    expect(postExcerpt({ content: [heading("h1", "So titulo", "h2")] })).toBe(
      ""
    )
  })

  it("falls back to a block with no style at all, not only an explicit 'normal'", () => {
    const body: PortableTextBlock[] = [
      {
        _type: "block",
        _key: "p1",
        children: [
          { _type: "span", _key: "p1-s", text: "Sem estilo.", marks: [] },
        ],
      },
    ]
    expect(postExcerpt({ content: body })).toBe("Sem estilo.")
  })
})
