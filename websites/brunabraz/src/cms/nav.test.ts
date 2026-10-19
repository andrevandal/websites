import { describe, expect, it } from "bun:test"
import { splitNavCategories, toCategoryLink } from "./nav"
import type { TaxonomyTerm } from "emdash"

const createTerm = (
  id: string,
  name: string,
  slug: string,
  children: TaxonomyTerm[] = []
): TaxonomyTerm => ({
  id,
  name,
  slug,
  label: name,
  children,
  locale: "pt-BR",
  translationGroup: null,
})

describe("splitNavCategories", () => {
  it("splits 6 top-level terms into nav (4) and more (2) in order", () => {
    const terms = [
      createTerm("1", "Linguistics", "linguistics"),
      createTerm("2", "Narratives", "narratives"),
      createTerm("3", "Culture", "culture"),
      createTerm("4", "The English Language", "the-english-language"),
      createTerm("5", "Teaching", "teaching"),
      createTerm("6", "Travel", "travel"),
    ]

    const result = splitNavCategories(terms)
    expect(result.nav).toHaveLength(4)
    expect(result.more).toHaveLength(2)
    expect(result.nav[0]!.slug).toBe("linguistics")
    expect(result.nav[1]!.slug).toBe("narratives")
    expect(result.nav[2]!.slug).toBe("culture")
    expect(result.nav[3]!.slug).toBe("the-english-language")
    expect(result.more[0]!.slug).toBe("teaching")
    expect(result.more[1]!.slug).toBe("travel")
  })

  it("puts all 4 top-level terms in nav with empty more", () => {
    const terms = [
      createTerm("1", "Linguistics", "linguistics"),
      createTerm("2", "Narratives", "narratives"),
      createTerm("3", "Culture", "culture"),
      createTerm("4", "The English Language", "the-english-language"),
    ]

    const result = splitNavCategories(terms)
    expect(result.nav).toHaveLength(4)
    expect(result.more).toHaveLength(0)
    expect(result.nav[0]!.slug).toBe("linguistics")
    expect(result.nav[3]!.slug).toBe("the-english-language")
  })

  it("returns both empty for zero terms", () => {
    const terms: TaxonomyTerm[] = []

    const result = splitNavCategories(terms)
    expect(result.nav).toHaveLength(0)
    expect(result.more).toHaveLength(0)
  })
})

describe("toCategoryLink", () => {
  it("maps a term and its children to category links", () => {
    const term = createTerm("1", "Linguistics", "linguistics", [
      createTerm("2", "Phonetics", "phonetics"),
    ])

    expect(toCategoryLink(term)).toEqual({
      id: "1",
      label: "Linguistics",
      href: "/blog/categoria/linguistics",
      children: [
        {
          id: "2",
          label: "Phonetics",
          href: "/blog/categoria/phonetics",
          children: [],
        },
      ],
    })
  })
})
