export const availableIcons = [
  "heroicons:arrow-down",
  "heroicons:chevron-down",
  "heroicons-outline:chevron-down",
  "heroicons:check",
  "streamline-logos:whatsapp-logo",
  "streamline-logos:whatsapp-logo-solid",
  "streamline-logos:youtube-logo-block",
] as const

export type AvailableIconsName = (typeof availableIcons)[number]
