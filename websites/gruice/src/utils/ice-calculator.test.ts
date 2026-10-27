import { describe, expect, it } from "bun:test"
import { DRINKS } from "#/data/calculator"
import {
  clampQuantity,
  formatKg,
  iceForDrinks,
  iceForPeople,
  orderLink,
} from "./ice-calculator"

describe("clampQuantity", () => {
  it("maps invalid and negative input to 0", () => {
    expect(clampQuantity(Number.NaN)).toBe(0)
    expect(clampQuantity(-3)).toBe(0)
  })

  it("truncates decimals and caps at 999", () => {
    expect(clampQuantity(2.7)).toBe(2)
    expect(clampQuantity(1500)).toBe(999)
  })
})

describe("iceForPeople", () => {
  it("uses 0.5 kg per person", () => {
    expect(iceForPeople(3)).toBe(1.5)
  })

  it("caps the head count", () => {
    expect(iceForPeople(1000)).toBe(499.5)
  })
})

describe("iceForDrinks", () => {
  const index = (name: string) => DRINKS.findIndex(d => d.name === name)

  it("rounds float sums to two decimals", () => {
    const quantities = DRINKS.map(() => 0)
    quantities[index("Cerveja Lata")] = 3
    expect(iceForDrinks(quantities)).toBe(0.9)
  })

  it("sums every drink", () => {
    expect(iceForDrinks(DRINKS.map(() => 1))).toBe(3.75)
  })

  it("treats missing entries as 0", () => {
    expect(iceForDrinks([2])).toBe(1)
  })
})

describe("order link", () => {
  it("prints the kg value as the number shows", () => {
    expect(formatKg(1.5)).toBe("1.5")
  })

  it("opens WhatsApp with the order message", () => {
    const link = orderLink(1.5)
    expect(link.startsWith("https://wa.me/5511989152923?text=")).toBe(true)
    expect(decodeURIComponent(link.split("?text=")[1] ?? "")).toBe(
      "Olá, equipe Gru Ice! Vim pelo site e gostaria de solicitar 1.5kg de gelo!"
    )
  })
})
