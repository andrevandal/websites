# Agent guidance

## Project structure

websites is a bun + moon monorepo of client websites and a shared image
service. Tool versions live in `.prototools`.

- `apps/images` - Hono + Bun.Image image service; sharp only for animated GIF output.
- `packages/sun-ui` - Astro + Svelte UI kit for the websites.
- `websites/*` - client Astro sites on Cloudflare. Scaffold one with
  `bun run website:new`.

## Commands

- `bun install` - dependencies; postinstall syncs moon projects.
- `bun run check` - format, lint, typecheck, test, coverage, docs. The single gate.
- `bun run lint:fix` / `bun run format:fix` - apply fixes repo-wide.
- `moon run <project>:<task>` - one project; tasks are `lint`, `format`,
  `typecheck`, `test`, `build`.
- `bun run docs` - docs, skills, and `AGENTS.md` checks.
- `bun test scripts` - tests for root `scripts/`, which no moon project owns.
- `bun run dev <target>` - dev server for an app or website.

CI details: [`docs/ci-pipeline.md`](docs/ci-pipeline.md).

## Testing

Verify at the narrowest scope that covers the change, before yielding: the
file (`bun test <path>`), then the project (`moon run <project>:test`), then
`bun run check`. The pre-push hook and CI run the same gate.

`coverage.config.ts` sets per-project coverage thresholds. Its allowlist only
shrinks; each entry cites the issue that removes it.

## Images

Start a website locally from its example file:

```sh
cp websites/<site>/.env.example websites/<site>/.env
```

It points `IMAGES_BASE_URL` at the staging image service, so pages render the
same markup (`srcset`, `sizes`, placeholders) as deployed Stages. Do not leave
it empty.

The image service (`apps/images`) serves 1x, 1.5x, 2x, 2.5x and 3x from one
bucket original and never upscales. Originals should be at least 3x the widest
CSS width they render at. Do not re-export or resize images to fit; the
service returns the exact size.

After adding or resizing images on any website page, run
`bun scripts/audit-images.ts <url...> -v <viewport widths>` against the dev
server or a preview and report what it flags. It is a local tool, not part of
CI.

## Code style

- Arrow functions only, `type` over `interface`; oxlint enforces both.
- One grouped `export { ... }` per file.
- `#/*` subpath imports for a project's own code, `workspace:*` across
  projects, never a relative path that climbs out of a project.
- Keep root `tsconfig` free of `compilerOptions.paths` aliases to
  `packages/*/src`; they collide with moon's project references (TS6305).
- oxlint + oxfmt cover TS, JS, JSON, and Markdown; eslint + prettier cover
  only `.astro` and `.svelte`.
- Tailwind v4 is configured in CSS `@theme` blocks, never a JS config.
- Plain punctuation in docs: hyphens and straight quotes. `bun run docs`
  enforces it in agent-facing files.

## Branches & commits

1. One worktree per epic, branch `<type>/<issue#>-<slug>`
   ([`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md)).
2. Conventional Commits; commitlint runs at commit-msg. Scope with the project
   (`feat(images): ...`); a repo-wide change needs none.
3. PR titles are Conventional Commits too. The `pr` skill writes the body; it
   says `Closes #<task>`.
4. release-please owns versions, `CHANGELOG.md`, and tags.

## Boundaries

- Ask before any git write that rewrites or deletes history. The agent
  hooks in `scripts/agent-guardrails/` are a tripwire for force-push,
  `reset --hard`, `clean -f`, and `branch -D`, not a boundary; the rule is
  the policy. The pre-push hook rejects non-fast-forward pushes and branch
  deletions.
- Fix the root cause of a lint, type, or test failure; keep suppressions
  narrow and explained.
- Migrate every caller when a shape changes; leave no shim, alias, or
  deprecated path.
- Ask before changing root configs (`.moon/`, `tsconfig*.json`,
  `lefthook.yml`, root `package.json` scripts) or `.github/`.
- Keep secrets out of git; `.env.example` lists every key, with secret values
  omitted and non-secret local defaults (`IMAGES_BASE_URL`) filled in.

## Planning and decisions

Work is planned on GitHub: an epic issue is the spec, its tasks are
sub-issues, and Project #1 is the board. Conventions:
[`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md).

Epics close; durable knowledge moves before they do. Decisions go to
[`docs/adr/`](docs/adr/FORMAT.md), terms to `CONTEXT.md`
([`docs/agents/domain.md`](docs/agents/domain.md)), rules to tests.
`docs/specs/` and `docs/plans/` are legacy, retired by issue #78; read
them for history and add nothing new there.

## Skills

Committed under `.agents/skills/`; the index is
[`.agents/skills/README.md`](.agents/skills/README.md). Use a skill by reading
its `SKILL.md`. The delivery flow is `grill-with-docs` -> `to-spec` ->
`to-tickets` -> `tdd` -> `code-review` -> `pr`. Refresh vendored skills with
`bun run skills:update`.
When sources disagree, an ADR wins over `AGENTS.md` and the format owners
in `docs/agents/domain.md`, those win over an epic's Constraints, and all of
them win over a skill. A skill that contradicts an ADR is a bug in the skill.

## Working style

- Read the relevant code before changing or diagnosing it; when a cause is
  unclear, say so instead of guessing.
- Build the simplest working solution: no speculative features, no
  abstraction for a single use, no error handling for impossible cases.
- Prefer editing to rewriting; test before calling work done.
- In reviews, state the bug, show the fix, stop; no out-of-scope
  suggestions.
- Plain punctuation everywhere: hyphens and straight quotes, no decorative
  Unicode; code output is copy-paste safe.
