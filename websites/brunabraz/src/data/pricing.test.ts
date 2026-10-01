import { describe, expect, test } from "bun:test"
import { calculateLessonPackage, resolveDuration } from "./pricing"

const modalityDetails: Record<"individual" | "dupla" | "conversacao", string> =
  {
    individual: "Só você e eu, no seu ritmo.",
    dupla: "Você escolhe a dupla, e eu adapto a aula pra vocês.",
    conversacao: "Aulas de conversação comigo, em grupos de até 6 alunos.",
  }

type TestCase = {
  modality: "individual" | "dupla" | "conversacao"
  frequency: 1 | 2
  months: 3 | 6 | 9 | 12
  monthly: number
}

const cases: TestCase[] = [
  ...([400, 380, 360, 340] as const).map((monthly, index) => ({
    modality: "individual" as const,
    frequency: 1 as const,
    months: ([3, 6, 9, 12] as const)[index]!,
    monthly,
  })),
  ...([760, 720, 680, 640] as const).map((monthly, index) => ({
    modality: "individual" as const,
    frequency: 2 as const,
    months: ([3, 6, 9, 12] as const)[index]!,
    monthly,
  })),
  ...([360, 340, 320, 300] as const).map((monthly, index) => ({
    modality: "dupla" as const,
    frequency: 1 as const,
    months: ([3, 6, 9, 12] as const)[index]!,
    monthly,
  })),
  ...([680, 640, 600, 560] as const).map((monthly, index) => ({
    modality: "dupla" as const,
    frequency: 2 as const,
    months: ([3, 6, 9, 12] as const)[index]!,
    monthly,
  })),
  // Conversação keeps 9/12-month price-matrix entries for off-widget
  // bookings (arranged manually) even though the widget itself only
  // offers 3/6 months for this modality — see allowedDurations/
  // resolveDuration above and PricingCalculator.astro.
  ...([300, 280, 260, 240] as const).map((monthly, index) => ({
    modality: "conversacao" as const,
    frequency: 1 as const,
    months: ([3, 6, 9, 12] as const)[index]!,
    monthly,
  })),
  ...([560, 520, 520, 520] as const).map((monthly, index) => ({
    modality: "conversacao" as const,
    frequency: 2 as const,
    months: ([3, 6, 9, 12] as const)[index]!,
    monthly,
  })),
]

describe("calculateLessonPackage", () => {
  test.each(cases)(
    "calculates the $modality $frequency x / $months months boundary row",
    ({ modality, frequency, months, monthly }) => {
      const lessons = frequency * months * 4,
        total = monthly * months,
        result = calculateLessonPackage(modality, frequency, months)

      expect(result).toEqual({
        quantidadeAulas: lessons,
        tempoMeses: months,
        valorTotal: total,
        valorPorAula: Number((total / lessons).toFixed(2)),
        valorParcela: monthly,
        quantidadeParcelas: months,
        details: modalityDetails[modality],
      })
    }
  )

  // Off-widget booking coverage (see comment above `cases`), not a
  // duration offered through the pricing widget.
  test("uses R$520 monthly for Conversação 2x/12", () => {
    expect(calculateLessonPackage("conversacao", 2, 12)).toEqual({
      quantidadeAulas: 96,
      tempoMeses: 12,
      valorTotal: 6240,
      valorPorAula: 65,
      valorParcela: 520,
      quantidadeParcelas: 12,
      details: modalityDetails.conversacao,
    })
  })
})

describe("resolveDuration", () => {
  test.each([
    ["conversacao", 3, 3],
    ["conversacao", 6, 6],
    ["conversacao", 9, 3],
    ["conversacao", 12, 3],
    ["individual", 3, 3],
    ["individual", 6, 6],
    ["individual", 9, 9],
    ["individual", 12, 12],
    ["dupla", 3, 3],
    ["dupla", 6, 6],
    ["dupla", 9, 9],
    ["dupla", 12, 12],
  ] as const)(
    "resolveDuration(%s, %d) resolves to %d",
    (modality, current, expected) => {
      expect(resolveDuration(modality, current)).toBe(expected)
    }
  )
})
