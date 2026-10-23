# Optional self-hosted Moon remote cache

## Context

CI checks and image builds repeat workspace compilation. A shared cache can reuse content-addressed results, but builds must also work without cache credentials, including on forks and local machines.

## Decision

Use bazel-remote over HTTP with Basic authentication. Keep the remote block out of committed Moon configuration. CI writes an ephemeral remote block only when MOON_REMOTE_HOST, MOON_REMOTE_HOST_USERNAME and MOON_REMOTE_HOST_PASSWORD are all present. Missing credentials leave the local cache in use rather than failing checks.

The cache credential belongs to the build tool, not application runtime. Deliver it into Docker builds only with a BuildKit secret mount, never a build argument, environment layer or copied credential file. Fork checks receive no cache credentials.

Runner and Docker configuration generation must produce identical remote blocks to share entries. Complete task inputs, including workspace dependencies, are required for valid cross-branch hits.

## Alternatives rejected

A paid cache adds an unnecessary external service. Committing credentials or embedding them in image layers exposes a secret. Requiring remote cache access prevents credential-free checks. A translating authentication proxy adds a service when bazel-remote already supports Basic authentication.

## Consequences

Local machines and forks retain local-only caching. Rotation changes the generated configuration and can invalidate task hashes. Under-declared inputs can cause false cache hits, so command or dependency changes must update inputs. Remote caching is an optional optimization, not a deployment prerequisite or evidence that an application works.
