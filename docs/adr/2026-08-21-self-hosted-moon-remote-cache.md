# Self-hosted moon remote cache (bazel-remote) with Basic Auth injected at CI time

Context: `check-all` builds the shared packages
natively, and the images Dockerfile's builder rebuilds the same packages
from source minutes later in the same commit - no cache is shared
between them. Moon supports a Bazel-REAPI-v2 remote cache (the `remote:`
block of moon's workspace config), and the constraint for this repo is
self-hosted, not a paid provider.

Decision:

- `bazel-remote` runs as a Coolify service on the existing VPS, already
  deployed and operated directly on the host (not applied by CI) -
  reachable at `https://infra.example.invalid/` over HTTP,
  behind Coolify's own TLS termination, with bazel-remote's native
  `--htpasswd_file` Basic Auth. bazel-remote has no bearer/API-key mode;
  Basic Auth is its documented auth surface, so no translating proxy is
  introduced. A committed compose file documents the real deployed
  shape (image `buchgr/bazel-remote-cache:latest`, `--max_size=5` GiB,
  gRPC port 9092 also published but unused - moon is configured with
  `api: http` against the HTTPS domain, not the gRPC listener).
- Moon's workspace config never commits a `remote:` block. Moon's
  env-var overrides cover `host` and `api` but there is no override for
  `remote.auth.headers` (only `MOON_REMOTE_AUTH_TOKEN`, which is
  Bearer-shaped). The credential is genuinely Basic, so a CI script
  writes the whole `remote:` block into the ephemeral checkout
  immediately before moon runs - on the CI runner and inside the Docker
  builder stage, never committed, never pushed.
- The GitHub Actions secrets (`BAZEL_REMOTE_BASIC_AUTH_USERNAME`/
  `BAZEL_REMOTE_BASIC_AUTH_PASSWORD`) and `MOON_REMOTE_HOST`
  are set directly in CI by the repo owner, matching
  the `.htpasswd` entry created directly on the VPS - neither this repo
  nor this ADR's author ever handled the raw credential.
- Build-time delivery of that credential to `docker build` is a BuildKit
  `RUN --mount=type=secret` only. Never `--build-arg`, never `ENV`,
  never a `COPY`ed file.

Boundary against the runtime-only server secrets decision: that
decision says not to plumb secrets into `docker build` to satisfy a
build-time demand for an _application runtime_ secret - the fix there
was removing the demand, and that still holds (`docker build` for both
images needs zero application secrets). The cache credential is a
different class: it is consumed by the build tool itself, it is never
read by application code, the resulting image contains no trace of it
(the secret is a tmpfs mount, not a layer), and its absence degrades to
a cache miss rather than a build failure. Both rules share one root
principle - no secret is ever baked into an image.

Consequences:

- One credential is shared by every branch and PR, and moon's cache
  hashes are content-addressed rather than branch-scoped, so an
  under-declared task input becomes a cross-branch false-cache-hit.
  Input completeness is therefore audited as part of adopting the
  cache (including the mirrored workspace-dependency inputs), and
  re-audited whenever a task's command or dependency set changes.
- Moon's workspace config is an implicit input of every moon task (moon
  injects every config file in its own directory), so the mutated
  file's bytes are part of every hash. CI and the Docker build must
  write byte-identical blocks to share entries; the script prints the
  file's sha256 so both sides can be compared. Rotating the password
  invalidates the entire cache - a known, acceptable cost.
- Local machines without the secrets never mutate the file, so they
  keep their own local-only cache and never dial the VPS.
- The cache is sized to 5 GiB (`--max_size=5`) - small relative to a
  monorepo's full dependency tree, so eviction under LRU pressure is
  expected; this trades some hit rate for the cost/complexity of
  running a bigger volume on the shared VPS. Revisit the size if hit
  rate proves too low in practice (the CI summary's cache hit/miss
  counts give the real data to decide with).
- If the cache proves unreliable, deleting the `MOON_REMOTE_HOST`
  secret disables it everywhere with no code change, and reverting
  the cache work leaves the affected-scoping fully standing.
