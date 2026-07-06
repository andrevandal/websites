import type { CanonicalModifiers, Format, Mode, Scale, Flip } from "./types"

const parseModifiers = (modifiersRaw: string): CanonicalModifiers => {
  // If "_" alone, return all defaults
  if (modifiersRaw === "_") {
    return {
      mode: "max",
      scale: "down",
      format: "auto",
      flip: "none",
    }
  }

  // Split on & or ,
  const segments = modifiersRaw.split(/[&,]/)
  const parsed = new Map<string, string>()

  for (const segment of segments) {
    if (segment) {
      const match = segment.match(/^(?<key>[^:=_]+)[:=_](?<value>.*)$/)
      if (match?.groups?.key) {
        const key = normalizeKey(match.groups.key)
        if (!parsed.has(key)) parsed.set(key, match.groups.value || "")
      }
    }
  }

  // Build canonical modifiers with defaults
  const result: CanonicalModifiers = {
    mode: "max",
    scale: "down",
    format: "auto",
    flip: "none",
  }

  // Process parsed values
  for (const [key, value] of parsed) {
    try {
      switch (key) {
        case "width": {
          const num = parseInt(value, 10)
          if (!isNaN(num) && num > 0) result.width = num
          break
        }
        case "height": {
          const num = parseInt(value, 10)
          if (!isNaN(num) && num > 0) result.height = num
          break
        }
        case "mode": {
          const normalized = normalizeMode(value)
          if (normalized) result.mode = normalized
          break
        }
        case "scale": {
          const normalized = normalizeScale(value)
          if (normalized) result.scale = normalized
          break
        }
        case "format": {
          const normalized = normalizeFormat(value)
          if (normalized) result.format = normalized
          break
        }
        case "quality": {
          const num = parseInt(value, 10)
          if (!isNaN(num) && num >= 1 && num <= 100) result.quality = num
          break
        }
        case "rotate": {
          const num = parseInt(value, 10)
          if (!isNaN(num) && num % 90 === 0 && num >= -270 && num <= 270)
            result.rotate = num

          break
        }
        case "flip": {
          const normalized = normalizeFlip(value)
          if (normalized) result.flip = normalized
          break
        }
        case "brightness": {
          const num = parseFloat(value)
          if (!isNaN(num)) result.brightness = num
          break
        }
        case "saturation": {
          const num = parseFloat(value)
          if (!isNaN(num)) result.saturation = num
          break
        }
        case "filter": {
          // Bun.Image.Filter enum value - accept as-is if not empty
          if (value) result.filter = value
          break
        }
        case "compression": {
          const num = parseInt(value, 10)
          if (!isNaN(num) && num >= 0 && num <= 9) result.compression = num
          break
        }
        // Ignored per RIAPI: bgcolor, anchor, subsampling, v
      }
    } catch {
      // Silently drop unparseable values per RIAPI parsing.md
    }
  }

  return result
}

const normalizeKey = (rawKey: string): string => {
  const lower = rawKey.toLowerCase()

  // Resolve aliases
  const aliasMap: Record<string, string> = {
    w: "width",
    h: "height",
    f: "format",
    q: "quality",
    br: "brightness",
    sat: "saturation",
  }

  return aliasMap[lower] || lower
}

const normalizeMode = (value: string): Mode | null => {
  const modes: Record<string, Mode> = {
    stretch: "stretch",
    max: "max",
    pad: "pad",
    crop: "crop",
  }
  return modes[value] || null
}

const normalizeScale = (value: string): Scale | null => {
  const scales: Record<string, Scale> = {
    down: "down",
    both: "both",
    canvas: "canvas",
  }
  return scales[value] || null
}

const normalizeFormat = (value: string): Format | null => {
  const formats: Record<string, Format> = {
    jpeg: "jpeg",
    jpg: "jpeg", // common alias
    png: "png",
    webp: "webp",
    avif: "avif",
    gif: "gif",
    auto: "auto",
  }
  return formats[value] || null
}

const normalizeFlip = (value: string): Flip | null => {
  const flips: Record<string, Flip> = {
    none: "none",
    x: "x",
    y: "y",
    xy: "xy",
  }
  return flips[value] || null
}

export { parseModifiers }
