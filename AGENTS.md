@../AGENTS.md

# AGENTS.md (main worktree)

Repo-specific mechanics only. Shared workflow, coding rules, and the
goal-hub/spec-driven/TDD conventions live in the imported hub-level
file above (`~/www/websites/AGENTS.md`) — don't re-add them here.

## Toolchain

- **Package Manager**: bun 1.3.14
- **Node.js**: 24.16.0 (managed via proto)
- **Build System**: moonrepo 2.3.4 (moon CLI)
- **TypeScript**: 5.9.3
- **Formatter**: oxfmt
- **Linter**: oxlint
- **Test Runner**: bun test (Jest-compatible, built-in coverage)
- **Release Management**: release-please
- **Git Hooks**: lefthook (pre-commit: format + lint, pre-push: lint + typecheck, commit-msg: commitlint)
- **Commit Convention**: Conventional Commits via @commitlint/config-conventional

## Repository Structure

```
/
├── .moon/
│   ├── workspace.yml      # Project discovery (apps/*, packages/*)
│   ├── toolchains.yml     # Tool configuration (node, bun, typescript)
│   └── tasks/all.yml      # Shared task definitions
├── apps/
├── packages/
│   ├── sun-ui/             # @vandal-websites/sun-ui — Astro UI components for marketing sites
├── docker/                # Dockerfile and docker-compose
├── scripts/               # Kickstart and utility scripts
├── tsconfig.json          # Root config (project references, auto-managed by moon)
├── tsconfig.options.json  # Base compiler options (bun-types + node)
├── tsconfig.packages.json # For packages (emitDeclarationOnly)
└── tsconfig.modules.json  # For apps/modules (noEmit)
```

## Common Commands

- `bun install` — Install dependencies
- `bun sync` — Sync dependencies and TypeScript project references
- `bun check` — Run all quality checks with auto-fix (formatfix, lintfix, typecheck, test)
- `moon run <project>:<task>` — Run task in specific project
- `moon run :build --affected` — Build only affected projects
- `moon run :typecheck` — Type check all projects
- `moon run :lint` — Lint all projects
- `moon run :test` — Run tests (local, with coverage)

## Architecture

### Package Dependency Graph

```
```

### Moonrepo Tasks

Tasks defined in `.moon/tasks/all.yml`, inherited by all projects:

- **Implicit dependencies**: All tasks implicitly depend on `^:build` (builds upstream packages first)
- **Task presets**: Tasks with `preset: server` don't run in CI
- **Test runner**: `bun test --pass-with-no-tests --coverage .` (not vitest)

### TypeScript Configuration

Project references for incremental builds:

- **tsconfig.options.json**: Base options — `bun-types` and `node` in types
- **tsconfig.packages.json**: Library packages (emitDeclarationOnly)
- **tsconfig.modules.json**: Apps (noEmit)

### Moon TypeScript Notes

- Prefer Moon commands for sync/verification: `bun moon sync`, `bun moon run :build`, `bun moon ci :typecheck`, `bun moon ci :testci`.
- Repo uses Moon TypeScript project references with `routeOutDirToCache: true` and `syncProjectReferences: true`.
- Don't add root-level TypeScript `compilerOptions.paths` aliases pointing `@vandal-websites/*` to `packages/*/src/*` unless repo intentionally switches to Moon's `syncProjectReferencesToPaths` workflow.
- Those root `paths` aliases can conflict with Moon's generated declaration outputs in `.moon/cache/types` and break downstream typechecking with TS6305-style errors.

### Conventions

- **Function style**: Function expressions only (`const fn = () => {}`, enforced by oxlint)
- **Type definitions**: `type` over `interface` (enforced by oxlint)
- **Exports**: Prefer one grouped export per file (`const a = ...; const b = ...; export { a, b }`) to avoid `import/group-exports` lint warnings
- **Imports**: Use `workspace:*` protocol for internal deps
- **Commits**: Conventional Commits enforced by commitlint via lefthook
- **Build tool**: tsdown for all library packages
- **Tailwind v4**: CSS-native config via `@theme` blocks, no JS config files

## CI/CD

- `main.yml`'s `check-all` job runs `moon ci` — affected-scoped
  `lint`/`format`/`typecheck`/`test` (all four are `runInCI` tasks in
  `.moon/tasks/all.yml`), on pull requests and pushes to `main`.
- Repo-root files that no moon project owns (`scripts/**`, root `*.ts`,
  `*.md`, `*.json`, `*.yml`, `docs/`, `.github/`, `.moon/`) are checked by an
  explicit always-run oxlint/oxfmt step in the same job.
- Uses moonrepo/setup-toolchain; caches the bun store and proto tools.
- Full pipeline documentation: `docs/ci-pipeline.md`.
