# Provision a Site Configuration and Rotate a Secret

Every Cloudflare Workers website keeps its non-secret configuration in
`websites/<site-id>/config.json`. Secret values belong only to Cloudflare and
are written with Wrangler; they are never committed or stored as GitHub
variables.

## Add a Site Configuration

1. Create `websites/<site-id>/config.json`, matching the directory name in
   `siteId`.

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

2. Add every non-secret value the site reads at build or request time under
   each Stage in `vars`. Values such as URLs, public analytics IDs, and feature
   flags are safe to commit. Add only secret _names_ to `secretKeys`.

3. Validate the configuration before opening the pull request:

   ```bash
   bun test scripts/site-config.test.ts scripts/env.test.ts
   ```

The deploy tooling rejects a config if a key named in `secretKeys` is also
present in any Stage's plaintext `vars`.

## Provision a Secret

Deploy the Worker once before setting a secret. Then set the value directly on
each Worker that needs it. Wrangler prompts for the value and does not print it.

```bash
# Production Worker
bunx wrangler secret put EXAMPLE_API_TOKEN --name example-site

# Staging Worker
bunx wrangler secret put EXAMPLE_API_TOKEN --name example-site-staging

# Current pull-request preview Worker
bunx wrangler secret put EXAMPLE_API_TOKEN --name example-site-pr-123
```

Confirm that a secret name exists without exposing its value:

```bash
bunx wrangler secret list --name example-site --format pretty
```

Do not put secret values in `config.json`, `.env.example`, a generated
`wrangler.json` `vars` block, or a GitHub variable.

## Rotate a Secret

1. Generate or obtain the replacement value from the secret's provider.
2. Re-run `wrangler secret put` with the same key and Worker name for every
   Stage that uses the secret. Wrangler replaces the existing value in place.
3. Run `wrangler secret list --name <worker-name> --format pretty` to confirm
   the key is present. The value is never returned.

Rotation takes effect without rebuilding the site. If the provider supports a
grace period, keep the old credential active until every deployed Stage has
received and exercised the replacement.
