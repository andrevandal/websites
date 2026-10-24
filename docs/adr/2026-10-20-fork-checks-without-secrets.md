# Keep fork checks read-only and credential-free

## Context

Public contributions need useful validation without granting untrusted pull-request code access to infrastructure or release credentials.

## Decision

Run fork checks with read-only permissions and no Infisical, Cloudflare or remote-cache credentials. Cache configuration falls back to local operation when credentials are absent. Fork pull requests do not create previews or deploy.

Every deployment, publishing, preview creation or cleanup, release creation and release-comment job requires a non-fork repository, in addition to its existing conditions. Reusable workflows enforce the guard themselves.

The pull-request-title workflow may inspect metadata through its target event, but never checks out or executes pull-request code.

## Alternatives rejected

Giving fork jobs secrets exposes them to arbitrary code. Relying only on caller guards leaves reusable workflows unsafe when invoked elsewhere. Automatically enabling previews on public forks creates infrastructure and data risks before review.

## Consequences

Maintainers can review contributions using checks before authorizing external effects. Local checks and builds must stay usable without secrets. The repository owner controls operational enablement separately from merging code. Static inspection of guards does not prove live credentials or provider permissions.
