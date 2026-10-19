import { describe, expect, it } from "bun:test"
import type { TaxonomyTerm } from "emdash"
import { categoryScope, categorySeo, findCategory } from "./category"

const term = (
  slug: string,
  label: string,
  children: TaxonomyTerm[] = [],
  extra: Partial<TaxonomyTerm> = {}
): TaxonomyTerm => ({
  id: `id-${slug}`,
  name: "category",
  slug,
  label,
  children,
  locale: "pt-BR",
  translationGroup: null,
  ...extra,
})

const history = term("history", "History", [], {
  parentId: "id-the-english-language",
})
const english = term("the-english-language", "The English Language", [
  history,
  term("grammar", "Grammar", [], { parentId: "id-the-english-language" }),
  term("vocabulary", "Vocabulary", [], { parentId: "id-the-english-language" }),
  term("pronunciation", "Pronunciation", [], {
    parentId: "id-the-english-language",
  }),
])
const culture = term("culture", "Culture", [], {
  description: "Culturas e línguas.",
})
const tree = [culture, english]

describe("categoryScope", () => {
  it("gives a parent Category's own slug plus its Subcategories", () => {
    expect(categoryScope(english)).toEqual([
      "the-english-language",
      "history",
      "grammar",
      "vocabulary",
      "pronunciation",
    ])
  })

  it("gives only the Subcategory itself", () => {
    expect(categoryScope(history)).toEqual(["history"])
  })

  it("gives only itself for a Category without Subcategories", () => {
    expect(categoryScope(culture)).toEqual(["culture"])
  })
})

describe("categorySeo", () => {
  it("titles with the label and site name and keeps the description", () => {
    expect(categorySeo(culture, "Bruna Braz")).toEqual({
      title: "Culture | Bruna Braz",
      description: "Culturas e línguas.",
    })
  })

  it("gives an empty description, not undefined, when the term has none", () => {
    expect(categorySeo(history, "Bruna Braz")).toEqual({
      title: "History | Bruna Braz",
      description: "",
    })
  })
})

describe("findCategory", () => {
  it("finds a top-level Category with no parent", () => {
    expect(findCategory(tree, "culture")).toEqual({
      term: culture,
      parent: undefined,
    })
  })

  it("finds a Subcategory together with its parent", () => {
    expect(findCategory(tree, "history")).toEqual({
      term: history,
      parent: english,
    })
  })

  it("returns undefined for an unknown slug", () => {
    expect(findCategory(tree, "nao-existe")).toBeUndefined()
  })
})
