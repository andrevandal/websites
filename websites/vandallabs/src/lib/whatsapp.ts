const WA_NUMBER = "5541984341352"

const waLink = (message: string): string =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`

export { WA_NUMBER, waLink }
