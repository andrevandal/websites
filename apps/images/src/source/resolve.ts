// oxlint-disable import/no-nodejs-modules
import fs from "node:fs"
import path from "node:path"
import { consola } from "consola"
import { config } from "../config/env"
import { isAllowedDomain } from "./domains"

const logger = consola.withTag("source")

// Computed once at startup: if fsDir doesn't exist, the "fs" source kind is
// disabled entirely rather than failing per-file with ENOENT on every request.
const fsRootStatic = path.resolve(config.fsDir)
// oxlint-disable-next-line node/no-sync
const fsSourceEnabled = fs.existsSync(fsRootStatic)
if (fsSourceEnabled) logger.debug(`fs source enabled, root: ${fsRootStatic}`)
else {
  logger.warn(
    `fs source disabled: directory not found: ${fsRootStatic} (set FS_DIR or create it to enable local filesystem sources)`
  )
}

type SourceRef =
  | { kind: "http"; id: string; url: string }
  | { kind: "fs"; id: string; absolutePath: string; mtime: Date }

// redirectTo is set only for a well-formed http(s) URL whose domain is not
// allowlisted, so the handler can pass it through instead of rejecting.
type SourceError = { status: 400 | 404; message: string; redirectTo?: string }

// NOTE: Per Bun.Image documentation, path strings are filesystem paths —
// do not pass user-controlled strings directly to Bun.file/Bun.Image.
// This is treated as an arbitrary-file-read primitive unless validated.
// Below, we validate the resolved path before any Bun.file/Bun.Image call.
const resolveSource = async (
  sourceRaw: string
): Promise<
  { ok: true; source: SourceRef } | { ok: false; error: SourceError }
> => {
  // HTTP branch: scheme must be http:// or https://
  if (sourceRaw.startsWith("http://") || sourceRaw.startsWith("https://")) {
    try {
      const url = new URL(sourceRaw)
      const hostname = url.hostname.toLowerCase()

      // Exact or `*.suffix` match against the allowlist (case-insensitive)
      if (!isAllowedDomain(hostname, config.httpDomains)) {
        logger.debug(`http source rejected: domain not allowed: ${hostname}`)
        return {
          ok: false,
          error: {
            status: 400,
            message: `domain not allowed: ${hostname}`,
            redirectTo: url.href,
          },
        }
      }

      logger.debug(`http source resolved: ${sourceRaw}`)

      return {
        ok: true,
        source: {
          kind: "http",
          id: sourceRaw,
          url: sourceRaw,
        },
      }
    } catch {
      // Invalid URL
      logger.debug(`http source rejected: invalid url: ${sourceRaw}`)
      return {
        ok: false,
        error: {
          status: 400,
          message: `invalid url: ${sourceRaw}`,
        },
      }
    }
  }

  // fs source kind disabled entirely when fsDir doesn't exist on disk
  if (!fsSourceEnabled) {
    return {
      ok: false,
      error: {
        status: 404,
        message: "fs source disabled: directory not found",
      },
    }
  }

  // FS branch: relative path, resolved against fsDir
  const fsRoot = fsRootStatic
  const resolved = path.resolve(fsRoot, sourceRaw)

  // Path traversal guard: reject unless resolved stays contained within fsDir
  const isSafe = resolved === fsRoot || resolved.startsWith(fsRoot + path.sep)

  if (!isSafe) {
    logger.debug(`fs source rejected: path traversal: ${sourceRaw}`)
    return {
      ok: false,
      error: {
        status: 404,
        message: "not found",
      },
    }
  }

  // Check file existence
  const exists = await Bun.file(resolved).exists()
  if (!exists) {
    logger.debug(`fs source rejected: not found: ${resolved}`)
    return {
      ok: false,
      error: {
        status: 404,
        message: "not found",
      },
    }
  }

  // Get mtime (ms epoch, convert to Date)
  const mtimeMs = await Bun.file(resolved).lastModified
  const mtime = new Date(mtimeMs)

  logger.debug(`fs source resolved: ${resolved}`)

  return {
    ok: true,
    source: {
      kind: "fs",
      id: sourceRaw,
      absolutePath: resolved,
      mtime,
    },
  }
}

type SourceLocator =
  | { kind: "http"; url: string }
  | { kind: "fs"; absolutePath: string }

// Reads the raw bytes for an already-validated source. Callers (handlers/image.ts
// for placeholders, queue/job.ts for background transforms) must only pass a
// locator derived from a source that already went through resolveSource's
// domain-allowlist / path-traversal checks.
const readSourceBytes = async (
  locator: SourceLocator
): Promise<Uint8Array | Blob> => {
  if (locator.kind === "http") {
    const response = await fetch(locator.url)
    if (!response.ok)
      throw new Error(`fetch failed: ${response.status} ${locator.url}`)

    logger.debug(`http source bytes fetched: ${locator.url}`)
    return response.blob()
  }
  if (!fsSourceEnabled)
    throw new Error("fs source disabled: directory not found")
  logger.debug(`fs source bytes read: ${locator.absolutePath}`)
  return Bun.file(locator.absolutePath).bytes()
}

export type { SourceRef, SourceError, SourceLocator }
export { resolveSource, readSourceBytes }
