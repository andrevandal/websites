# EmDash local development

The CMS website keys are `brunabraz` and `pedrohenridesign`. Commands below run from the repository root unless a website directory is specified. Use the pinned toolchain in `.prototools`.

## Local, standard and preview providers

| Concern             | Local Astro dev                                 | Standard Worker                       | Selected PR preview                                |
| ------------------- | ----------------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| Database            | SQLite in `.data/emdash.db`                     | Stage-specific Turso                  | PR-specific D1                                     |
| Media               | `.data/uploads`, Worker-style local media route | Stage-specific S3, direct public URLs | PR-specific R2, Worker media route                 |
| Authentication      | Development bypass and console email            | Passkeys and configured email         | Native Access integration                          |
| Application secrets | None                                            | Infisical `staging` or `production`   | Preview Base only; no standard runtime credentials |

Standard CMS `S3_PUBLIC_URL` is optional when both `S3_ENDPOINT` and `S3_BUCKET` are present. Runtime resolution prefers a nonempty explicit public URL. Deployed secret validation rejects explicitly empty supplied values. Non-CMS websites instead obtain their committed typed default from Astro config; that does not change rendering mode.

Local dev uses the Node adapter, SQLite and filesystem providers. It does not exercise remote Turso/S3, production email or live Access, even if preview build variables exist in the shell. Build-only email plugins stay disabled locally so the console provider handles sign-in links.

## First run

```sh
bun install --frozen-lockfile
env -u CI moon run brunabraz:seed pedrohenridesign:seed
env -u CI moon run brunabraz:dev
```

Run one site at a time on the default port, or configure distinct ports. Moon builds workspace dependencies and generates required types before dev. The Astro dev server runs in the background; from that site's directory, `bunx astro dev logs`, `bunx astro dev status` and `bunx astro dev stop` manage it. Clearing `CI` keeps local interactive behavior.

## Sign in locally

Open the setup dev-bypass link printed by the server at localhost, ending in `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin`. It creates/signs in the development admin. Optionally invite your own address under Settings -> Users; the invite and later email sign-in links appear in the dev logs. Email links are single-use and expire.

The auth dev-bypass route can sign the local admin in again. Both bypass endpoints reject requests outside Astro dev. Do not use a local bypass as a deployed setup mechanism. Protect empty standard deployments until a trusted admin completes setup; selected previews rely on trusted Access identities.

## Seed and content changes

Stop the site's dev server before every seed operation. The shared Moon `seed` task applies `seed/seed.json`, repairs newly created byline locales and applies supported seed extensions. Existing rows and edited settings are not overwritten. The locale snapshot distinguishes rows created by this seed run; existing ambiguous English rows remain unchanged. A failed repair keeps its snapshot for a later retry.

Seeds carry collections, entries, menus, taxonomies and block definitions. Extension handling adds supported media settings, per-entry SEO panels, byline fields, avatars and missing custom-field values. Repeated runs are insert-only: they can add new collections and entries but cannot change an existing collection's field definitions or replace existing edits.

For schema changes, preserve any local editorial work, stop the server, and move the site's `.data` directory to a backup outside the checkout before reseeding. This replaces a local database and uploads; it must never target production or an unreviewed path. Recreate seed data, start dev and regenerate `emdash-env.d.ts`. Review the generated diff against the changed seed.

An admin export is not a complete backup. It omits extension-managed SEO and byline custom-field definitions/values; preserve those explicitly. Validate hand-edited seed data with the EmDash seed validator before use. Portable Text blocks and spans require unique keys. Keep seed media on the committed public asset URLs with final bucket keys.

## Media and types

Seed `$media` values download into local uploads. Pages request the stored key through the local media route; use the media storage key rather than assuming a media identifier is a filename. Repeated media references download once per run, while settings and values already present stay unchanged. Failed downloads can be retried by reseeding.

Inspect Network requests in the browser. Local CMS media should use `/_emdash/api/media/file/`; unexpected Astro optimization requests may indicate the wrong renderer. Code-referenced bucket fonts and other assets are separate from seeded CMS media.

`emdash-env.d.ts` is tracked and reflects the database schema when dev starts, not the seed file alone. Astro sync generates `.astro/types.d.ts`; Wrangler typegen generates `worker-configuration.d.ts`. Deploy-time stage variables and bindings need not appear in Wrangler's generated declaration.

## Verify a change

```sh
env -u CI moon run brunabraz:test
env -u CI moon run brunabraz:check
env -u CI moon run brunabraz:typecheck
env -u CI bun run check
moon run :build
```

Substitute `pedrohenridesign` for the other CMS site. Moon builds dependencies before consumers. Exercise the home page and a seeded content page, inspect fonts/media and report the checks actually run. Local page success is not evidence of production database, email or storage connectivity.

If content types are missing, run the project's sync/check task. If a new field disappears, verify the local database was recreated from the changed seed before starting dev. If rebuilding a shared package replaces `dist` under a running server, restart dev. Configuration ownership and isolated preview behavior are described in [the configuration guide](provision-new-site-and-rotate-secrets.md).
