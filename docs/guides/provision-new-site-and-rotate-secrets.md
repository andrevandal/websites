# Configure a website and rotate runtime secrets

The website key is its directory name under `websites`, not its canonical domain. Current keys are `bellypao`, `brunabraz`, `clinicamauricioaraujo`, `pedrohenridesign`, `transportugal` and `vandallabs`. The Astro `site` setting defines the canonical customer URL.

## Add a site

`bun run website:new <site-id>` scaffolds an Astro website. Review its canonical URL, Moon tasks, Worker names, package scope, release mapping and content notice before submitting a PR. Use the new-website issue template to identify the content owner and permissions. The generator does not establish rights or provision infrastructure.

The four non-CMS sites remain Astro server applications. Their Astro config sets a nonempty `S3_PUBLIC_URL` default and declares the public server-env schema; asset readers pass that typed default to `assetUrl`. Do not inject this default from Moon, CI, a generator recipe or a replacement config file. Runtime public-base overrides still win.

## Public assets

Original assets use `https://files.vandal.services/<site-key>`. This is an allowed public service, not a private infrastructure endpoint. No asset upload or bucket migration is part of this guide. Public access does not grant reuse rights; see each site's `CONTENT-LICENSE.md`.

Vandal Labs owner-facing asset URLs remain available even when no page currently consumes them:

- Cover: `https://files.vandal.services/vandallabs/cover.png`
- Social image: `https://files.vandal.services/vandallabs/og-image.png`
- WhatsApp profile: `https://files.vandal.services/vandallabs/whatsapp-profile.png`

Seeds contain committed public media URLs. CMS runtime URL resolution uses a nonempty `S3_PUBLIC_URL` first; otherwise both `S3_ENDPOINT` and `S3_BUCKET` are required. Joining endpoint and bucket normalizes their boundary slash. Supplying only one is not a public base. Local CMS development uses local uploads instead.

## Configuration owners

| Configuration                                               | Owner and stage                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Non-CMS public asset default                                | Site Astro config; no mandatory asset secret                                               |
| Standard CMS runtime secrets                                | Infisical website path, separately in `staging` and `production`                           |
| `IMAGES_BASE_URL`                                           | GitHub environment secret injected by deployment; selected CMS previews use an empty value |
| `CF_ACCESS_TEAM_DOMAIN`                                     | GitHub secret used only for selected preview builds                                        |
| `CF_ACCESS_AUDIENCE`, `S3_ENDPOINT`, `S3_BUCKET` (previews) | Cloudflare Preview Base on `<site>-staging`, never standard runtime                        |
| Cloudflare, release and optional cache credentials          | GitHub CI secrets                                                                          |

CI reads Infisical only for `brunabraz` and `pedrohenridesign`, from `/websites/<site-key>`. The production environment slug is **`production`**, not an abbreviation. OIDC subjects are scoped to `repo:andrevandal/websites:environment:staging` or `repo:andrevandal/websites:environment:production`. Repository variables select the Infisical identity/project and optional domain. Fork checks receive none of these credentials.

## Standard CMS runtime inventory

The seven mandatory keys for each standard CMS stage are:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
- `S3_ENDPOINT`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `EMDASH_ENCRYPTION_KEY`

`S3_PUBLIC_URL` is optional and derives from the validated S3 endpoint/bucket when absent. An explicitly empty supplied value is rejected, including an empty optional public URL, so uploads cannot inherit a stale value. Validation reports key names, not values. `CF_ACCESS_AUDIENCE` is filtered out of standard stage uploads.

Non-CMS targets have no mandatory keys and skip Infisical export. The deploy tool accepts their empty-file fallback. For a credential-free CLI check, point `SITE_SECRETS_FILE` at an empty temporary file and run `bun scripts/deploy.ts check-secrets bellypao --stage staging`.

## Rotate without competing sources

Change CMS runtime values in the owning Infisical environment, not by hand-editing standard Worker secrets: the next version upload supplies that environment's file. A staging upload follows the eligible main push; production promotion uses the `production` environment and the saved staging artifact. Keep old credentials valid until every affected stage has received the replacement.

Deleting a key from the store does not necessarily delete a deployed Worker binding. During an owner-controlled cutover inspect actual Worker versions and bindings for obsolete `S3_PUBLIC_URL`, `S3_ENDPOINT` and `S3_BUCKET` overrides; reconcile unintended old values without removing intentional overrides. Do not repeat completed Infisical cleanup or bucket work.

JMAP credentials live in encrypted plugin settings, not environment variables. The stage encryption key must remain available to read them; losing it requires re-entering the plugin credential. Choose the configured plugin under EmDash Settings -> Email.

## Preview data boundary

Selected CMS PR previews use `EMDASH_BUILD_FLAVOR=preview`, native D1/R2 and Access, without Infisical or Turso/S3 credentials. Their session, database and media resources are named by Worker and PR number; redeploys reuse exact names, while cleanup removes only that PR's resources. Preview media stays on the Worker media route. Non-CMS previews do not require an S3 public-base secret because they retain their committed defaults.

Access policies, preview hostname/path coverage and audience matching are operator-owned. Use [the Access guide](cloudflare-access-for-previews.md); never copy production database or storage credentials into Preview Base. Local CMS development stays SQLite/local even when preview build inputs exist. See [the local guide](emdash-local-development.md) and [CI behavior](../ci-pipeline.md).
