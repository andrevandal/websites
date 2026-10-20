const SMALL_WORDS: Record<string, true> = {
  da: true,
  das: true,
  do: true,
  dos: true,
  de: true,
  e: true,
}

const capitalizeToken = (token: string): string => {
  if (token === "") return token
  const match = /^(?<prefix>[a-z]+)'(?<first>.)(?<rest>.*)$/.exec(token)
  if (match?.groups) {
    const { prefix, first, rest } = match.groups
    const capitalizedPrefix =
      prefix === "d"
        ? prefix
        : `${prefix!.charAt(0).toUpperCase()}${prefix!.slice(1)}`
    return `${capitalizedPrefix}'${first!.toUpperCase()}${rest}`
  }
  return `${token.charAt(0).toUpperCase()}${token.slice(1)}`
}

export const toTitleCase = (name: string): string =>
  name
    .toLowerCase()
    .split(" ")
    .map((word, i) =>
      i > 0 && word in SMALL_WORDS
        ? word
        : word.split("-").map(capitalizeToken).join("-")
    )
    .join(" ")

export const normalizeCityName = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
