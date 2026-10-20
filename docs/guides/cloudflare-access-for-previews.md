# Protect EmDash Workers Previews with Cloudflare Access

Selected EmDash sites (`pedrohenri`, `brunabraz`) run their PR previews with
native EmDash Access auth: EmDash validates the `Cf-Access-Jwt-Assertion`
header against the team domain and an application audience (AUD). This guide
creates the Access application, the policy and the audience secret, and lets
Lighthouse CI through. CI does none of this for you; see
[CI pipeline](../ci-pipeline.md#selected-emdash-preview-deployment) and the
[provisioning guide](./provision-new-site-and-rotate-secrets.md).

Sources: Cloudflare docs for
[Access on Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/),
[self-hosted applications](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/),
[Workers Previews](https://developers.cloudflare.com/workers/previews/custom-domains/)
and [service tokens](https://developers.cloudflare.com/cloudflare-one/access-controls/service-credentials/service-tokens/).

## Contents

- [One AUD per site or one shared AUD](#one-aud-per-site-or-one-shared-aud)
- [One-time setup](#one-time-setup)
- [Create the reusable policy](#create-the-reusable-policy)
- [Create the application for one site](#create-the-application-for-one-site)
- [Alternative: one application for all previews](#alternative-one-application-for-all-previews)
- [Store the audience](#store-the-audience)
- [Let Lighthouse CI through](#let-lighthouse-ci-through)
- [Verify](#verify)
- [Gotchas](#gotchas)

## One AUD per site or one shared AUD

An Access application has exactly one AUD tag. How many AUDs exist depends on
the application destination.

| Goal                                    | Destination `type`                     | AUDs         |
| --------------------------------------- | -------------------------------------- | ------------ |
| Previews of one site                    | `preview_worker` with that Worker's ID | One per site |
| Previews of every Worker in the account | `all_preview_workers`                  | One in total |
| Production and previews of one site     | `worker`                               | Do not use   |

Use one application per site. EmDash compares the token audience with
`CF_ACCESS_AUDIENCE`, so the Pedro token is rejected by Bruna. A shared
application covers every Worker in the account, including non-EmDash ones, and
anyone admitted for one site reaches all of them. Do not use `worker`:
staging and production keep passkeys and must stay outside Access.

A policy is a separate, reusable object, so one policy can still back every
application.

## One-time setup

1. In Zero Trust, pick a team name under **Settings > General**. The team
   domain is `<team>.cloudflareaccess.com`.
2. Save it as the GitHub secret `CF_ACCESS_TEAM_DOMAIN`. A bare hostname or a
   full URL both work; it is a build-time input only.
3. Add a login method under **Settings > Authentication**. One-time PIN works
   without an identity provider.

## Create the reusable policy

**Access controls > Policies > Add a policy**:

- Name: `Preview reviewers`
- Action: Allow
- Include: Emails (exact addresses) or Emails ending in `@yourdomain`

Keep the list short. The first identity that reaches a fresh preview becomes
its EmDash Admin, so everyone in the list can claim admin on a new preview.

## Create the application for one site

1. **Workers & Pages**, select the Worker, then the **Access** tab.
2. **Protect this Worker behind Access**, choose **Previews only**, pick the
   `Preview reviewers` policy, then **Apply Access**. Never choose **All
   traffic**: it also puts staging and production behind Access.
3. In **Zero Trust > Access controls > Applications**, open the new
   application and copy **Application Audience (AUD) Tag** from the overview.

Worker-level Access covers every route of that Worker's previews, which
includes all of `/_emdash/*`. EmDash validates the token on the API as well as
the admin, so partial path coverage would break it.

## Alternative: one application for all previews

This destination has no per-Worker ID, so use the API (token permission
`Access: Apps and Policies Write`):

```bash
curl "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/access/apps" \
  --request POST \
  --header "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  --json '{
    "type": "self_hosted",
    "name": "All Worker previews",
    "destinations": [{ "type": "all_preview_workers" }],
    "policies": [{ "decision": "allow", "include": [{ "email": { "email": "you@example.com" } }] }]
  }'
```

`result.aud` is the one AUD to use for every site. For a single Worker through
the API use `{"type":"preview_worker","worker_id":"<id>"}`.

## Store the audience

Per site, as a Preview Base secret (never a GitHub secret or Infisical
value):

```bash
bunx wrangler preview base-config secret put CF_ACCESS_AUDIENCE --worker-name pedrohenri
bunx wrangler preview base-config secret put CF_ACCESS_AUDIENCE --worker-name brunabraz
```

Base-config secrets apply only to previews created afterwards. For an open PR,
close and reopen it, or run
`wrangler preview secret put CF_ACCESS_AUDIENCE --name pr-<N> --worker-name <site>`.

## Let Lighthouse CI through

`main.yml` runs Lighthouse CI against the preview URL. Once the preview is
behind Access it would audit the login page, so the workflow sends a service
token instead of a browser login.

1. **Zero Trust > Access controls > Service credentials > Service Tokens >
   Create Service Token.** Name it `lighthouse-ci`, pick a duration, and copy
   the Client ID and Client Secret; the secret is shown once.
2. Add a second policy to each application (or to the shared one):
   - Action: **Service Auth** (not Allow, or Access prompts for a login)
   - Include: Service Token `lighthouse-ci`
3. Add GitHub secrets `CF_ACCESS_CLIENT_ID` and `CF_ACCESS_CLIENT_SECRET`.

For `pedrohenri` and `brunabraz` the workflow does not give the token to
Lighthouse. `scripts/ci/access-proxy.ts` runs on the runner and forwards every
request to the preview with `CF-Access-Client-Id` and `CF-Access-Client-Secret`
added; Lighthouse audits `http://127.0.0.1:8788/`. Without the two secrets the
step logs a warning and skips Lighthouse for those sites.

This keeps the token out of every place it could leak:

- **Other origins.** Lighthouse's own `extraHeaders` setting would put the
  token on every request the page makes, so each origin it loads (images,
  fonts, analytics) would receive it. Here the browser only talks to the proxy
  for the preview's own paths; subresources on other hosts are fetched directly,
  with no credentials. Adding a third-party embed to a preview does not change
  that.
- **The report.** `extraHeaders` is copied into the report's
  `configSettings`, and the report goes to a public `storage.googleapis.com`
  URL that the PR comment links. The token is never a Lighthouse setting, so it
  is not in the report; the step also fails closed if the secret appears
  anywhere in the results.
- **Rotation.** Nothing about a run exposes the token, so it needs rotation
  only on its normal schedule or if the GitHub secret itself leaks.

The proxy sends redirects back through itself, so the audit stays on the proxy.
The report shows `http://127.0.0.1:8788/` as the audited URL, and HTTPS-only
audits (such as "uses HTTPS") reflect the local HTTP hop, not the deployed
site. The token reaches the edge only; EmDash does not authorize `/_emdash/*`
from it, since a service token JWT carries no email. Lighthouse audits public
pages.

## Verify

1. Open `https://pr-<N>-<worker>.<subdomain>.workers.dev` in a private window.
   Access shows its login.
2. After login, `/_emdash/admin` shows the EmDash setup wizard, except for
   `pedrohenri`: CI already ran its setup with the Service Auth token (the same
   `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` secrets), so the dashboard
   opens directly and the first login is Admin. If a CI run failed after core
   setup, the next push re-runs the insert-only extension phase (SEO panels,
   default social image, byline fields) without reseeding or overwriting edits;
   no operator step is needed.
3. A wrong `CF_ACCESS_AUDIENCE` surfaces as an auth error on `/_emdash/*`;
   copy the AUD from the application overview again.
4. `curl -H "CF-Access-Client-Id: $ID" -H "CF-Access-Client-Secret: $SECRET" <preview url>`
   returns the site, not the login redirect.

## Gotchas

- Worker-level Access does not support WebSocket upgrades. EmDash does not use
  them here.
- `X-Robots-Tag: noindex` is added automatically only on `workers.dev` Preview
  URLs, not on custom-domain previews. Access makes the point moot while it is
  on.
- Creating applications through the API needs a token with `Access: Apps and
Policies Write`; creating service tokens needs `Access: Service Tokens
Write`. The deploy token in GitHub needs neither.
- With strict service token authentication on (the default for Zero Trust
  organizations created on or after 2026-10-05), only Service Auth policies
  authorize a request that carries service token headers.
