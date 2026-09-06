import { describe, it, expect } from "bun:test"
import { createSearchIndex } from "./search-index"

type Fruit = { name: string; color: string }

const FRUITS: Fruit[] = [
  { name: "Banana", color: "yellow" },
  { name: "Maçã", color: "red" },
  { name: "Abacaxi", color: "yellow" },
]

describe("createSearchIndex", () => {
  it("all() returns every item, in original order", () => {
    const index = createSearchIndex(FRUITS, f => f.name)
    expect(index.all()).toEqual(FRUITS)
  })

  it("search() is typo-tolerant", () => {
    const index = createSearchIndex(FRUITS, f => f.name)
    const results = index.search("Banna")
    expect(results.some(f => f.name === "Banana")).toBe(true)
  })

  it("search() is accent-insensitive", () => {
    const index = createSearchIndex(FRUITS, f => f.name)
    const results = index.search("maca")
    expect(results.some(f => f.name === "Maçã")).toBe(true)
  })

  it("search() respects the limit option", () => {
    const index = createSearchIndex(FRUITS, () => "shared-text")
    const results = index.search("shared-text", { limit: 1 })
    expect(results.length).toBe(1)
  })

  it("matches on the text supplied by toSearchText, not any other field", () => {
    const index = createSearchIndex(FRUITS, f => f.color)
    const results = index.search("yellow")
    expect(results.map(f => f.name).sort()).toEqual(["Abacaxi", "Banana"])
  })
})
