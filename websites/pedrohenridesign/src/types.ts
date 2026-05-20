export const availableIcons = [
  "apresentacao",
  "codificacao",
  "concepcao",
  "descoberta",
  "entrega",
  "instagram",
  "linkedin",
  "mapeamento",
  "otimizacao-seo",
  "prototipo",
  "mdi:linkedin",
  "mdi:instagram",
  "logos:linkedin-icon",
  "logos:instagram-icon",
  "heroicons:arrow-down",
  "heroicons-outline:chat-alt-2",
] as const

export type AvailableIcons = (typeof availableIcons)[number]

export type Feature = {
  iconName: AvailableIcons
  title: string
  description: string
}
export type Features = Feature[]
