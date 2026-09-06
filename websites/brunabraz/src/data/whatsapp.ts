import { defaultConfig } from "@/data/site"

export const buildWhatsAppLink = (message: string) =>
  `${defaultConfig.links.whatsapp}?text=${encodeURIComponent(message)}`
