const waLink = (number: string, message?: string): string =>
  `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`

export { waLink }
