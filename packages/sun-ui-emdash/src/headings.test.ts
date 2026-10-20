import { describe, expect, it } from "bun:test"
import type { PortableTextBlock } from "emdash"
import { annotateHeadingIds, blockText } from "./headings"

const block = (
  key: string,
  text: string,
  style: string
): PortableTextBlock => ({
  _type: "block",
  _key: key,
  style,
  children: [{ _type: "span", _key: `${key}-s`, text, marks: [] }],
})

describe("annotateHeadingIds", () => {
  it("collects H2/H3 blocks in document order and tags them with tocId", () => {
    const body = [
      block("p1", "Intro", "normal"),
      block("h1", "Primeira secao", "h2"),
      block("h2", "Subsecao", "h3"),
      block("h4", "Fora", "h4"),
    ]
    const { blocks, headings } = annotateHeadingIds(body)
    expect(headings).toEqual([
      { key: "h1", id: "primeira-secao", text: "Primeira secao", level: 2 },
      { key: "h2", id: "subsecao", text: "Subsecao", level: 3 },
    ])
    expect(blocks.map(b => (b as { tocId?: string }).tocId)).toEqual([
      undefined,
      "primeira-secao",
      "subsecao",
      undefined,
    ])
    expect(blocks[0]).toBe(body[0])
  })

  it("dedupes repeated heading text with -2, -3 across levels", () => {
    const { headings } = annotateHeadingIds([
      block("a", "Introducao", "h2"),
      block("b", "Introducao", "h2"),
      block("c", "Introducao", "h3"),
    ])
    expect(headings.map(h => h.id)).toEqual([
      "introducao",
      "introducao-2",
      "introducao-3",
    ])
  })

  it("strips accents and punctuation when slugifying", () => {
    const { headings } = annotateHeadingIds([
      block("a", "O porquê mudou, e isso é um presente", "h2"),
    ])
    expect(headings[0]?.id).toBe("o-porque-mudou-e-isso-e-um-presente")
  })

  it("skips non-block nodes even with a heading style", () => {
    const image = {
      _type: "image",
      _key: "i",
      style: "h2",
    } as PortableTextBlock
    expect(annotateHeadingIds([image]).headings).toEqual([])
  })
})

describe("blockText", () => {
  it("joins span text and ignores other inline nodes", () => {
    expect(
      blockText({
        _type: "block",
        _key: "p",
        children: [
          { _type: "span", _key: "s1", text: "um ", marks: [] },
          { _type: "image", _key: "i" },
          { _type: "span", _key: "s2", text: "dois", marks: [] },
        ],
      })
    ).toBe("um dois")
  })
})
