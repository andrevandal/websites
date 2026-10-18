# EmDash local development workflow

How to run, sign in to, and change any EmDash site in this repository
locally. `<site>` is the site's Moon project and directory under `websites/`
(`moon run <site>:dev`, `websites/<site>`).

## Contents

- [How local differs from production](#how-local-differs-from-production)
- [Site conventions](#site-conventions)
- [First run](#first-run)
- [Signing in](#signing-in)
- [Day-to-day commands](#day-to-day-commands)
- [Changing the content model](#changing-the-content-model)
- [Resetting the database](#resetting-the-database)
- [Media](#media)
- [Generated types](#generated-types)
- [Verifying a change](#verifying-a-change)
- [Troubleshooting](#troubleshooting)

## How local differs from production

| Concern     | `astro dev` (local)                                        | Build (Cloudflare Workers)                                |
| ----------- | ---------------------------------------------------------- | --------------------------------------------------------- |
| Adapter     | `@astrojs/node`                                            | `@astrojs/cloudflare`                                     |
| Database    | SQLite at `.data/emdash.db`                                | Turso, from `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`       |
| Media       | `.data/uploads`, served at `/_emdash/api/media/file/<key>` | S3-compatible bucket (`S3_*`)                             |
| Email       | EmDash console provider, sends nothing                     | The site's email plugin, selected under Settings -> Email |
| Images      | `SunPicture` renders the source URL directly               | `SunPicture` builds transform URLs from `IMAGES_BASE_URL` |
| Credentials | None                                                       | Stage vars in `config.json` plus Worker secrets           |

`.data/` is gitignored; nothing local reaches the repository.

## Site conventions

Every EmDash site sets these up; the rest of this guide assumes them.

- **`astro.config.js` switches on dev.** `const isDev =
process.argv.includes("dev")` selects the Node adapter, `sqlite()` at
  `.data/emdash.db` and `local()` storage in `.data/uploads` for dev, and the
  Cloudflare adapter, the production database and `s3()` storage otherwise.
- **Email plugins load in builds only.** EmDash auto-selects its dev console
  provider only when it is the sole `email:deliver` provider, so any email
  plugin (`jmapEmailPlugin()` on `pedrohenri`; `emdashSmtp()` is the SMTP
  alternative) is registered as `plugins: isDev ? [] : [<emailPlugin>()]`.
  Loading one in
  dev makes magic links fail with `EMAIL_NOT_CONFIGURED`.
- **The site's `moon.yml` has the `emdash` tag** (next to `cloudflare`). The
  tag inherits the shared tasks; nothing is copied per site:
  - `seed` (`.moon/tasks/emdash.yml`): `scripts/fix-seed-byline-locale.ts
capture`, `emdash seed seed/seed.json` into `.data/`, then
    `scripts/fix-seed-byline-locale.ts` and `scripts/seed-extensions.ts`. The
    `emdash seed` CLI runs outside the Astro runtime and writes every byline at
    locale `en`. `capture` snapshots the existing byline IDs (and the seed's
    bylines and `defaultLocale`) into `.data/seed-byline-locale.pending.json`
    before the CLI; the repair then moves to the seed's `defaultLocale` only
    the rows that did not exist before, are in the seed and are still `en`,
    skipping any that would collide with a row already at that locale. Existing
    bylines are never relabelled, and a missing snapshot means no repair. The
    snapshot stays after a failed run (a rerun keeps the first one) and is
    removed when the repair completes; a malformed or mismatched one fails the
    task without touching rows. A seed without bylines or a `defaultLocale`
    (or with `en`) needs none. Seeding is an exclusive maintenance operation:
    stop the site's dev server first and start it again afterward, because a
    byline an editor creates mid-seed cannot be told apart from one the CLI
    created. Old English bylines that are already ambiguous stay unchanged.
    The last script applies seed data the CLI cannot: media site settings, SEO
    panels (matched by slug, locale and collection), byline fields (guarded by
    EmDash's `byline_fields_version` dirty/clean counter so cached definitions
    refresh) and avatars (see [Media](#media)). All of it is insert-only.
  - `sync` and `typecheck` (`.moon/tasks/astro-application.yml`, every Astro
    site): `typecheck` runs `astro sync` first, so a clean checkout has the
    `astro:content` types.
  - `dev` depends on `typegen` (`wrangler types`) and `^:build` (builds
    `packages/sun-ui`).
- **Seed content lives in `seed/seed.json`.** It carries the schema
  (collections, fields, taxonomies, menus, block types) and the starting
  content.

## First run

From the repository root:

```sh
bun install
env -u CI moon run <site>:seed
env -u CI moon run <site>:dev
```

`CI=true` in the shell changes Moon's behavior; `env -u CI` drops it for local
runs. Run `dev` through Moon: a bare `astro dev` requires the
[shared UI package](../../packages/sun-ui) to have been built first.

`dev` starts Astro in the background on `http://localhost:4321` and the Moon
task exits. From `websites/<site>`:

```sh
bunx astro dev logs     # server output, including emailed links
bunx astro dev status
bunx astro dev stop
```

## Signing in

Passkeys need a secure origin, so local sign-in uses the dev bypass once,
then email.

1. **Create the first admin.** Open the bypass link the dev server prints:
   `http://localhost:4321/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin`.
   It marks setup complete and signs you in as `dev@emdash.local` (Admin). The
   setup wizard cannot create the first user by email.
2. **Add your own account (optional).** In Settings -> Users, invite your
   email. The invite is printed to the dev server log.
3. **Sign in by email.** On the login page choose "Sign in with email" and
   enter the address. Copy the link from `bunx astro dev logs`, or from
   `GET /_emdash/api/dev/emails` while signed in as an admin (`DELETE` clears
   the list). Open it and select **Continue**. Links expire after 15 minutes
   and are single-use; requests are limited to 3 per 5 minutes per IP.

`/_emdash/api/auth/dev-bypass` signs in again as the dev admin at any time.
Both bypass endpoints return 403 outside `astro dev`.

## Day-to-day commands

From the repository root:

```sh
bun test websites/<site>/src/<path>.test.ts   # one test file
env -u CI moon run <site>:test                # all site tests
env -u CI moon run <site>:check               # astro check
env -u CI moon run <site>:typecheck           # astro sync, then tsc
env -u CI bun run check                       # the full repository gate
```

## Changing the content model

A seed never modifies existing rows and never adds fields to a collection that
already exists; new collections and entries are still created. So:

- **New entries or collections**: run `moon run <site>:seed` again.
- **New field on an existing collection, or a changed entry**: reset the
  database (next section).
- **Change made in the admin first**: export it back into the seed and diff
  the result before committing:

  ```sh
  cd websites/<site>
  bunx emdash export-seed --database ./.data/emdash.db --with-content all > /tmp/exported-seed.json
  ```

  `--with-content` takes `all` or a collection list, and `--database` must be
  given; its default is `./data.db`. The export does not include
  extension-managed per-entry SEO panels or byline custom fields and their
  values: preserve those explicitly; it is not a complete backup. Portable site
  settings, including `seo.defaultOgImage`, are exported.

Validate a hand edit with `bunx emdash seed seed/seed.json --validate`.
Hand-written Portable Text needs a unique `_key` on every block and every
span; the seed does not generate them.

Seeded entries are stamped with the time the seed ran, in seed order. With a
`published_at DESC` listing, keep entries oldest-first in `seed.json` so the
intended newest one sorts first.

## Resetting the database

```sh
(cd websites/<site> && bunx astro dev stop && rm -rf .data)
env -u CI moon run <site>:seed
env -u CI moon run <site>:dev
```

After a reset, sign in again with the dev bypass and redo any admin-only
steps the site README lists (anything a seed cannot express, such as byline
photos or byline custom fields).

## Media

CMS images in the seed are `$media` values:
`{ "$media": { "url", "filename", "alt" } }`. The seed downloads each file once
into `.data/uploads`, and pages request it from
`/_emdash/api/media/file/<storage-key>`. Image fields store the media id and
`meta.storageKey`; build the URL from the storage key.

Media site settings (`logo`, `favicon`, `seo.defaultOgImage`) take the same
`$media` value in the seed's `settings`. The CLI resolves `$media` in content
only, so `scripts/seed-extensions.ts` downloads the file, creates its media
row, and rewrites the setting to `{ mediaId, alt }`.

The seed format has no per-entry SEO panel either. A content entry may carry
an `seo` object next to `data` (`title`, `description`, `image` as `$media`,
`canonical`, `noIndex`); the CLI ignores it, and `scripts/seed-extensions.ts`
writes it to the entry's SEO panel, the image stored as
`/_emdash/api/media/file/<storage-key>` like the admin picker does.

Bylines have no custom fields in the seed format, and a seed byline `avatar`
needs a file already in storage. A root `bylineFields` array (`slug`,
`label`, `type`, optional `required`/`translatable`) defines byline fields;
a byline may carry `avatarMedia` (a `$media` value) and `customFields`
(field slug -> value). The script creates missing field definitions, sets
the avatar when the byline has none, and each value the byline lacks.

An image used more than once is downloaded once per run. Settings, panels,
avatars and values already set in the admin are left alone; a failed
download is retried on the next seed run.

Check this in the browser's Network panel, not in the markup: a request to
`/_image?href=...` means the image went through Astro's optimizer instead,
which is a regression.

Assets referenced from code (logos, patterns, video) are not CMS media and are
not part of the seed.

## Generated types

| File                        | Produced by                       | When                                      |
| --------------------------- | --------------------------------- | ----------------------------------------- |
| `emdash-env.d.ts` (tracked) | EmDash, from the database schema  | Every dev-server start                    |
| `.astro/types.d.ts`         | `astro sync` (Moon `sync` task)   | Before `typecheck`; also by `astro check` |
| `worker-configuration.d.ts` | `wrangler types` (Moon `typegen`) | Before `dev`                              |

`emdash-env.d.ts` follows the database, not `seed.json`. After a schema change:
reset `.data`, seed, start dev until the file updates, then commit it with the
seed change. Regenerating against the old database removes the new field and
`astro check` fails.

`worker-configuration.d.ts` only reflects what `wrangler.json` declares. The
`SESSION` KV binding and the Stage vars from `config.json` are added at deploy
time, so they do not appear in it.

## Verifying a change

1. Narrowest tests first, then `moon run <site>:check`.
2. Exercise the changed page in a browser against the dev server, including
   the Network panel for images.
3. `env -u CI bun run check` before pushing. Pre-push also runs
   `bun test scripts` and `bun scripts/coverage-allowlist-guard.ts`.

## Troubleshooting

- **`Cannot find module 'astro:content'`**: `.astro/types.d.ts` is missing.
  Run `moon run <site>:check` or `moon run <site>:typecheck`.
- **`EMAIL_NOT_CONFIGURED` on magic link**: an email plugin is loaded in dev;
  see [Site conventions](#site-conventions).
- **New field missing from the admin or from `emdash-env.d.ts`**: the seed
  skipped the existing collection; reset the database.
- **Bylines missing on the site**: they were seeded at locale `en`; reseed
  through the Moon task so the post-seed locale fix runs.
- **Dev returns 500 after rebuilding `packages/sun-ui`**: the build replaced
  `dist` under the running server. Stop and start dev again.
- **`ENOSPC` in tests or the browser**: `/tmp` is full. Free space or set
  `TMPDIR` to a filesystem with room; do not skip hooks.
