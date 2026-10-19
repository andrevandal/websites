const whatsappUrl = "https://wa.me/5543991100512"

export const buildWhatsAppLink = (message: string) =>
  `${whatsappUrl}?text=${encodeURIComponent(message)}`
