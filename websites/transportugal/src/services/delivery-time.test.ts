import { describe, it, expect } from "bun:test"
import { formatDeliveryTime } from "./delivery-time"

describe("formatDeliveryTime", () => {
  it("formats an 'horas' delivery time", () => {
    expect(formatDeliveryTime({ min: 24, max: 48, unit: "horas" })).toBe(
      "24 a 48 horas"
    )
  })

  it("formats a 'dias-uteis' delivery time", () => {
    expect(formatDeliveryTime({ min: 2, max: 3, unit: "dias-uteis" })).toBe(
      "2 a 3 dias úteis"
    )
  })
})
