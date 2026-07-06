import type { Context } from "hono"
import { consola } from "consola"
import { config } from "../config/env"
import { buildCacheKey, buildSourceKey } from "../cache/key"
import { pickBackend } from "../cache/select"
import {
  isNotModified,
  setCacheHeaders,
  setNoStoreHeaders,
} from "../http/headers"
import { parseModifiers } from "../riapi/modifiers"
import { parseRequestPath } from "../riapi/parse-path"
import type { ParseError } from "../riapi/parse-path"
import type { CanonicalModifiers } from "../riapi/types"
import { enqueueTransform } from "../queue/setup"
import { readSourceBytes, resolveSource } from "../source/resolve"
import type { SourceRef } from "../source/resolve"
import { computePlaceholder } from "../transform/placeholder"
import { resolveTargetFormat } from "../transform/image"

const logger = consola.withTag("http")
const PLACEHOLDER_FORMAT = "png"

const locatorFor = (source: SourceRef) =>
  source.kind === "http"
    ? ({ kind: "http", url: source.url } as const)
    : ({ kind: "fs", absolutePath: source.absolutePath } as const)

const isGifSource = (sourceId: string): boolean =>
  /\.gif(?:$|[?#])/i.test(sourceId)

const imageHandler = async (c: Context) => {
  const startedAt = performance.now()
  const { path } = c.req
  // One info-level line per request: outcome + status + timing. Debug-level
  // calls below add per-step detail; this is the always-on (level>=3) summary.
  const finish = (outcome: string, status: number) => {
    const durationMs = Math.round(performance.now() - startedAt)
    logger.info(`${status} ${path} ${outcome} (${durationMs}ms)`)
  }

  const parsedPath = (() => {
    try {
      return { ok: true as const, ...parseRequestPath(path.slice(1)) }
    } catch (err) {
      return { ok: false as const, error: err as ParseError }
    }
  })()

  if (!parsedPath.ok) {
    const { error } = parsedPath
    logger.debug(`parse error: ${error.status} ${error.message}`)
    finish("parse-error", error.status)
    return c.json({ status: error.status, error: error.message }, error.status)
  }

  const { modifiersRaw, sourceRaw } = parsedPath

  const resolved = await resolveSource(sourceRaw)
  if (!resolved.ok) {
    finish("source-rejected", resolved.error.status)
    return c.json(
      { status: resolved.error.status, error: resolved.error.message },
      resolved.error.status
    )
  }

  const { source } = resolved
  logger.debug(`source resolved: ${source.kind} ${source.id}`)
  const backend = pickBackend(source.kind)
  const maxAge = source.kind === "http" ? config.httpMaxAge : config.fsMaxAge
  const sourceMtime = source.kind === "fs" ? source.mtime : undefined

  if (c.req.query("placeholder") !== undefined) {
    const placeholderKey = `${buildSourceKey(source.id)}/placeholder`
    const cached = await backend.get(placeholderKey, PLACEHOLDER_FORMAT, {
      sourceMtime,
    })

    if (cached) {
      c.header("Content-Type", "image/png")
      setCacheHeaders(c, { ...cached, maxAge })
      if (isNotModified(c, cached)) {
        finish("placeholder-not-modified", 304)
        return c.body(null, 304)
      }
      finish("placeholder-hit", 200)
      return c.body(new Uint8Array(cached.bytes))
    }

    logger.debug(`placeholder miss, computing: ${placeholderKey}`)
    const sourceBytes = await readSourceBytes(locatorFor(source))
    const placeholderBytes = await computePlaceholder(sourceBytes)
    await backend.put(placeholderKey, PLACEHOLDER_FORMAT, placeholderBytes)

    c.header("Content-Type", "image/png")
    finish("placeholder-computed", 200)
    return c.body(new Uint8Array(placeholderBytes))
  }

  const modifiers = parseModifiers(modifiersRaw)
  const gifSource = isGifSource(source.id)
  const targetFormat = await resolveTargetFormat(modifiers, {
    avifEnabled: config.avifEnabled,
    acceptHeader: c.req.header("accept"),
    animatedGif: gifSource,
  })
  const canonicalModifiers: CanonicalModifiers = {
    ...modifiers,
    format: targetFormat,
  }
  if (modifiers.format === "auto") c.header("Vary", "Accept")

  const cacheKey = buildCacheKey(source.id, canonicalModifiers)
  logger.debug(`cache lookup: ${cacheKey} (${targetFormat})`)
  const cached = await backend.get(cacheKey, targetFormat, { sourceMtime })

  if (cached) {
    c.header("Content-Type", `image/${targetFormat}`)
    setCacheHeaders(c, { ...cached, maxAge })
    if (isNotModified(c, cached)) {
      finish("not-modified", 304)
      return c.body(null, 304)
    }
    finish("cache-hit", 200)
    return c.body(new Uint8Array(cached.bytes))
  }

  // Cache miss: serve something immediately, transform in the background.
  await enqueueTransform({
    sourceKind: source.kind,
    sourceId: source.id,
    modifiers: canonicalModifiers,
    cacheKey,
    animatedGif: gifSource,
  })
  setNoStoreHeaders(c)

  if (source.kind === "http") {
    finish("cache-miss-redirect", 307)
    return c.redirect(source.url, 307)
  }

  const raw = Bun.file(source.absolutePath)
  c.header("Content-Type", raw.type || "application/octet-stream")
  finish("cache-miss-stream", 200)
  return c.body(raw.stream())
}

export { imageHandler }
