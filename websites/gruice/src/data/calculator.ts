const KG_PER_PERSON = 0.5
const MAX_QUANTITY = 999

const DRINKS = [
  { name: "Cerveja (600ml)", kgPerUnit: 0.5 },
  { name: "Cerveja Lata", kgPerUnit: 0.3 },
  { name: "Cerveja Longneck", kgPerUnit: 0.35 },
  { name: "Refrigerante Lata", kgPerUnit: 0.2 },
  { name: "Refrigerante Pet (1 litro)", kgPerUnit: 0.7 },
  { name: "Refrigerante Pet (2 litros)", kgPerUnit: 1.2 },
  { name: "Refrigerante Pet (600 ml)", kgPerUnit: 0.5 },
] as const

export { DRINKS, KG_PER_PERSON, MAX_QUANTITY }
