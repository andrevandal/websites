// Callers pass `getSecret` from `astro:env/server`, which reads the attached
// Worker variable at request time. `Astro.locals.runtime.env` throws on
// @astrojs/cloudflare 14.
type RuntimeEnvReader = (key: string) => string | undefined

// Unset and empty Worker variables both mean unset.
const runtimeEnv = (read: RuntimeEnvReader, key: string): string | undefined =>
  read(key) || undefined

// Returns nonempty S3_PUBLIC_URL if set; otherwise joins S3_ENDPOINT and S3_BUCKET
// with one slash if both are nonempty; otherwise undefined.
const s3PublicUrl = (read: RuntimeEnvReader): string | undefined => {
  const url = runtimeEnv(read, "S3_PUBLIC_URL")
  if (url) return url

  const endpoint = runtimeEnv(read, "S3_ENDPOINT")
  const bucket = runtimeEnv(read, "S3_BUCKET")
  if (endpoint && bucket)
    return `${endpoint.replace(/\/+$/, "")}/${bucket.replace(/^\/+/, "")}`

  return undefined
}

// Base precedence: s3PublicUrl(read), then defaultBase, then root-relative.
// Normalizes leading/trailing slashes: removes trailing from base, leading from path.
const assetUrl = (
  read: RuntimeEnvReader,
  path: string,
  defaultBase?: string
): string => {
  const base = s3PublicUrl(read) ?? defaultBase
  if (!base) return `/${path.replace(/^\/+/, "")}`
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`
}

export { assetUrl, s3PublicUrl, runtimeEnv }

export type { RuntimeEnvReader }
