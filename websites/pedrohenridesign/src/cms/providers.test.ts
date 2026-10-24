import { describe, expect, test } from "bun:test"
import { fileURLToPath } from "node:url"
import { resolveEmDashProviders } from "./providers"

describe("resolveEmDashProviders", () => {
  test.each([undefined, "standard"])(
    "keeps runtime libSQL and S3 without auth for flavor %s",
    flavor => {
      const providers = resolveEmDashProviders({
        isDev: false,
        env: {
          EMDASH_BUILD_FLAVOR: flavor,
          TURSO_DATABASE_URL: "libsql://standard.turso.io",
          CF_ACCESS_TEAM_DOMAIN: "invalid ignored domain",
          CF_ACCESS_AUDIENCE: "runtime-only-audience",
        },
      })

      expect(providers.database).toEqual({
        entrypoint: fileURLToPath(
          new URL("./libsql-runtime.ts", import.meta.url)
        ),
        config: {},
        type: "sqlite",
        migrations: {
          entrypoint: "emdash/internal/db/libsql-migrations",
          manifestConfig: {
            url: "libsql://standard.turso.io",
            authTokenEnv: "TURSO_AUTH_TOKEN",
          },
        },
      })
      expect(providers.storage).toEqual({
        entrypoint: "@vandal-websites/sun-ui-emdash/storage/s3-fetch",
        config: {},
      })
      expect(providers).not.toHaveProperty("auth")
    }
  )

  test("passes a build-time public URL without embedding S3 credentials", () => {
    const { storage } = resolveEmDashProviders({
      isDev: false,
      env: {
        S3_PUBLIC_URL: "https://assets.example.com/site",
        S3_ENDPOINT: "https://s3.example.invalid",
        S3_BUCKET: "site",
        S3_ACCESS_KEY_ID: "runtime-only-key",
        S3_SECRET_ACCESS_KEY: "runtime-only-secret",
      },
    })
    expect(storage).toEqual({
      entrypoint: "@vandal-websites/sun-ui-emdash/storage/s3-fetch",
      config: { publicUrl: "https://assets.example.com/site" },
    })
  })

  test("uses existing unset libSQL URL when standard has no env", () => {
    const { database } = resolveEmDashProviders({ isDev: false, env: {} })
    expect(database.migrations?.manifestConfig).toEqual({
      url: "libsql://unset",
      authTokenEnv: "TURSO_AUTH_TOKEN",
    })
    expect(database.config).toEqual({})
  })

  test.each([{}, { EMDASH_BUILD_FLAVOR: "preview" }])(
    "dev takes precedence without Access or credentials: %j",
    env => {
      const providers = resolveEmDashProviders({ isDev: true, env })
      expect(providers.database).toEqual({
        entrypoint: "emdash/db/sqlite",
        config: { url: "file:./.data/emdash.db" },
        type: "sqlite",
        migrations: {
          entrypoint: "emdash/internal/db/sqlite-migrations",
          manifestConfig: { url: "file:./.data/emdash.db" },
        },
      })
      expect(providers.storage).toEqual({
        entrypoint: "emdash/storage/local",
        config: {
          directory: "./.data/uploads",
          baseUrl: "/_emdash/api/media/file",
        },
      })
      expect(providers).not.toHaveProperty("auth")
    }
  )

  test.each([
    "myteam.cloudflareaccess.com",
    "  MYTEAM.cloudflareaccess.com  ",
    "https://myteam.cloudflareaccess.com/",
    "http://MYTEAM.cloudflareaccess.com/path?query=value",
  ])("preview normalizes %s and uses native runtime audience", teamDomain => {
    const providers = resolveEmDashProviders({
      isDev: false,
      env: {
        EMDASH_BUILD_FLAVOR: "preview",
        CF_ACCESS_TEAM_DOMAIN: teamDomain,
        CF_ACCESS_AUDIENCE: "must-not-enter-build",
        TURSO_DATABASE_URL: "libsql://unused.turso.io",
        TURSO_AUTH_TOKEN: "unused-token",
        S3_ENDPOINT: "https://unused.example.com",
        S3_ACCESS_KEY_ID: "unused-key",
        S3_SECRET_ACCESS_KEY: "unused-secret",
      },
    })
    expect(providers.database).toEqual({
      entrypoint: "@emdash-cms/cloudflare/db/d1",
      config: { binding: "DB" },
      type: "sqlite",
      migrations: {
        entrypoint: "@emdash-cms/cloudflare/internal/db/d1-migrations",
        manifestConfig: { binding: "DB" },
      },
      supportsRequestScope: true,
      supportsCoalescing: true,
      supportsCollectionDeletionGuard: true,
    })
    expect(providers.storage).toEqual({
      entrypoint: "@emdash-cms/cloudflare/storage/r2",
      config: { binding: "MEDIA", publicUrl: undefined },
    })
    expect(providers.auth).toEqual({
      type: "cloudflare-access",
      entrypoint: "@emdash-cms/cloudflare/auth",
      config: {
        teamDomain: "myteam.cloudflareaccess.com",
        audienceEnvVar: "CF_ACCESS_AUDIENCE",
      },
    })
  })

  test("preview never requires audience during build", () => {
    const { auth } = resolveEmDashProviders({
      isDev: false,
      env: {
        EMDASH_BUILD_FLAVOR: "preview",
        CF_ACCESS_TEAM_DOMAIN: "myteam.cloudflareaccess.com",
      },
    })
    expect(auth?.config).toEqual({
      teamDomain: "myteam.cloudflareaccess.com",
      audienceEnvVar: "CF_ACCESS_AUDIENCE",
    })
  })

  test.each([
    undefined,
    "",
    "   ",
    "https://",
    "invalid secret domain",
    "ftp://secret.cloudflareaccess.com",
    "https://private-user:private-password@myteam.cloudflareaccess.com",
    "https://invalid_host.cloudflareaccess.com",
    "https://-invalid.cloudflareaccess.com",
  ])(
    "rejects invalid preview team domain without leaking value: %j",
    domain => {
      expect(() =>
        resolveEmDashProviders({
          isDev: false,
          env: {
            EMDASH_BUILD_FLAVOR: "preview",
            CF_ACCESS_TEAM_DOMAIN: domain,
          },
        })
      ).toThrow("CF_ACCESS_TEAM_DOMAIN must be a valid hostname or HTTP(S) URL")
      try {
        resolveEmDashProviders({
          isDev: false,
          env: {
            EMDASH_BUILD_FLAVOR: "preview",
            CF_ACCESS_TEAM_DOMAIN: domain,
          },
        })
      } catch (error) {
        expect((error as Error).message).toBe(
          "CF_ACCESS_TEAM_DOMAIN must be a valid hostname or HTTP(S) URL"
        )
      }
    }
  )

  test("derives S3 public URL from endpoint and bucket when absent with valid core keys (staging)", () => {
    const { storage } = resolveEmDashProviders({
      isDev: false,
      env: {
        EMDASH_BUILD_FLAVOR: "standard",
        TURSO_DATABASE_URL: "libsql://standard.turso.io",
        S3_ENDPOINT: "https://files.vandal.services",
        S3_BUCKET: "pedrohenridesign-staging",
        S3_ACCESS_KEY_ID: "key",
        S3_SECRET_ACCESS_KEY: "secret",
        EMDASH_ENCRYPTION_KEY: "encryption-key",
      },
    })
    expect(storage).toEqual({
      entrypoint: "@vandal-websites/sun-ui-emdash/storage/s3-fetch",
      config: {
        publicUrl: "https://files.vandal.services/pedrohenridesign-staging",
      },
    })
  })

  test("does not derive a public URL from an endpoint without a bucket", () => {
    const { storage } = resolveEmDashProviders({
      isDev: false,
      env: {
        EMDASH_BUILD_FLAVOR: "standard",
        TURSO_DATABASE_URL: "libsql://standard.turso.io",
        S3_ENDPOINT: "https://files.vandal.services",
      },
    })
    expect(storage).toEqual({
      entrypoint: "@vandal-websites/sun-ui-emdash/storage/s3-fetch",
      config: {},
    })
  })

  test("derives S3 public URL from endpoint and bucket even when explicitly empty", () => {
    const { storage } = resolveEmDashProviders({
      isDev: false,
      env: {
        EMDASH_BUILD_FLAVOR: "standard",
        TURSO_DATABASE_URL: "libsql://standard.turso.io",
        S3_PUBLIC_URL: "",
        S3_ENDPOINT: "https://files.vandal.services",
        S3_BUCKET: "pedrohenridesign-staging",
        S3_ACCESS_KEY_ID: "key",
        S3_SECRET_ACCESS_KEY: "secret",
        EMDASH_ENCRYPTION_KEY: "encryption-key",
      },
    })
    expect(storage).toEqual({
      entrypoint: "@vandal-websites/sun-ui-emdash/storage/s3-fetch",
      config: {
        publicUrl: "https://files.vandal.services/pedrohenridesign-staging",
      },
    })
  })
})
