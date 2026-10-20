import { describe, expect, it } from "bun:test"
import { paragraphs, splitEmphasis } from "./text"

describe("splitEmphasis", () => {
  it("marks text wrapped in asterisks as emphasis, keeping surrounding spaces", () => {
    expect(splitEmphasis("Faça do *inglês* uma ferramenta")).toEqual([
      { text: "Faça do ", emphasis: false },
      { text: "inglês", emphasis: true },
      { text: " uma ferramenta", emphasis: false },
    ])
  })

  it("keeps a lone asterisk as plain text", () => {
    expect(splitEmphasis("Nota * sem par")).toEqual([
      { text: "Nota * sem par", emphasis: false },
    ])
  })

  it("keeps an unclosed pair after a closed one as plain text", () => {
    expect(splitEmphasis("*a* e *b")).toEqual([
      { text: "a", emphasis: true },
      { text: " e *b", emphasis: false },
    ])
  })

  it("returns nothing for empty text", () => {
    expect(splitEmphasis("")).toEqual([])
  })
})

describe("paragraphs", () => {
  it("splits on blank lines and drops empty paragraphs", () => {
    expect(paragraphs("Um.\n\n  \nDois.\n\n")).toEqual(["Um.", "Dois."])
  })

  it("keeps single line breaks inside a paragraph", () => {
    expect(paragraphs("linha 1\nlinha 2")).toEqual(["linha 1\nlinha 2"])
  })
})
