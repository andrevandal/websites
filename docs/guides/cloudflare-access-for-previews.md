# Protect CMS previews with Cloudflare Access

Selected CMS sites, `pedrohenridesign` and `brunabraz`, use native EmDash Access authentication for PR previews. EmDash validates the Access JWT against the team domain and application audience. Standard staging and production retain passkeys and stay outside this preview-only policy.

CI does not create Access applications or policies and does not establish that they are correct. These are operator-owned prerequisites. This guide changes neither buckets nor image-service infrastructure. See [CI behavior](../ci-pipeline.md) and [configuration ownership](provision-new-site-and-rotate-secrets.md).

## One application per site

Use one Access application per website, targeting **Previews only**, not all Worker traffic. A per-site audience prevents a token admitted for one website being accepted by the other. A reusable policy can still back multiple applications. Do not choose an account-wide all-preview application or put staging/production behind the preview policy.

Cover every route of each preview hostname, including all `/_emdash/*` routes. Partial admin-only coverage breaks authentication on CMS API requests. Limit the reviewer policy to trusted identities: the first authenticated identity on a fresh preview can claim its initial Admin role.

## Configuration boundary

- `CF_ACCESS_TEAM_DOMAIN`: GitHub secret used only by the selected preview build. A hostname or full team URL is normalized by the existing integration. A missing/invalid value fails that build.
- `CF_ACCESS_AUDIENCE`: per-site Preview Base secret matching the Access application's AUD. It is not a GitHub secret or an Infisical standard-stage value.
- `S3_ENDPOINT` and `S3_BUCKET`: per-site Preview Base secrets giving the public bucket base (no credentials, never `S3_PUBLIC_URL`). Without them, code-owned assets such as the logo render as root-relative paths and 404 on previews.
- `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`: GitHub service-token secrets for preview setup and Lighthouse access, not CMS user sign-in credentials.

Preview Base belongs to the Worker the preview is created on, `<site>-staging`, not the production Worker named in `wrangler.json`. Set values with `wrangler preview base-config secret put <key> --worker-name <site>-staging` and check with `... secret list --worker-name <site>-staging`. Apply Preview Base changes before creating a new preview; existing previews do not automatically inherit changed secrets. After changing the team domain, rebuild the preview. Never copy Turso/S3 credentials into preview configuration. Selected previews use PR-owned D1/R2 and keep media on the Worker route; standard stages use separate runtime data and public bucket bases.

## Service-token policy and audits

Create a Service Auth policy for the Lighthouse service token, not an ordinary Allow policy. Keep the Client Secret private and store the pair in GitHub. The CI access proxy adds token headers only on requests forwarded to the preview origin. Other media/font origins do not receive them, and Lighthouse does not store them as report settings. The workflow fails closed if the secret appears in audit results.

When service-token secrets are absent, the selected-preview Lighthouse audit is skipped with a warning; this is not a successful audit. The report's localhost HTTP URL represents the proxy hop, so HTTPS-specific findings do not measure the deployed transport. A service-token JWT has no reviewer email and does not authorize CMS admin access.

## Operator verification

1. Open a fresh preview URL in a private browser window and confirm Access requires login.
2. Sign in with an intended trusted identity and confirm the home page and CMS admin/API behavior. Pedro Henri Design may already have core setup completed by the supported protected CI setup path; Bruna follows its native setup path.
3. Confirm staging and production are unaffected by the preview application.
4. If EmDash rejects authentication, compare the audience and normalized team domain with the application configuration without publishing their values.
5. Confirm service-token requests reach public pages instead of an Access login redirect, and that reports contain no credentials.

Preview cleanup removes PR-owned state, not production or staging data. A successful build or local test does not prove live Access policy coverage. Consult the current [Cloudflare Access on Workers documentation](https://developers.cloudflare.com/workers/configuration/cloudflare-access/) when operating the application.
