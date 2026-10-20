// Callers pass `getSecret` from `astro:env/server`, which reads the attached
// Worker variable at request time. `Astro.locals.runtime.env` throws on
// @astrojs/cloudflare 14.
type RuntimeEnvReader = (key: string) => string | undefined

// Unset and empty Worker variables both mean unset.
const runtimeEnv = (read: RuntimeEnvReader, key: string): string | undefined =>
  read(key) || undefined

const assetUrl = (read: RuntimeEnvReader, path: string): string => {
  const base = runtimeEnv(read, "S3_PUBLIC_URL")
  if (!base) return `/${path.replace(/^\/+/, "")}`
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`
}

export { assetUrl, runtimeEnv }

export type { RuntimeEnvReader }
