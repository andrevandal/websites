import { waLink } from "@vandal-websites/sun-ui"
import { DRINKS, KG_PER_PERSON, MAX_QUANTITY } from "#/data/calculator"
import { orderMessage, WA_NUMBER } from "#/data/contact"

type CalculatorMode = "people" | "drinks"

const round2 = (value: number): number => Math.round(value * 100) / 100

// Whole numbers in 0..MAX_QUANTITY; anything else (NaN, negatives) becomes 0.
const clampQuantity = (value: number): number =>
  Number.isNaN(value)
    ? 0
    : Math.min(MAX_QUANTITY, Math.max(0, Math.trunc(value)))

const iceForPeople = (people: number): number =>
  round2(clampQuantity(people) * KG_PER_PERSON)

// `quantities[i]` pairs with `DRINKS[i]`; missing entries count as 0.
const iceForDrinks = (quantities: readonly number[]): number =>
  round2(
    DRINKS.reduce(
      (sum, drink, i) =>
        sum + clampQuantity(quantities[i] ?? 0) * drink.kgPerUnit,
      0
    )
  )

const formatKg = (kg: number): string => String(kg)

const orderLink = (kg: number): string =>
  waLink(WA_NUMBER, orderMessage(formatKg(kg)))

export {
  clampQuantity,
  formatKg,
  iceForDrinks,
  iceForPeople,
  orderLink,
  type CalculatorMode,
}
