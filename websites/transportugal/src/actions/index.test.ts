import { describe, it, expect, mock } from "bun:test"
import { z } from "zod"

mock.module("astro:actions", () => ({
  defineAction: <T>(config: T): T => config,
  ActionError: class ActionError extends Error {
    code: string
    constructor(config: { code: string; message: string }) {
      super(config.message)
      this.code = config.code
    }
  },
}))

mock.module("astro/zod", () => ({
  z,
}))

// NOW import index.ts after mocks are registered
import { server } from "./index"

type MockedAction<I, O> = {
  input: {
    safeParse: (value: unknown) => { success: boolean }
  }
  handler: (input: I) => O
}

type MockedCalculateAction = MockedAction<
  {
    originCidade: string
    originUf: string
    destinationAreaId: string
    destinationCidade?: string
  },
  {
    deliveryTimeLabel: string
    services: { id: string; label: string; available: boolean }[]
  }
>

type MockedSearchAction = MockedAction<
  { query: string },
  Record<string, unknown>[]
>

const calculate = server.calculate as unknown as MockedCalculateAction
const searchOrigin = server.searchOrigin as unknown as MockedSearchAction
const searchDestination =
  server.searchDestination as unknown as MockedSearchAction

describe("server.calculate handler", () => {
  it("throws NOT_FOUND for an unknown destinationAreaId", () => {
    expect(() =>
      calculate.handler({
        originCidade: "Serra",
        originUf: "ES",
        destinationAreaId: "does-not-exist",
      })
    ).toThrow()
  })

  it("wires deliveryTimeLabel and per-service availability for a covered origin", () => {
    const result = calculate.handler({
      originCidade: "Serra",
      originUf: "ES",
      destinationAreaId: "es-vitoria-e-grande-vitoria",
    })
    expect(result.deliveryTimeLabel).toBe("2 a 3 dias úteis")
    expect(result.services.every(s => s.available)).toBe(true)
    expect(result.services).toHaveLength(4)
  })

  it("does not mutate the shared ROUTE_SERVICES objects across calls", () => {
    // Regression test: the handler used to build each service via
    // `Object.assign(service, { available })`, mutating the module-level
    // ROUTE_SERVICES objects in place. A later call with different
    // availability would then silently flip an earlier call's
    // already-returned result, since both referenced the same objects.
    const covered = calculate.handler({
      originCidade: "Serra",
      originUf: "ES",
      destinationAreaId: "es-vitoria-e-grande-vitoria",
    })
    expect(covered.services.every(s => s.available)).toBe(true)

    const uncovered = calculate.handler({
      originCidade: "Banana",
      originUf: "AM",
      destinationAreaId: "sp-sao-paulo-e-demais-cidades",
    })
    expect(uncovered.services.every(s => !s.available)).toBe(true)

    // the earlier result must still reflect availability at the time it
    // was returned, not be flipped by the later call
    expect(covered.services.every(s => s.available)).toBe(true)
  })
})

describe("server.calculate schema", () => {
  it("requires a non-empty originCidade", () => {
    const result = calculate.input.safeParse({
      originCidade: "",
      originUf: "SP",
      destinationAreaId: "sp-sao-paulo-e-demais-cidades",
    })
    expect(result.success).toBe(false)
  })

  it("requires a 2-letter originUf", () => {
    const result = calculate.input.safeParse({
      originCidade: "Serra",
      originUf: "ESP",
      destinationAreaId: "sp-sao-paulo-e-demais-cidades",
    })
    expect(result.success).toBe(false)
  })

  it("accepts an optional destinationCidade", () => {
    const result = calculate.input.safeParse({
      originCidade: "Serra",
      originUf: "ES",
      destinationAreaId: "sp-sao-paulo-e-demais-cidades",
    })
    expect(result.success).toBe(true)
  })
})

describe("server.search handler", () => {
  // `calculate` and `search` both pull from the service layer (`@/services/coverage`,
  // `@/services/delivery-time`, `@/services/location-search`, `@/services/brazil-cities`)
  // in this merged file, so mocking any one of those to spy on a call would
  // risk destabilizing the other action sharing the same import graph.
  // Asserting on each branch's real result shape instead confirms dispatch
  // without needing to intercept a module — and without duplicating the
  // ranking-algorithm coverage that already lives in
  // `services/brazil-cities.test.ts` and `services/location-search.test.ts`.
  it("dispatches an origin query to searchBrazilCities (BrazilCity shape)", () => {
    const results = searchOrigin.handler({ query: "paulo" })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every(r => "cidade" in r && "uf" in r)).toBe(true)
  })

  it("dispatches a destination query to searchAllowedLocations (LocationMatch shape)", () => {
    const results = searchDestination.handler({ query: "" })
    expect(results.length).toBeGreaterThan(0)
    expect(results.every(r => "type" in r && "areaId" in r)).toBe(true)
  })
})

describe("server.search schema", () => {
  it("accepts a 1-character origin query", () => {
    const result = searchOrigin.input.safeParse({ query: "s" })
    expect(result.success).toBe(true)
  })

  // searchOrigin's schema deliberately has no `.min(1)` - it stays
  // permissive (max(80).default("")) because the real "never dispatch on
  // empty" contract is enforced client-side, not at this schema. See
  // `shouldSearchOrigin` in `utils/index.ts`, gated before every dispatch
  // in `RouteCalculator.svelte`'s `handleOriginInput`, and covered by
  // `components/__tests__/RouteCalculator.utils.test.ts`.

  it("defaults an omitted destination query to an empty string", () => {
    const result = searchDestination.input.safeParse({ type: "destination" })
    expect(result.success).toBe(true)
  })
})
