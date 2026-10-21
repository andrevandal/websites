# Isolate stage and preview data

## Context

The same website code runs against editorial data, uploads and authentication settings that must not leak between production, staging and pull requests.

## Decision

Keep staging and production runtime secrets, databases and storage separate. Build the standard artifact once in staging and promote the digest-verified artifact with production configuration, without rebuilding.

Selected CMS pull-request previews use a distinct preview build flavor with PR-owned D1, R2 and session resources. They never read production or staging application secrets. Preview media uses the Worker route rather than a production public bucket. Local CMS development uses SQLite and filesystem uploads.

Redeploying the same preview preserves its resources and edits. Closing the pull request cleans up only that preview and its named resources.

## Alternatives rejected

Sharing a production database or bucket makes preview experiments affect live data. Rebuilding during promotion permits different code artifacts between stages. Treating local development as a production integration test requires credentials and obscures its actual provider boundary.

## Consequences

Preview state is disposable and must not contain the only copy of editorial work. Staging and production may serve different content despite identical artifacts. Local page checks prove local providers only; live production integrations require separate owner verification.
