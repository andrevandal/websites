import { describe, expect, it } from "bun:test"
import {
  differentiators,
  insurances,
  qualityIndicators,
  segments,
  services,
} from "./home"

describe("home source data", () => {
  it("keeps service-card order", () => {
    expect(services).toHaveLength(6)
    expect(services[0]?.icon).toBe("carga-fracionada")
    expect(services.at(-1)?.mobileOrder).toBe("order-4")
  })

  it("keeps the remaining homepage collections", () => {
    expect(insurances).toHaveLength(2)
    expect(differentiators).toHaveLength(3)
    expect(qualityIndicators).toHaveLength(6)
    expect(segments).toHaveLength(9)
  })
})
