import { createDialect as createLibsqlDialect } from "emdash/db/libsql"

// EmDash serializes adapter config into the build. Reading Turso settings here,
// at request time, keeps the auth token out of the bundle: on Workers,
// `nodejs_compat_populate_process_env` fills process.env from vars and secrets.
const createDialect = () => {
  const url = process.env.TURSO_DATABASE_URL
  if (!url) throw new Error("TURSO_DATABASE_URL is not set")
  return createLibsqlDialect({ url, authToken: process.env.TURSO_AUTH_TOKEN })
}

export { createDialect }
