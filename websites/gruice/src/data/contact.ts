const WA_NUMBER = "5511989152923"
const WA_DEFAULT_MESSAGE =
  "Olá, equipe Gru Ice! Vim pelo site e estou interessado(a) em conhecer mais sobre seus produtos. Poderiam me ajudar?"
const PHONE_LABEL = "(11) 98915-2923"
const EMAIL = "atendimento@gruice.com.br"
const ADDRESS = "Rua São Miguel do Itaipu, 32"
const INSTAGRAM_URL = "https://instagram.com/gelo_gruice"

const orderMessage = (kg: string): string =>
  `Olá, equipe Gru Ice! Vim pelo site e gostaria de solicitar ${kg}kg de gelo!`

export {
  ADDRESS,
  EMAIL,
  INSTAGRAM_URL,
  orderMessage,
  PHONE_LABEL,
  WA_DEFAULT_MESSAGE,
  WA_NUMBER,
}
