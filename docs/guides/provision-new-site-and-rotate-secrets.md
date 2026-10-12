# Provision a Site Configuration and Rotate a Secret

Every Cloudflare Workers website keeps its non-secret configuration in
`websites/<site-id>/config.json`. Secret values belong only to Cloudflare and
are written with Wrangler; they are never committed or stored as GitHub
variables.

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
separate Workers, and do not use Worker secrets. Set each name in the site's
`secretKeys` once on the Preview base config, and every new Preview inherits
it:

```bash
bunx wrangler preview base-config secret put EXAMPLE_API_TOKEN --worker-name example-site
```

Confirm that a secret name exists without exposing its value:

```bash
bunx wrangler secret list --name example-site --format pretty
```

Do not put secret values in `config.json`, `.env.example`, a generated
`wrangler.json` `vars` block, or a GitHub variable.

## Rotate a Secret

1. Generate or obtain the replacement value from the secret's provider.
2. Re-run `wrangler secret put` with the same key on the site's Worker, and
   `wrangler preview base-config secret put` for Previews. Wrangler replaces
   the existing value in place.
3. Run `wrangler secret list --name <worker-name> --format pretty` to confirm
   the key is present. The value is never returned.

Rotation takes effect without rebuilding the site. `wrangler secret put`
deploys the new value to production immediately. The staging Version receives
it on its next upload from `main`. If the provider supports a grace period,
keep the old credential active until every Stage has received and exercised
the replacement.
