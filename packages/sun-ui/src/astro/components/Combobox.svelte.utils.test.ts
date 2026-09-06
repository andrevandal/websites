import { describe, it, expect } from "bun:test"
import {
  groupItems,
  shouldShowClear,
  shouldClearSelection,
} from "./Combobox.svelte.utils"

type Fruit = { id: string; name: string; group?: string }

describe("groupItems", () => {
  it("returns null when groupKey is omitted", () => {
    const fruits: Fruit[] = [{ id: "mango", name: "Mango" }]
    expect(groupItems(fruits, undefined)).toBeNull()
  })

  it("buckets items by groupKey, preserving item order within each bucket", () => {
    const mango: Fruit = { id: "mango", name: "Mango", group: "Tropical" },
      apple: Fruit = { id: "apple", name: "Apple", group: "Temperate" },
      kiwi: Fruit = { id: "kiwi", name: "Kiwi", group: "Tropical" },
      groups = groupItems([mango, apple, kiwi], f => f.group)
    expect(groups?.get("Tropical")).toEqual([mango, kiwi])
    expect(groups?.get("Temperate")).toEqual([apple])
  })

  it("buckets items with an undefined groupKey result under the undefined key", () => {
    const fruits: Fruit[] = [{ id: "mango", name: "Mango" }],
      groups = groupItems(fruits, f => f.group)
    expect(groups?.get(undefined)).toEqual(fruits)
  })

  it("returns an empty map for an empty items array when groupKey is provided", () => {
    const groups = groupItems<Fruit>([], f => f.group)
    expect(groups?.size).toBe(0)
  })
})

describe("shouldShowClear", () => {
  it("is false when clearable is false, regardless of values", () => {
    expect(shouldShowClear(false, "abc", "abc")).toBe(false)
  })

  it("is false when both inputValue and value are empty", () => {
    expect(shouldShowClear(true, "", "")).toBe(false)
  })

  it("is true when inputValue is non-empty", () => {
    expect(shouldShowClear(true, "Ser", "")).toBe(true)
  })

  it("is true when value is non-empty", () => {
    expect(shouldShowClear(true, "", "serra|ES")).toBe(true)
  })
})

describe("shouldClearSelection", () => {
  it("is false when inputValue matches selectedLabel", () => {
    expect(shouldClearSelection("Porto", "Porto")).toBe(false)
  })

  it("is true when inputValue does not match selectedLabel", () => {
    expect(shouldClearSelection("Porto", "Porto Alegre")).toBe(true)
  })

  it("is false when both are empty", () => {
    expect(shouldClearSelection("", "")).toBe(false)
  })
})
