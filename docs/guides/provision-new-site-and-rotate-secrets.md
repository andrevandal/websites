# Provision a Site Configuration and Rotate a Secret

A website has no configuration file: its site ID is its `websites/`
folder name and its canonical host is the Astro `site` (`CANONICAL_SITE_URL`
in `astro.config.js`). Worker variables are attached per Stage at deploy:

| Variable                       | Source                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `IMAGES_BASE_URL`              | GitHub environment secret of the deploying job (`staging`, `production`; PR jobs run in `preview`). EmDash previews get `""`.                  |
| `S3_PUBLIC_URL`, other secrets | Every key under Infisical `/websites/<site-id>` for staging and production. Previews never read Infisical; `S3_PUBLIC_URL` is on Preview Base. |

`S3_PUBLIC_URL` is the public base of the site's bucket, bucket included
(`<endpoint>/<bucket>`). Code and seeds reference assets bucket-relative
through `assetUrl(getSecret, path)` from `@vandal-websites/sun-ui/astro`; unset, it
serves `/<path>` from `public/`. Never commit a bucket hostname. Static sites
commit their Google Analytics IDs in the layout, production host only; EmDash
sites configure them in the analytics plugin.

## Add a Site

1. `bun run website:new <site-id>` scaffolds the site.
2. Add `S3_PUBLIC_URL` (and any runtime secret the site reads) under
   `/websites/<site-id>` in the Infisical `staging` and `production`
   environments:

   ```bash
   infisical secrets set S3_PUBLIC_URL=<endpoint>/<bucket> --env=staging --path=/websites/<site-id>
   ```

The `CANONICAL_SITE_URL` constant is passed to
`robotsSitemap()` from `@vandal-websites/robots-sitemap` in `astro.config.js`. That
integration serves `/robots.txt` and `/sitemap-index.xml` at request time.
Robots allows crawling only on the canonical host and disallows every other
origin, including Workers Preview URLs. Sitemap entries always use the
canonical host. EmDash sites serve their own `/sitemap.xml` and `/robots.txt`
routes (`sitemapPath: "/sitemap.xml"`, `injectRobots: false`; see the root
`README.md`).

A site whose sitemap must list CMS content, such as `pedrohenri`, serves
`/robots.txt` and `/sitemap-index.xml` from its own `src/pages` routes with the
same `generateRobotsTxt` and `generateSitemapXml` helpers instead of the
integration; its `CANONICAL_SITE_URL` is the Astro `site`.

## Provision and Rotate a Secret

Each site is one Worker; staging and production are Versions of it. Secrets
live in Infisical `/websites/<site-id>`, one value per environment. Every
upload passes every key of that path to `wrangler versions upload
--secrets-file`, so set and rotate values in Infisical, never with `wrangler
secret put` (the next upload overwrites them). A rotated value reaches staging
on the next push to `main` and production on the next release-please merge or
`deploy-manual.yml` promotion. A key removed from Infisical stays on the Worker
until `wrangler secret delete`.

Pull request Previews (`pr-<N>`) do not use Worker secrets or Infisical.
Every site needs `S3_PUBLIC_URL` (the staging bucket's public base; production
for sites without one) on Preview Base, and EmDash previews also need
`CF_ACCESS_AUDIENCE`, matching the operator's Access application:

```bash
bunx wrangler preview base-config secret put S3_PUBLIC_URL --worker-name <worker>
bunx wrangler preview base-config secret put CF_ACCESS_AUDIENCE --worker-name pedrohenri
```

Never copy Turso/S3 credentials to Preview Base. Confirm a secret name exists
without exposing its value with
`bunx wrangler secret list --name <worker> --format pretty`. Changing the
GitHub `CF_ACCESS_TEAM_DOMAIN` requires rebuilding selected previews. Keep an
old credential active until every affected Stage has received the replacement.

## Selected EmDash Deployment Flavors

`pedrohenri` and `brunabraz` PR previews build with
`EMDASH_BUILD_FLAVOR=preview`, native D1/R2 and Access. Staging and production
share the standard Turso/S3 artifact without rebuilding, with default passkeys
and the JMAP email plugin (`@vandal-websites/emdash-plugin-jmap`). Local development
remains SQLite/local without
Access or deployed credentials, even with preview build variables present.

For Worker `<worker>` and positive PR number `<N>`, preview bindings are
`SESSION`: KV `<worker>-pr-<N>`, `DB`: D1 `<worker>-pr-<N>-cms`, and
`MEDIA`: R2 `<worker>-pr-<N>-media`. Redeploys reuse exact names and preserve CMS
edits; PR cleanup deletes only that Preview and its resources, purging seeded
and uploaded media before R2 bucket deletion. Cleanup derives in-memory S3
credentials from the current Cloudflare API token; no separate stored R2
cleanup credentials are required. Other sites retain KV-only preview provisioning.

Isolated native R2 preview media continues to use the Worker media route.
Standard staging and production media is served directly from `S3_PUBLIC_URL`,
without a Worker media route.

Bindings do not seed content or create admins. Before first access, the operator
must cover every preview hostname and all `/_emdash/*` routes with the intended
Access policy. The first trusted Access-authorized identity becomes the first
Admin through native Access. Complete supported protected setup with the site's
existing seed, choose **include sample content** when desired, and continue the
native budgeted seed progress until it finishes. Seeds contain no users. There
is no public bypass or automated bootstrap. Access policies, hostname/path
coverage and audience matching remain operator-owned; the
[Access guide](./cloudflare-access-for-previews.md) walks through them,
including the Lighthouse service token. Standard staging and
production retain passkeys: protect an empty site's setup until a trusted admin
finishes it; an unprotected setup can be claimed by anyone reaching it.

### GitHub deploy/build inventory

| Name                                                                   | Location and purpose                                                                                                                                                          |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`                                                 | GitHub secret; existing Workers Scripts Edit and Workers KV Storage Edit, plus D1 Write and Workers R2 Storage Write on the target account for selected previews and cleanup. |
| `CLOUDFLARE_ACCOUNT_ID`                                                | GitHub secret; account identifier, not authentication.                                                                                                                        |
| `CF_ACCESS_TEAM_DOMAIN`                                                | GitHub secret; selected preview build only. Hostname or full HTTP(S) team URL, normalized to hostname. Missing/invalid value fails that build; never a runtime Worker secret. |
| `GITHUB_TOKEN`                                                         | Built-in workflow token; existing workflow permissions support PR comments and artifacts.                                                                                     |
| `RELEASE_PLEASE_TOKEN`                                                 | Optional GitHub secret; fine-grained PAT (contents + pull requests write) so release-please PRs run Main CI without manual approval. Falls back to `GITHUB_TOKEN`.            |
| `MOON_REMOTE_HOST`                                                     | Optional GitHub remote-cache secret; not required to deploy.                                                                                                                  |
| `BAZEL_REMOTE_BASIC_AUTH_USERNAME`, `BAZEL_REMOTE_BASIC_AUTH_PASSWORD` | Optional GitHub remote-cache authentication secrets; not site runtime credentials.                                                                                            |

### Standard runtime inventory

For `pedrohenri` and `brunabraz`, the eight required standard runtime secrets are
`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `S3_ENDPOINT`, `S3_BUCKET`,
`S3_PUBLIC_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` and
`EMDASH_ENCRYPTION_KEY`. They are plain secrets under each site's
`/websites/<site>` path of the Infisical environments `staging` (the `main`
push) and `production` (the merged release-please PR), so each Stage has its
own database and bucket. `CF_ACCESS_AUDIENCE` remains preview-only.

`S3_PUBLIC_URL` is required Infisical-backed runtime configuration even though
it is public, not a credential. Its value is `S3_ENDPOINT + '/' + S3_BUCKET`:
the publicly reachable endpoint/bucket URL. Never put it in plaintext `vars`
or commit its hostname.

One-time Infisical setup:

1. Create a project and the `staging` and `production` environments.
2. Add `S3_PUBLIC_URL` under every `/websites/<site-id>` and the eight keys
   under `/websites/pedrohenri` and `/websites/brunabraz`, in each environment.
3. Create a machine identity with OIDC auth bound to this repository
   (subjects `repo:andrevandal/websites:environment:staging` and
   `...:production`; audience defaults to the Infisical domain) and give it
   read access to every `/websites/<site-id>` path in both environments.
4. Set the repository variables `INFISICAL_IDENTITY_ID`,
   `INFISICAL_PROJECT_SLUG` and, for EU or self-hosted instances,
   `INFISICAL_DOMAIN`. They are not secrets.

The Infisical action writes the Stage's keys to `.site-secrets.env`.
`bun scripts/deploy.ts check-secrets <site> --stage <stage>` fails when that
file lacks `S3_PUBLIC_URL` or holds an empty value, naming keys only: an empty
key would be inherited from the previous Version. `CF_ACCESS_AUDIENCE` is never
uploaded to staging or production. Local development reads `S3_PUBLIC_URL`
from the site's `.env`. Seeds keep absolute production media URLs.

The JMAP plugin (`jmap-email`) keeps its server URL, authentication mode,
credential and sender in admin settings under Plugins -> JMAP, not in
environment variables. Configure it in the admin and select it under
Settings -> Email. The credential is encrypted with `EMDASH_ENCRYPTION_KEY`
(one per Stage, generated with `bunx emdash secrets generate`; losing it
makes the stored credential unreadable, so re-enter it in the admin).
