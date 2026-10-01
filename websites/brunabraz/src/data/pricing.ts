const monthlyPrices: Record<
  Modality,
  Record<Frequency, Record<Months, number>>
> = {
  individual: {
    1: { 3: 400, 6: 380, 9: 360, 12: 340 },
    2: { 3: 760, 6: 720, 9: 680, 12: 640 },
  },
  dupla: {
    1: { 3: 360, 6: 340, 9: 320, 12: 300 },
    2: { 3: 680, 6: 640, 9: 600, 12: 560 },
  },
  conversacao: {
    1: { 3: 300, 6: 280, 9: 260, 12: 240 },
    2: { 3: 560, 6: 520, 9: 520, 12: 520 },
  },
}

const modalityDetails: Record<Modality, string> = {
  individual: "Só você e eu, no seu ritmo.",
  dupla: "Você escolhe a dupla, e eu adapto a aula pra vocês.",
  conversacao: "Aulas de conversação comigo, em grupos de até 6 alunos.",
}

export const allowedDurations: Record<Modality, Months[]> = {
  individual: [3, 6, 9, 12],
  dupla: [3, 6, 9, 12],
  conversacao: [3, 6],
}

export const resolveDuration = (modality: Modality, current: Months): Months =>
  allowedDurations[modality].includes(current) ? current : 3

export const calculateLessonPackage = (
  modality: Modality,
  frequency: Frequency,
  months: Months
): LessonPackage => {
  const valorParcela = monthlyPrices[modality][frequency][months]
  const quantidadeAulas = frequency * months * 4
  const valorTotal = valorParcela * months
  const details = modalityDetails[modality]
  return {
    quantidadeAulas,
    tempoMeses: months,
    valorTotal,
    valorPorAula: Number((valorTotal / quantidadeAulas).toFixed(2)),
    valorParcela,
    quantidadeParcelas: months,
    details,
  }
}

export const modalitySummaryLabels: Record<Modality, string> = {
  individual: "individuais",
  dupla: "em dupla",
  conversacao: "de conversação",
}

export const buildPricingWhatsAppMessage = (
  modality: Modality,
  frequency: Frequency,
  months: Months,
  pkg: LessonPackage,
  formattedValorParcela: string
) =>
  `Olá, Bruna! Quero contratar o pacote de aulas ${modalitySummaryLabels[modality]} (${pkg.quantidadeAulas} aulas, ${frequency}x por semana, ${months} meses) — ${pkg.quantidadeParcelas}x de ${formattedValorParcela}.`

export type Modality = "individual" | "dupla" | "conversacao"
export type Frequency = 1 | 2
export type Months = 3 | 6 | 9 | 12

export type LessonPackage = {
  quantidadeAulas: number
  tempoMeses: Months
  valorTotal: number
  valorPorAula: number
  valorParcela: number
  quantidadeParcelas: Months
  details: string
}
