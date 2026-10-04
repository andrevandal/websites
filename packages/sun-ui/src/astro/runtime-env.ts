import type { GtagConfig } from "./components/Gtag.props"

// Callers pass `getSecret` from `astro:env/server`, which reads the attached
// Worker variable at request time. `Astro.locals.runtime.env` throws on
// @astrojs/cloudflare 14.
type RuntimeEnvReader = (key: string) => string | undefined

// Stage configs commit unset values as "", so empty means unset.
const runtimeEnv = (read: RuntimeEnvReader, key: string): string | undefined =>
  read(key) || undefined

const runtimeBoolean = (read: RuntimeEnvReader, key: string): boolean =>
  read(key) === "true"

const runtimeGtag = (read: RuntimeEnvReader): GtagConfig => ({
  gtagId: runtimeEnv(read, "PUBLIC_GOOGLE_ANALYTICS_ID"),
  conversionId: runtimeEnv(read, "PUBLIC_GOOGLE_ADS_CONVERSION_ID"),
  conversionLabel: runtimeEnv(read, "PUBLIC_GOOGLE_ADS_CONVERSION_LABEL"),
  partytown: runtimeBoolean(read, "ENABLE_PARTYTOWN"),
})

export { runtimeBoolean, runtimeEnv, runtimeGtag }
export type { RuntimeEnvReader }
