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
  const match = /^([a-z]+)'(.)(.*)$/.exec(token)
  if (match) {
    const [, prefix, first, rest] = match
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
