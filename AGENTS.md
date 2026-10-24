# Agent guidance

## Setup

Use Bun 1.4.2, Node 26.11.1 and Moon 2.6.1, pinned in `.prototools`.

```sh
bun install --frozen-lockfile
moon run bellypao:dev
```

For CMS work, stop the dev server before seeding:

```sh
env -u CI moon run brunabraz:seed pedrohenridesign:seed
env -u CI moon run brunabraz:dev
```

## Testing

- `bun run check` runs format, lint, typecheck, tests, coverage and docs.
- `moon run :build` builds all applications and packages.
- `moon run <key>:test` or `moon run <key>:typecheck` targets a project.
- `bun test scripts` tests root tools.
- `bun run docs` checks documentation, skills and this file with strict agents-md-lint.
- Run package tests through Moon after their dependencies have built.
- Standard builds and checks need no runtime secrets or optional registry skills.

## Project Structure

- `websites` contains six Astro server applications; Bruna Braz and Pedro Henri Design use EmDash.
- `apps/images` is the Hono and Bun.Image service.
- `packages/sun-ui` owns headless UI and runtime asset helpers.
- `packages/sun-ui-emdash` adds CMS integration without coupling base sun-ui to EmDash.
- `packages/robots-sitemap` owns shared indexing behavior.
- `packages/emdash-plugin-analytics` and `packages/emdash-plugin-jmap` are CMS plugins.
- [ARCHITECTURE.md](ARCHITECTURE.md) records boundaries; [CONTEXT.md](CONTEXT.md) defines terms.

## Code Style

- Use arrow functions, `type` rather than `interface`, and one grouped export per file.
- Use `#/*` for a project's own imports and workspace package imports across projects.
- Keep shared package source aliases out of root tsconfig; use Moon project references.
- Use Tailwind v4 CSS configuration; keep customer presentation in its website.
- Fix every caller when an API changes; remove obsolete paths rather than adding shims.
- Keep lint suppressions narrow with a reason. Use straight quotes and plain hyphens in docs.
- `bun run format:fix` and `bun run lint:fix` apply repository-wide changes; review their scope.

## Git Workflow

Use focused branches and Conventional Commit subjects, scoped by project when useful. PR titles follow the same convention. Use the PR template's Summary, Verification and relevant Screenshots sections. Release-please owns versions, changelogs and tags; do not hand-bump versions for unrelated work. Document durable cross-project decisions using [the ADR format](docs/adr/FORMAT.md).

## Boundaries

- Always preserve site content rights and third-party notices; reusable implementation is MIT, not customer copy or artwork.
- Ask before deploying, publishing, changing infrastructure or rewriting shared history.
- Never commit secrets or put them in issues. Follow [SECURITY.md](SECURITY.md) for private reports.
- Keep non-CMS asset defaults in Astro config only. CMS storage uses runtime configuration; previews keep isolated data.
- Preserve the non-fork guard on external-writing jobs.

Local skills are indexed in [.agents/skills/README.md](.agents/skills/README.md). Registry skills are optional and installed with `bun run skills:install`; source/ref updates are deliberate lock changes. For local CMS operation, use [the development guide](docs/guides/emdash-local-development.md).
