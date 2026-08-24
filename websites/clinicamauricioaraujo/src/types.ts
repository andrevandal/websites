export const availableIcons = [
  "heroicons:arrow-down",
  "heroicons:chevron-down",
  "heroicons:check",
  "heroicons:star-solid",
  "streamline-logos:whatsapp-logo",
  "streamline-logos:whatsapp-logo-solid",
  "streamline-logos:youtube-logo-block",
  "logos:google-icon",
] as const

export type AvailableIconsName = (typeof availableIcons)[number]
