# brunabraz

Bruna Braz's site. Astro on Cloudflare Workers, with its content managed in
[EmDash](https://github.com/emdash-cms/emdash): the admin lives at
`/_emdash/admin` on the site itself.

## Content model

Everything below is edited in the admin; the site code only renders it.

- **Pages** (`pages`): one entry per page. `inicio` is served at `/`, every
  other slug at `/<slug>` (`aula-ingles-particular` today, via the
  collection's `urlPattern: "/{slug}"`). Each page has a menu color and
  **Sections**: an ordered list of blocks (the page builder). SEO (title,
  description, share image, canonical, noindex) comes from EmDash's built-in
  SEO panel on the entry, not a custom field, fill it in per page in the
  admin. The seed fills the panel for `inicio`, `aula-ingles-particular` and
  `blog`. An empty panel falls back to Settings -> General (site title,
  tagline) and Settings -> SEO -> Default Social Image (seeded with
  `images/social/home-page.png`). Every section of the original design is a
  block type, so sections can be reordered, removed, repeated, or added to
  new pages.
- **Testimonials** (`testimonials`): shown, shuffled, by the "Testimonials" block.
- **Analytics** (plugin `analytics`, `packages/emdash-plugin-analytics`): the
  admin sidebar item "Analytics" edits the Google tag ID and the Google Ads
  conversion ID and label. Empty fields turn tracking off (disabling the
  plugin only hides the page; stored IDs still render); header CTAs marked
  `track-conversion` report leads.
- **Menus**: `primary` is the header navigation; `social` is the footer's
  social links (the icon follows the link's host: Instagram, YouTube, Twitch,
  Discord, WhatsApp). Menu and item text is site content edited in the admin
  in Portuguese (the site's content locale); only the admin chrome around
  them (collection/field/menu names) is in English.
- **Media**: CMS images (page-block images, testimonial photos) are stored in
  EmDash media storage, downloaded on seed and uploaded on replacement in the
  admin. They are served from S3 at production (`S3_PUBLIC_URL` from Infisical)
  or the Worker media route locally and in PR previews. Assets referenced from
  code (logo, CSS background patterns, video, illustrations) stay where they are.
- **Posts** (`posts`): one entry per `/blog/{slug}`. `category` is a
  hierarchical taxonomy assigned per post; bylines credit an author profile
  (`bylines`), not a field on the post itself. The Author card shows the
  byline's photo, its `headline` custom field above the name (Bylines -> the
  author -> Headline), its bio, and a button to its website URL labeled by
  its `cta_label` field (no label, no button). A post's title is its SEO
  panel title, else "<post title> | <site title>"; its share image is its SEO
  panel image, else its featured image, else the default social image.
  The Blog home carousel shows the newest posts checked as "Destaque", topped
  up with the newest other posts to three; those posts are left out of the
  grid below it.
- **Category pages** (`/blog/categoria/{slug}`): one per Category or
  Subcategory of the `category` taxonomy, no entry to create. Titled
  "<Category> | <site title>", described by the Category's description, shared
  with the default social image, and listed in the sitemap. A Category page
  lists the posts of the Category and its Subcategories.

In plain-text fields, `*text*` marks emphasis (italic and colored in
headings). Blank lines split paragraphs where a field says so.

Kept in code on purpose: pricing values and rules (`src/data/pricing.ts`, it
has tests), the WhatsApp number (`src/data/whatsapp.ts`), decorative artwork,
and each block's layout.

### One-time admin setup for the blog byline

Seeds cannot upload a byline photo or create byline custom fields. After the
first seed, in the admin:

1. Open the `bruna-braz` byline and upload her photo.
2. Create two byline custom fields: `role` (string) and `cta_label` (string).
3. Set `role` to "Professora de inglês e escritora deste blog" and
   `cta_label` to "Conheça minhas aulas".

The Author card on a post hides the role line when `role` is empty, and
hides its button when `cta_label` or the byline's `websiteUrl` is empty.

`seed/seed.json` holds the schema (block types, collections, menus)
and the site's current content. EmDash applies its schema to an empty
database on the first request; content is applied by `moon run
brunabraz:seed` locally, or by choosing sample content in the setup wizard.

## Local development

No credentials are needed. `astro dev` runs on Node with SQLite at
`.data/emdash.db` and uploads in `.data/uploads` (both gitignored), and prints
outgoing email to the terminal.

```sh
moon run brunabraz:seed   # once, and again after resetting .data/
moon run brunabraz:dev
```

Full workflow (sign-in, resets, schema changes, generated types,
troubleshooting): [`docs/guides/emdash-local-development.md`](../../docs/guides/emdash-local-development.md).

`moon run brunabraz:seed` (shared, from the `emdash` tag) also runs
`scripts/fix-seed-byline-locale.ts`, which moves seeded bylines from `en` to
the seed's `defaultLocale` (`pt-BR`). Without it the Author card finds no
byline: the credit lookup (`post.data.byline`) is strict per locale.

**Blog posts in the seed** are all stamped with the seed application's
installation date, not real publish dates. Editors set real dates in the
admin. Seed order determines display order (`published_at DESC`): posts are
ordered oldest-first in `seed.json` so the newest appears first on `/blog`.

Open `http://localhost:4321/_emdash/admin`; the dev server also prints a
dev-bypass link that signs in as an admin without a passkey.

Passkeys need a secure origin, so sign in with email instead: `astro dev`
uses EmDash's console email provider, which sends nothing. Request a magic
link on the login page, then copy it from the dev server log or from
`GET /_emdash/api/dev/emails` (as a signed-in admin). Only one email
provider can be auto-selected, so the JMAP email plugin is loaded in builds only.

Changing `seed/seed.json` does not touch an existing database. Delete
`.data/` and seed again, or make the change in the admin and export it with
`bunx emdash export-seed --database ./.data/emdash.db --with-content all`.

## Production

Staging and production run the standard build; PR previews run
`EMDASH_BUILD_FLAVOR=preview` (native D1 `DB`, R2 `MEDIA`, Access auth and
isolated `SESSION` KV). CI promotes the same standard artifact from staging to
production without rebuilding. Local development stays SQLite/local without
Access.

`IMAGES_BASE_URL` comes from the deploying job's GitHub environment secret.
Runtime secrets, including `S3_PUBLIC_URL` (and optional `S3_REGION`, default
`auto`), are every key under Infisical `/websites/brunabraz`, environments
`staging` and `production`. CI checks
them and injects them at upload (`scripts/deploy.ts check-secrets`,
`version-upload`). Previews leave `IMAGES_BASE_URL` empty so originals load
from the isolated Worker media route without an external image-service hop.

| Secret in Infisical     | Purpose                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| `TURSO_DATABASE_URL`    | libSQL database (`libsql://...`)                                     |
| `TURSO_AUTH_TOKEN`      | Turso auth token                                                     |
| `S3_ENDPOINT`           | Media bucket endpoint                                                |
| `S3_BUCKET`             | Media bucket                                                         |
| `S3_PUBLIC_URL`         | Public media base: `S3_ENDPOINT` + `/` + `S3_BUCKET`                 |
| `S3_ACCESS_KEY_ID`      | Media bucket credentials                                             |
| `S3_SECRET_ACCESS_KEY`  | Media bucket credentials                                             |
| `EMDASH_ENCRYPTION_KEY` | Encrypts plugin secret settings (JMAP credential); one key per Stage |

PR Previews read only `CF_ACCESS_AUDIENCE` from Preview Base; do not copy the
Infisical secrets there. Provisioning locations, GitHub credentials and
required scopes are in the
[provisioning guide](../../docs/guides/provision-new-site-and-rotate-secrets.md).

`nodejs_compat_populate_process_env` in `wrangler.json` exposes the secrets on
`process.env`, where `src/cms/libsql-runtime.ts` and the sun-ui-emdash S3 adapter read
them. The Worker runs `migrations.runtime: "check"`: it never migrates and
answers 503 while migrations are pending. CI applies the core migrations first
(`bun scripts/deploy.ts migrate brunabraz` runs `emdash migrate` against the
Stage's Turso database before the Version is uploaded), on `main` pushes
(staging) and releases (production). A job cancelled mid-migration leaves a
lock; release it with `bunx emdash migrate --status`, then
`--release-lock <id> --expected-target-fingerprint <fp>`, from
`websites/brunabraz`.

Both sites use `@vandal-websites/sun-ui-emdash` to prefer EmDash's public media URL,
falling back to the Worker route for local and preview storage. The S3
descriptor accepts `S3_PUBLIC_URL` at build time if present; otherwise the
runtime adapter reads the Stage secret through `process.env`. Astro's
`image.remotePatterns` are build-time only: a runtime hostname does not add an
allowlist entry. `SunPicture` uses the external image service directly;
EmDash's own Astro image optimization needs the public URL at build time.
Post headings and inline images render through `sun-ui-emdash`'s Portable
Text map; `annotateHeadingIds` gives the table of contents its anchors.

Staging and production enable persisted logs, invocation logs, traces, and
real-time issues with 100% sampling. Query strings are not redacted. The
Wrangler `previews.observability` override disables observability for PR previews.

`astro dev` uses `.data/` instead.

The admin locale allowlist is `["pt-BR"]`; EmDash also includes its English
fallback. EmDash 1.2.0 or later is required for this build-time restriction,
which excludes the other admin translation catalogs from the Worker.

Email goes through the `@vandal-websites/emdash-plugin-jmap` plugin, loaded in builds
only. Server URL, authentication (username and password, or a bearer token),
credential, sender address and name, and Reply-To are plugin settings, entered
in the admin under Plugins -> JMAP, not environment variables. The same page has
a "Send test email" action and Plugins -> JMAP log lists the last deliveries
(status, recipient, subject, error; never the body). Then pick "jmap-email"
under Settings -> Email. The sender address must match a JMAP identity on the
account. The credential is encrypted with `EMDASH_ENCRYPTION_KEY`, which must be
set in the deployment environment.

`/sitemap.xml` is the site's own URL set, generated from CMS content on every
request with an entry `lastmod`. It replaces EmDash's sitemap routes.

`/robots.txt` allows crawling only on `https://brunabraz.com.br`, disallows
`/_emdash/`, then applies rules from Settings -> SEO -> robots.txt. Those
editor rules do not apply on other hosts. Settings -> General -> Site URL
affects neither file.

For standard staging/production, the first request runs migrations and applies
the seed schema; the setup wizard creates the first admin. Until trusted setup
is complete, anyone who reaches an empty standard site can become its admin.
Protect setup and complete it promptly; passkeys are hostname-specific.

Each PR binds `SESSION` to `brunabraz-pr-<N>`, `DB` to D1 database
`brunabraz-pr-<N>-cms`, and `MEDIA` to R2 bucket `brunabraz-pr-<N>-media`.
Same-PR redeploys reuse these resources and preserve CMS edits. Closing the PR
removes only its Preview and isolated KV/D1/R2 resources, emptying seeded or
uploaded media before deleting the R2 bucket. Other sites' previews remain
KV-only.

`CF_ACCESS_TEAM_DOMAIN` is a GitHub secret used only for selected preview
builds: a hostname or full HTTP(S) team URL, normalized to hostname.
Missing or invalid input fails the preview build. Set `CF_ACCESS_AUDIENCE`
only on this Worker's Preview Base config, matching the Access application;
missing runtime audience fails authentication. Audience is not a build input,
and team domain is not a Worker runtime secret.

Before first access, the operator must protect every preview hostname and all
`/_emdash/*` routes with the intended Access policy. The first trusted
Access-authorized identity becomes the first Admin through native Access.
Bindings supply isolated runtime storage, not content or users. Complete the
supported protected setup with `seed/seed.json`, choosing **include sample
content** when desired and continuing native seed progress until it finishes.
The seed has no users. CI provides no public setup bypass or automated
seed/admin-bootstrap step. Access policy and hostname/path coverage remain the
operator's responsibility.
