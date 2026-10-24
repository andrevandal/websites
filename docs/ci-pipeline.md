# CI pipeline

## Checks and affected projects

Main CI runs on pushes and pull requests to `main`, and on manual dispatch. Its check job has read-only repository permissions. It installs the pinned toolchain/dependencies, validates release configuration, checks root scripts/config/docs, runs root tests and documentation checks, then executes affected Moon lint, format, typecheck, test and coverage tasks. Moon's dependency graph includes all six websites, five packages and the image application; image deployment is routed separately from websites.

Local equivalents are `bun run check` and `moon run :build`. Standard builds and checks require no runtime secrets or optional registry skills. CI affected scoping is an optimization, not permission to omit local coverage of affected callers.

## External-write boundary

Every deployment, image publication, preview creation/cleanup, release creation and release-comment job requires:

```text
github.event.repository.fork == false
```

This is conjoined with existing event, affected-project, success and same-repository PR conditions. Reusable image workflows enforce the guard themselves. Repository code does not grant deployment approval; GitHub environment protection rules and secrets remain the owner's gate.

Fork PR checks run read-only without Infisical, Cloudflare or remote-cache credentials and never receive previews or deployments. The `pull_request_target` title workflow only validates metadata and never checks out or executes PR code; its explicitly scoped metadata permissions do not authorize running a fork's application code.

## Optional remote cache

A trusted check job configures Moon's remote cache only when all required values are available: `MOON_REMOTE_HOST`, `MOON_REMOTE_HOST_USERNAME` and `MOON_REMOTE_HOST_PASSWORD`. The protocol follows the host scheme: `grpc(s)://` selects gRPC, anything else HTTP. Missing credentials leave local execution/cache working. The remote block is generated in the ephemeral checkout, never committed. Fork checks receive none of these credentials.

Remote cache credentials belong to CI tooling, not applications. Docker delivery uses the existing BuildKit secret interface; the image Dockerfile does not consume application secrets. Keep task inputs complete so cached outputs remain valid across branches.

## Website staging and production

An eligible main push builds each affected website once, validates its stage configuration, records a digest and saves the artifact for production. CMS core migrations run before the new version is uploaded. Staging deployment uses the staging environment and configuration.

Only `brunabraz` and `pedrohenridesign` fetch runtime secret files from Infisical. Their seven database/S3/encryption core keys are mandatory; `S3_PUBLIC_URL` can derive from endpoint and bucket when absent. Explicitly empty supplied values still fail. Non-CMS targets skip Infisical and accept an empty secret file; their committed public asset defaults live only in Astro config. Public `IMAGES_BASE_URL` injection remains separate.

Production promotion waits for successful Main CI at the requested commit, downloads the saved staging artifact and verifies its digest. It applies production CMS migrations when applicable, uploads a production-configured version and routes production traffic to it. It never rebuilds the website. Infisical's production environment slug is `production`; stage-specific runtime values are not baked into the artifact.

The manual workflow deploys a website to staging by building the dispatched ref directly, without running Main CI checks. For production it promotes a Main CI staging artifact and requires that artifact's commit SHA. Image deployment uses the reusable container workflow instead.

## Selected EmDash preview deployment

Only same-repository PRs can create previews. `brunabraz` and `pedrohenridesign` build the preview flavor with native Access integration and PR-specific D1, R2 and session resources. They read no standard-stage Infisical secrets. Redeploys preserve the same preview's data; PR cleanup deletes only that preview and its resources, including media before removing its R2 bucket. Other websites use their standard non-CMS content and public asset defaults.

Preview Access policies and applications are operator-owned. GitHub supplies the team-domain build input; Cloudflare Preview Base owns the per-site audience. Never copy production Turso/S3 credentials into Preview Base. Preview CMS media stays on the Worker media route rather than the production public bucket. See [Access setup and verification](guides/cloudflare-access-for-previews.md).

Lighthouse runs against the deployed preview. Protected CMS previews use a local service-token proxy so credentials are absent from browser settings, third-party requests and reports. Missing service-token secrets skip that audit with a warning, not a green audit result. The workflow checks audit results for leaked secrets before uploading. Release PRs link existing staging URLs rather than building redundant previews; the account subdomain comes from `CLOUDFLARE_WORKERS_SUBDOMAIN`.

## Image publishing and releases

The container workflow checks the image app on manual dispatch, scaffolds its Moon Docker workspace, builds and publishes the `images-app` image, and triggers the configured deployment integration for the chosen environment. Publish/deploy jobs are guarded in the reusable workflow, not only its callers. No private service endpoint is committed in these docs.

Release-please maintains component versions, changelogs and tags. The root uses unprefixed version tags; website components match their keys and the image component is `images-app`. The grouping script keeps a merged PR's main changelog entry and nests its branch entries beneath it, preserving descriptions instead of listing them twice at the same level. Released websites promote their staging artifacts; an image release dispatches the container workflow.

## Evidence and operation

Local checks prove code behavior under their exercised providers. They do not prove live OIDC subjects, Access policy coverage, production CMS storage, remote permissions or deployed customer domains. Record actual invocations and browser results rather than inferring those integrations from a successful build. Runtime ownership and local-provider details are in [the configuration guide](guides/provision-new-site-and-rotate-secrets.md) and [local EmDash development](guides/emdash-local-development.md).
