type ParseError = {
  status: 400
  message: string
}

const parseRequestPath = (path: string) => {
  const slashIndex = path.indexOf("/")

  if (slashIndex === -1 || slashIndex === 0) {
    const err: ParseError = {
      status: 400,
      message: "Missing modifiers or source segment",
    }
    throw err
  }

  const modifiersRaw = path.substring(0, slashIndex)
  let sourceRaw = path.substring(slashIndex + 1)

  // URL decode the source once
  sourceRaw = decodeURIComponent(sourceRaw)

  // Repair collapsed https:/ -> https://
  sourceRaw = sourceRaw.replace(/^https:\/(?!\/)/, "https://")
  sourceRaw = sourceRaw.replace(/^http:\/(?!\/)/, "http://")

  if (!sourceRaw) {
    const err: ParseError = {
      status: 400,
      message: "Missing source segment",
    }
    throw err
  }

  return { modifiersRaw, sourceRaw }
}

export { parseRequestPath }
export type { ParseError }
