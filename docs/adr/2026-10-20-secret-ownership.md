# Separate runtime, CI and preview secret ownership

## Context

Application runtime, build automation and ephemeral preview authentication need different credentials and lifecycles. Mixing them widens access and creates stale configuration.

## Decision

Infisical owns standard CMS runtime secrets, read from the website path in staging or production. GitHub owns CI credentials, public image-service injection, remote-cache credentials and the Access team-domain build input. Cloudflare Preview Base owns preview-only secrets, including the Access audience.

Non-CMS sites need no mandatory asset secrets. CMS storage requires its core database, S3 and encryption values; an omitted public URL derives from endpoint and bucket. Supplied empty runtime values fail validation rather than inheriting stale Worker values. Preview-only audience values never upload to standard stages.

Use repository-bound OIDC and the job environment for Infisical access. Never embed runtime or cache credentials in an artifact.

## Alternatives rejected

One secret store for every lifecycle makes pull-request previews depend on production credentials. Hand-editing standard Worker secrets competes with the next version upload. Making public bucket URLs mandatory secrets adds access requirements without protecting sensitive information.

## Consequences

Rotations happen in the owning service and reach runtime through the next relevant deployment. Removing a stored key does not necessarily remove an existing Worker binding, so owner cutovers inspect actual deployed state. Preview Access policy, application coverage and audience correctness remain operator responsibilities.
