# Provision a Site Configuration and Rotate a Secret

Every Cloudflare Workers website keeps its non-secret configuration in
`websites/<site-id>/config.json`. Runtime provider secret values belong to
Cloudflare and are written with Wrangler, never committed or stored as GitHub
variables. GitHub deploy/build secrets are separate: selected EmDash previews
also require `CF_ACCESS_TEAM_DOMAIN` at build time.

## Add a Site Configuration

1. Create `websites/<site-id>/config.json`, matching the directory name in
   `siteId`. `bun run website:new <site-id>` writes this file for a new site,
   with every Stage's values empty and `ENABLE_PARTYTOWN` set to `"false"`.

   ```json
   {
     "siteId": "example-site",
     "canonicalHost": "https://example-site.com",
     "vars": {
       "preview": {
         "PUBLIC_GOOGLE_ANALYTICS_ID": ""
       },
       "staging": {
         "PUBLIC_GOOGLE_ANALYTICS_ID": ""
       },
       "production": {
         "PUBLIC_GOOGLE_ANALYTICS_ID": "G-EXAMPLE"
       }
     },
     "secretKeys": ["EXAMPLE_API_TOKEN"]
   }
   ```

2. Add every non-secret value the site reads at request time under each Stage
   in `vars`. Values such as URLs, public analytics IDs, and feature flags are
   safe to commit. Add only secret _names_ to `secretKeys`.

3. Validate the configuration before opening the pull request:

   ```bash
   bun test scripts/site-config.test.ts scripts/env.test.ts
   ```

The deploy tooling rejects a config if a key named in `secretKeys` is also
present in any Stage's plaintext `vars`.

`canonicalHost` must match the `CANONICAL_SITE_URL` constant the site passes to
`robotsSitemap()` from `@vandal-websites/robots-sitemap` in `astro.config.js`. That
integration serves `/robots.txt` and `/sitemap-index.xml` at request time.
Robots allows crawling only on the canonical host and disallows every other
origin, including Workers Preview URLs. Sitemap entries always use the
canonical host.

A site whose sitemap must list CMS content, such as `pedrohenri`, serves
`/robots.txt` and `/sitemap-index.xml` from its own `src/pages` routes with the
same `generateRobotsTxt` and `generateSitemapXml` helpers instead of the
integration; its `CANONICAL_SITE_URL` is the Astro `site`.

## Provision a Secret

Each site is one Worker. Staging and production are Versions of it, so they
share its Worker secrets. Deploy the Worker once before setting a secret, then
set the value on it. Wrangler prompts for the value and does not print it:

```bash
bunx wrangler secret put EXAMPLE_API_TOKEN --name example-site
```

A Version captures the Worker's secrets when it is uploaded, so the staging
Version picks up a new value on its next upload from `main`. Secret values never
go into the build artifact or `config.json`.

Pull request Previews are Workers Previews (`pr-<N>`) of that Worker, not
separate Workers, and do not use Worker secrets. Provision only the secrets
used by the site's actual preview providers, not every name in `secretKeys`.
For `pedrohenri` and `brunabraz`, Preview Base needs only `CF_ACCESS_AUDIENCE`:

```bash
bunx wrangler preview base-config secret put CF_ACCESS_AUDIENCE --worker-name pedrohenri
```

Use `--worker-name brunabraz` for that site. Audience must match the operator's
Access application; missing audience fails runtime authentication. Do not put
selected sites' Turso/S3 credentials on Preview Base. Generic sites still need
the credentials their actual preview providers use.

Confirm that a secret name exists without exposing its value:

```bash
bunx wrangler secret list --name example-site --format pretty
```

Do not put secret values in `config.json`, `.env.example`, a generated
`wrangler.json` `vars` block, or a GitHub variable.

## Rotate a Secret

1. Generate or obtain the replacement value from the secret's provider.
2. Replace the secret only where its provider is used: for `pedrohenri`, edit
   the key in `PEDROHENRI_SECRETS` of the GitHub `staging` and/or `production`
   environment; for other sites `wrangler secret put`; and `wrangler preview
base-config secret put` for the selected preview's Access audience. For generic sites, update
   Preview Base only when their preview provider uses that credential.
3. Run `wrangler secret list --name <worker-name> --format pretty` to confirm
   the key is present. The value is never returned.

Runtime secret rotation does not require rebuilding. For `pedrohenri`, the new
value reaches staging with the next push to `main` and production with the next
release-please merge (or the manual `deploy-manual.yml` promotion), because each
upload carries its environment's JSON; a rotation takes effect on the next
deployment of that site to that Stage, not on unrelated pushes. Preview Base
and each existing Preview keep their own effective settings. For
other sites `wrangler secret put` deploys the new value to production
immediately; staging captures it at its next Version upload from `main`. Turso/S3 rotation affects selected standard builds
only, and audience rotation affects their previews only. Changing the GitHub
`CF_ACCESS_TEAM_DOMAIN` requires rebuilding selected previews. If the provider
supports a grace period, keep the old credential active until every affected
Stage has received and exercised the replacement.

## Selected EmDash Deployment Flavors

`pedrohenri` and `brunabraz` PR previews build with
`EMDASH_BUILD_FLAVOR=preview`, native D1/R2 and Access. Staging and production
share the standard Turso/S3 artifact without rebuilding, with default passkeys
and the `emdash-smtp` plugin. Local development remains SQLite/local without
Access or deployed credentials, even with preview build variables present.

For Worker `<worker>` and positive PR number `<N>`, preview bindings are
`SESSION`: KV `<worker>-pr-<N>`, `DB`: D1 `<worker>-pr-<N>-cms`, and
`MEDIA`: R2 `<worker>-pr-<N>-media`. Redeploys reuse exact names and preserve CMS
edits; PR cleanup deletes only that Preview and its resources, purging seeded
and uploaded media before R2 bucket deletion. Cleanup derives in-memory S3
credentials from the current Cloudflare API token; no separate stored R2
cleanup credentials are required. Other sites retain KV-only preview provisioning.

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
| `MOON_REMOTE_HOST`                                                     | Optional GitHub remote-cache secret; not required to deploy.                                                                                                                  |
| `BAZEL_REMOTE_BASIC_AUTH_USERNAME`, `BAZEL_REMOTE_BASIC_AUTH_PASSWORD` | Optional GitHub remote-cache authentication secrets; not site runtime credentials.                                                                                            |

### Standard runtime inventory

For `pedrohenri`, the standard runtime secrets are `TURSO_DATABASE_URL`,
`TURSO_AUTH_TOKEN`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` and
`S3_SECRET_ACCESS_KEY`. They are one JSON object in the `PEDROHENRI_SECRETS`
secret of each GitHub environment (`staging`: the `main` push; `production`:
the merged release-please PR), so each Stage has its own database and bucket:

```json
{
  "TURSO_DATABASE_URL": "libsql://...",
  "TURSO_AUTH_TOKEN": "...",
  "S3_ENDPOINT": "https://...",
  "S3_BUCKET": "...",
  "S3_ACCESS_KEY_ID": "...",
  "S3_SECRET_ACCESS_KEY": "..."
}
```

`bun scripts/deploy.ts check-secrets <site> --stage <stage>` validates it
(env `STAGE_SECRETS`) before the build; the upload then passes it to
`wrangler versions upload --secrets-file`. The schema is exact (every key in
`secretKeys` except `CF_ACCESS_AUDIENCE`, all non-empty, no others), because a
key left out is inherited from the previous Version. Do not set these with
`wrangler secret put`: the next upload overwrites them. A key dropped from the
JSON stays on the Worker until `wrangler secret delete`. Rotating a value means
editing the GitHub secret and running the next deploy. Preview Base needs only
`CF_ACCESS_AUDIENCE`.

SMTP host, port, security, user, password and sender belong to `emdash-smtp`
plugin admin settings, not invented `SMTP_*` environment variables. Configure
the plugin in the admin and select it under Settings -> Email.
