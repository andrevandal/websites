# Contributing

Bug reports, feature proposals and new-website requests are welcome through the repository's issue templates. Use [private vulnerability reporting](SECURITY.md) for security problems. Include a minimal reproduction and omit credentials, private customer data and production exports.

## Local workflow

Use the tool versions in `.prototools`, then run from the root:

```sh
bun install --frozen-lockfile
bun run check
moon run :build
```

These checks and standard builds run without deployment secrets. Optional registry skills are not required. Moon builds workspace dependencies before consumers. Use `moon run <key>:test` and `moon run <key>:typecheck` for focused work; root tool tests use `bun test scripts`. For CMS pages, follow [local EmDash development](docs/guides/emdash-local-development.md), which uses local SQLite/uploads instead of remote data.

Use Conventional Commit PR titles. Fill in Summary and Verification, including checks actually run and any limitations. Include screenshots for visual changes. Keep code, tests, callers and relevant docs in the same change; preserve package boundaries described in [ARCHITECTURE.md](ARCHITECTURE.md).

## Rights and submissions

Submit reusable implementation under [MIT](LICENSE), retaining existing notices. Customer copy, identity, artwork, data and embedded owner material are not covered by that grant. A public bucket or repository is not permission to reuse them. Each website's `CONTENT-LICENSE.md` and [REUSE.toml](REUSE.toml) record the boundary; mixed source has both implementation and content obligations.

Only submit content you own or have permission to contribute. Identify its rights holder, permission and any required attribution in the PR. Do not replace content notices or third-party terms with MIT. Update REUSE annotations when adding files; coverage lint does not establish ownership.

Fork PR checks are read-only without runtime, deployment or remote-cache secrets. Forks do not receive previews or deploy. Deployment, release and publishing jobs require the canonical repository; environment protection and secrets are the owner's responsibility.
