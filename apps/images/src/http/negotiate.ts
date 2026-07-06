type ImageFormat = "avif" | "webp" | "jpeg" | "png"

const negotiateFormat = (
  acceptHeader: string | undefined,
  avifEnabled: boolean
): ImageFormat => {
  // Build candidate list based on avifEnabled
  const candidates: ImageFormat[] = avifEnabled
    ? ["avif", "webp", "jpeg", "png"]
    : ["webp", "jpeg", "png"]

  // If no Accept header, return default
  if (!acceptHeader || acceptHeader.trim() === "") return "jpeg"

  // Parse Accept header: split on comma, extract mime types in order
  const acceptedTypes = acceptHeader
    .split(",")
    .map(entry => {
      // Remove q= weighting and whitespace
      const mimeType = entry.split(";")[0]?.trim() || ""
      return mimeType
    })
    .filter(Boolean)

  // Check each accepted type (in order) to find first matching candidate
  for (const accepted of acceptedTypes) {
    // Check for wildcard first (matches all candidates)
    if (accepted === "image/*" || accepted === "*/*") {
      // Safe to access [0] since candidates is always non-empty
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return candidates[0]!
    }

    // Check for specific format match
    for (const candidate of candidates) {
      const candidateMime = `image/${candidate}`
      if (accepted === candidateMime) return candidate
    }
  }

  // Default to jpeg if no match
  return "jpeg"
}

export { negotiateFormat }
