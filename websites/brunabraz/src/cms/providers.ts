import { access, d1, r2 } from "@emdash-cms/cloudflare"
import { local, s3 } from "emdash/astro"
import { libsql, sqlite } from "emdash/db"
// oxlint-disable-next-line import/no-nodejs-modules -- nodejs_compat provides node:url in the Worker
import { fileURLToPath } from "node:url"
import { s3PublicUrl } from "@vandal-websites/sun-ui/astro/runtime-env"

type ProviderOptions = {
  isDev: boolean
  env: Record<string, string | undefined>
}

const normalizeTeamDomain = (value: string | undefined) => {
  const message =
    "CF_ACCESS_TEAM_DOMAIN must be a valid hostname or HTTP(S) URL"
  const domain = value?.trim()
  if (!domain) throw new Error(message)

  let url: URL
  try {
    url = new URL(domain.includes("://") ? domain : `https://${domain}`)
  } catch {
    throw new Error(message)
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !url.hostname ||
    !url.hostname
      .split(".")
      .every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
  )
    throw new Error(message)

  return url.hostname
}

const resolveEmDashProviders = ({ isDev, env }: ProviderOptions) => {
  if (isDev) {
    return {
      database: sqlite({ url: "file:./.data/emdash.db" }),
      storage: local({
        directory: "./.data/uploads",
        baseUrl: "/_emdash/api/media/file",
      }),
    }
  }

  if (env.EMDASH_BUILD_FLAVOR === "preview") {
    const teamDomain = normalizeTeamDomain(env.CF_ACCESS_TEAM_DOMAIN)
    return {
      database: d1({ binding: "DB" }),
      storage: r2({ binding: "MEDIA" }),
      auth: access({ teamDomain, audienceEnvVar: "CF_ACCESS_AUDIENCE" }),
    }
  }

  return {
    database: {
      ...libsql({ url: env.TURSO_DATABASE_URL ?? "libsql://unset" }),
      entrypoint: fileURLToPath(
        new URL("./libsql-runtime.ts", import.meta.url)
      ),
      config: {},
    },
    storage: s3({ publicUrl: s3PublicUrl(key => env[key]) }),
  }
}

export { resolveEmDashProviders }
