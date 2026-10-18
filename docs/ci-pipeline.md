# CI pipeline

How this repo's CI is scoped, cached, and verified. Design rationale:
`docs/specs/2026-08-21-cicd-pipeline-optimization-design.md`.

## Affected scoping

`main.yml`'s `check-all` job runs `moon ci`, which runs the `runInCI` tasks
(`lint`, `format`, `typecheck`, `test`, `coverage` from `.moon/tasks/all.yml`)
only for projects affected by the change, plus their upstream dependencies.
`coverage` enforces `coverage.config.ts` per project against the lcov report
the project's `test` task writes; it never reruns the tests. The run writes
`.moon/cache/ciReport.json`; the `CI report` step prints one `target status`
line per task from it.

Repo-root files are outside every moon project (`.moon/workspace.yml`'s
project globs are `apps/*`, `packages/*`, `websites/*`). The
`Check root files` step covers them explicitly: oxlint over `scripts/`,
`.omp/`, and root-level `*.ts`; oxfmt over `scripts/`, `docs/`, `docker/`,
`.agents/`, `.github/`, `.moon/`, `.omp/`, `.claude/`, `.vscode/`,
root-level `*.ts` / `*.md` / `*.json` / `*.yml`, and the supported hidden
JSON/YAML configs; then `bun run test:scripts`, `bun run docs` (docs, skills,
and `AGENTS.md` checks), and the coverage contract guard. Add new root-level
paths to that step when they appear.

## Selected EmDash preview deployment

The deploy action selects `EMDASH_BUILD_FLAVOR=preview` only for PR previews
of `pedrohenri` and `brunabraz`. Their build and check task inputs track this
flavor and `CF_ACCESS_TEAM_DOMAIN`; the GitHub team-domain secret is injected
only into selected preview builds, never into standard staging/production.
Missing or invalid team domain fails the selected preview build. Staging and
production share the standard Turso/S3 artifact without rebuilding.

Selected previews use native D1/R2 and Access with per-PR `SESSION` KV.
Staging (`main` push) and production (merged release-please PR, or the manual
`deploy-manual.yml` promotion, which runs in the `production` Environment) take
the site's runtime secrets from Infisical (project `INFISICAL_PROJECT_SLUG`,
path `/websites/<site>`, environment `staging` or `production`, OIDC login as the
`INFISICAL_IDENTITY_ID` machine identity). The Infisical action exports them as
masked env vars after the build; `check-secrets` fails the job when a declared
key is missing or empty (it names only the key, never a value) and
`version-upload` passes them to
`wrangler versions upload --secrets-file`. A rotated value takes effect on the
next deployment of that site to that Stage, not on unrelated pushes. Preview
Base and each existing Preview have their own effective settings.
`pedrohenri` previews serve
original images directly: `vars.preview.IMAGES_BASE_URL` is empty.
The runtime audience is supplied manually as `CF_ACCESS_AUDIENCE` on Preview
Base, not as a GitHub build secret; it is a preview-only key and is not part of
the Stage secrets in Infisical. Same-PR redeploys preserve resources and
CMS state; PR close deletes only that Preview and its KV/D1/R2 resources,
purging media before deleting its R2 bucket. Generic previews remain KV-only.
CI does not provision Access policy coverage or create admins; see the
[Access guide](./guides/cloudflare-access-for-previews.md). For `pedrohenri`,
CI applies the core migrations of each database before the code that needs
them gets traffic (`scripts/deploy.ts migrate`: the PR Preview's D1 before
`wrangler preview`, the stage's Turso database from Infisical
before the staging and production Version uploads), and its Worker only checks
(`migrations.runtime: "check"`). Its PR Previews are also set up from CI
(`setupPreview`): the bundled `seed/seed.json` goes through the public
`/_emdash/api/setup` route with the Service Auth token, then
`scripts/seed-extensions.ts` writes the SEO panels, default OG image and
byline fields over D1 and R2. Setup is automatic and resumable: a fresh
preview runs core setup then the extensions; a preview that is already
configured (HTTP 409) skips core setup (content is never reseeded) but still
runs the extension phase, which only inserts what is missing (SEO panels, the
default OG image, byline fields), so a run that failed after core setup is
retried by the next push without overwriting editor changes. The first Access
login to it becomes admin. The step skips with a warning when
`CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` are missing.
Lighthouse CI audits those previews through a local proxy
(`scripts/ci/access-proxy.ts`) that adds the Service Auth token
(`CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`), so the token never reaches
the browser, other origins or the report: the proxy answers `400` to any request
target that could select a different origin, checks the outbound origin before
fetching, and rewrites only same-origin redirects, so external redirects carry
no token. The step skips them with a warning when either secret is missing.
Other sites' Lighthouse runs are unchanged.

Required credentials/scopes, optional remote-cache credentials and protected
native setup prerequisites are documented in the
[provisioning guide](./guides/provision-new-site-and-rotate-secrets.md).

## Remote cache

`bazel-remote` runs as a Coolify service on the VPS
(`docker/bazel-remote.compose.yml`), already deployed and operated
directly on the host — HTTP REST API via Coolify's TLS-terminated
domain, Basic Auth via `--htpasswd_file`.

- Secret `MOON_REMOTE_HOST` — the cache base URL
  (`https://infra.example.invalid`), no trailing slash. Delete it
  to disable the cache everywhere, instantly.
- Secret `MOON_REMOTE_API` — optional; `http` (default when empty or unset)
  or `grpc`. It selects the protocol moon uses against `MOON_REMOTE_HOST`
  and must match that URL's scheme: `https://...` with `http`, or
  `grpc://host:9092` / `grpcs://host:9092` with `grpc`. Changing either
  value invalidates every cached entry once, because both are written into
  the hashed `.moon/workspace.yml`.
- Secrets `BAZEL_REMOTE_BASIC_AUTH_USERNAME` /
  `BAZEL_REMOTE_BASIC_AUTH_PASSWORD` — must match the `.htpasswd` entry
  on the VPS. Set directly in CI by the repo owner; rotating them
  invalidates every cached entry, because the credential is written
  into `.moon/workspace.yml`, which is a hashed input of every task.
- `scripts/ci/write-remote-cache-config.ts` writes the `remote:` block
  into the runner's (or the Docker builder's) ephemeral checkout. The
  block is never committed.
- Cache sized to 5 GiB (`--max_size=5` in the real deployed compose
  file) — eviction under LRU pressure is expected; Phase 5's visibility
  work provides the real hit/miss data to revisit sizing.
- Operator checks: `curl -s -u "$USER:$PASS"
"$MOON_REMOTE_HOST/status"` for size/usage, and a 401 from an
  unauthenticated `/status` to confirm auth is on.

## Verification log

Each phase of the pipeline work is proven in a real CI run before the next
starts. Evidence lives here.

### Phase 1 verification (2026-08-21)

**Step 8: Website-only affected-scoping probe**

Run: https://github.com/andrevandal/websites/actions/runs/32521041445

A `websites/vandallabs/src/pages/index.ts`-only change ran 6 tasks:
`vandallabs:lint`, `vandallabs:format`, `vandallabs:typecheck`, `vandallabs:test`, `sun-ui:build`, `sun-ui:check` —
and no `web`/`images`/`brunabraz`/`clinicamauricioaraujo.com.br` task.

All 6 tasks passed. Check-all wall time: 1m29s.

Probe file correction: used `websites/vandallabs/src/pages/index.ts` (covered by @globs(sources)) instead of
the brief's literal `websites/vandallabs/astro.config.js` to correctly exercise all four moon tasks' affected inputs.

**Step 9: Shared-package downstream fan-out probe — corrected**

Run: https://github.com/andrevandal/websites/actions/runs/32521605093

**Original entry here was false and has been corrected.** The real run
resolved exactly 4 tasks, all from the changed package, and nothing else. No other
consumer's tasks appeared, despite a production `workspace:*` dependency on it.

Root cause (reproduced 5 ways):
moon's relation-based affected checking (which is what `--downstream`
needs to expand a change into a consumer's own tasks) is enabled by
default for query commands (`moon query projects --affected --downstream
deep`, already used for the deploy matrix) but **not** for exec-based
commands like `moon ci` unless `--include-relations` is explicitly
passed. `moon ci`'s own per-task affected check only consults each
task's declared `inputs:` file globs — it does not consult the project
dependency graph at all.

This was a real safety gap, not a cosmetic scoping detail: today's
unscoped CI always runs every project's `typecheck`/`test`, so a
shared-package change that breaks a consumer's usage was always caught.
Affected-scoped `moon ci` would have silently missed this class of
breakage. Fixed: every consumer project's `typecheck`/`test`
now explicitly mirrors its real, production `package.json` workspace
dependencies' source globs into its own task `inputs:`, so moon's
(working) file-based affected detection catches it directly instead of
relying on `--downstream`/`--include-relations` (which has its own
documented moon 2.3.4 correctness bug).

### Phase 2 verification, continued

**Cache-down fallback (Task 7):** verified directly by the repo owner
(flipped `MOON_REMOTE_HOST` to an unreachable address, confirmed
`check-all` still completed green with local execution, restored the
real host) — not run through this session's subagent pipeline, no run
URL captured here. Confirms the documented moon behavior (an
unreachable cache degrades to a cache miss, not a build failure) holds
in this repo's real CI.

### Phase 4 verification (2026-08-21, consolidated container workflow)

**Status:** build-and-push proven for both apps via `container.yml`;
deploy blocked on an external Cloudflare/Coolify issue unrelated to
this consolidation.

**Evidence:**

- `web-container.yml` + `images-container.yml` consolidated into one
  reusable, matrix-driven `container.yml`.
- Web dispatch: https://github.com/andrevandal/websites/actions/runs/32540999519
  — `verify` ✓, `build-and-push` ✓ (pushed
  `ghcr.io/andrevandal/websites/web-app:1.0.1-staging`), `deploy` ✗.
- Images dispatch: https://github.com/andrevandal/websites/actions/runs/32542069839
  — `verify` ✓, `build-and-push` ✓ (pushed
  `ghcr.io/andrevandal/websites/images-app:1.0.0-staging`), `deploy` ✗.
- **Both `deploy` jobs failed identically**: `Coolify webhook returned
HTTP 403`, body is Cloudflare's own bot-challenge page ("Just a
  moment..."). This is a real HTTP request reaching Cloudflare's WAF in
  front of the Coolify webhook, not an early exit from the workflow's
  own "webhook not configured" guard.
- **The original diagnosis in this entry was wrong and is corrected
  here**: it is not a missing-secret problem. `images`' webhook secret
  (`COOLIFY_IMAGES_WEBHOOK`) is genuinely configured in both the
  `staging` and `production` GitHub environments (confirmed via `gh api
repos/andrevandal/websites/environments/staging/secrets`) and its
  dispatch failed with the exact same 403 as `web`'s — ruling out a
  missing-secret explanation. This is an external Cloudflare/Coolify
  configuration issue (the `CF_BYPASS_SECRET` header isn't successfully
  bypassing Cloudflare's challenge for either app), identical to the
  mechanism the old `web-container.yml`/`images-container.yml` also
  relied on — not a regression introduced by this consolidation.
- `COOLIFY_WEB_WEBHOOK` itself: not found in repo-level secrets or the
  `staging`/`production`/`preview` environment secret lists checked via
  `gh api` — likely org-level or otherwise not inspectable with this
  session's access. Irrelevant to the real 403 finding above either
  way, since `images`' correctly-configured secret hit the identical
  wall.
- `web-container.yml` and `images-container.yml` deleted — safe, since
  both had the identical webhook mechanism and would have failed the
  same way if ever dispatched for real.
- PR container-job skip confirmed via this task's own probe run
  (https://github.com/andrevandal/websites/actions/runs/32541508228):
  `Container (${{ matrix.app }})` shows `skipped`, matching the
  no-PR-preview-for-containers decision (commit `e43f179`).

**Next step (needs the repo owner):** check the Cloudflare WAF rule
guarding the Coolify webhook endpoint and the `CF_BYPASS_SECRET` value
it expects — this is Cloudflare/Coolify account configuration, outside
this repo's CI code and outside this session's access.

- **2026-08-24 regression + remediation:** main CI run
  https://github.com/andrevandal/websites/actions/runs/32742403768's
  `Container (web) / build-and-push` job failed after 9m45s with the
  GitHub-hosted runner's own `System.IO.IOException: No space left on
device` while Docker Buildx was still in `Build and push`; this was
  neither an application build error nor the Coolify problem above.
  Commit `0477df3` adds `jlumbroso/free-disk-space@v1.3.1` before
  checkout in `container.yml`'s `build-and-push` job. It removes unused
  Android/.NET/Haskell/large-package toolchains, preinstalled Docker
  images, and swap, but preserves `AGENT_TOOLSDIRECTORY`; the job only
  invokes Docker Buildx, so none of the removed tooling is required.
  Manual staging dispatch
  https://github.com/andrevandal/websites/actions/runs/32748773311
  verified the new path: `verify` ✓, `Free disk space` ✓,
  `build-and-push` ✓ in 15m33s (image pushed), conclusively clearing the
  previous storage failure. That dispatch's `deploy` job then hit the
  same external Cloudflare bot-challenge `HTTP 403` documented above;
  it is a distinct post-push WAF configuration blocker, not a regression
  in the disk-space remediation.
  Follow-up staging dispatch
  https://github.com/andrevandal/websites/actions/runs/32757456866
  proved the disk cleanup works again (`Free disk space` ✓), but surfaced
  a distinct build-context defect before any image build: PR #48's
  `@volar/kit` `patchedDependencies` registration made frozen Bun
  installs require `patches/@volar__kit@2.4.28.patch`; both Dockerfiles'
  dependency stages copied `package.json` and `bun.lock` but not
  `patches/`, so `bun install --frozen-lockfile --ignore-scripts` failed
  with `Couldn't find patch file`. Both `docker/web.Dockerfile` and
  `docker/images.Dockerfile` now `COPY patches ./patches` before that
  install. Local `--target deps` builds verified the exact frozen install
  command succeeds for both images. The next staging dispatch is required
  to prove the complete build/push/deploy path against the corrected
  context.

### Phase 5 verification (2026-08-22, job summary)

**Real CI run (success path):** https://github.com/andrevandal/websites/actions/runs/32542888025 —
`check-all` completed successfully; the "CI report summary" step
(`bun scripts/ci/ci-report-summary.ts`) ran without error.

**Script's real output, verified locally against a freshly-generated
`.moon/cache/ciReport.json` from an actual `moon ci` run on this
commit** (the exact table the job summary renders, reproduced here
since GitHub's rendered job-summary page has no CLI/REST API and this
session has no browser access to read it visually):

```
### moon ci: 45 tasks in 0.23s
| Status | Count |
| --- | --- |
| cached | 45 |
#### Cache
| Result | Count |
| --- | --- |
| Remote hits | 0 |
| Local hits | 45 |
| Misses / executed | 0 |
#### Slowest tasks
| Target | Duration | Status |
| --- | --- | --- |
| `vandallabs:test` | 0.03s | cached |
Estimated saving vs. running everything serially: 96.4%
```

**Failure-path (`if: always()`) claim: not re-verified with a fresh
push in this session.** `if: always()` is standard, well-documented
GitHub Actions behavior independent of this script. A real push of a
deliberately-broken commit to empirically re-confirm this was attempted
and abandoned: the local `pre-push` hook correctly caught the induced
typecheck failure and refused the push, and bypassing that hook to
force a known-bad commit through contradicts this repo's own "never
bypass hooks" rule for a claim that isn't seriously in doubt. The probe
commit was reverted before it left this machine;
the remote branch was never touched by it.

**Correction (final whole-branch review):** this section previously
claimed "Task 12's own test suite already proves the script never
throws (including on a missing/malformed report)" — that claim was
false. The original test suite covered only the missing-report case;
a malformed/truncated report hit an unguarded `JSON.parse` and crashed
with exit code 1, which would have made this `if: always()` step fail
the job on exactly the kind of corrupted input it exists to tolerate.
Fixed: `scripts/ci/ci-report-summary.ts` now wraps parsing/rendering in
a `try`/`catch` that warns and exits 0 on any malformed report; a new
test ("a malformed report never fails the job") covers it. Verified:
`bun test scripts/ci/ci-report-summary.test.ts` → 6 pass, 0 fail.

## Duration and budget

Every `check-all` run writes a summary table (task count, status counts
including `cached-from-remote`, the five slowest tasks, total pipeline
duration) to the job summary via `scripts/ci/ci-report-summary.ts`, parsed
from `.moon/cache/ciReport.json`.

This is the data source for the test-time budget guardrail: a >20%
regression of a project's `test` task against the recorded baseline needs an explicit
justification in the PR. Read the number off the summary table instead of
observing it by hand. Note that a `cached` or `cached-from-remote` row
reports hydration time, not execution time — compare like with like, i.e. a
`passed` row against the `passed` baseline.

### Images Docker workspace (2026-10-13)

`container.yml` runs `moon docker scaffold images` before the build, and
`docker/images.Dockerfile` installs from the generated `.moon/docker/configs`
(workspace manifests and lockfile) instead of a hand-kept `COPY` list. A new
workspace package or website no longer breaks the frozen install (main CI
failure on #182: `Workspace dependency "@vandal-websites/robots-sitemap" not found`).
