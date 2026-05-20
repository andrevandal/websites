# CLAUDE.md

## Approach

- Think before acting. Read existing files before writing code.
- Be concise in output but thorough in reasoning.
- Prefer editing over rewriting whole files.
- Do not re-read files you have already read unless the file may have changed.
- Test your code before declaring done.
- No sycophantic openers or closing fluff.
- Keep solutions simple and direct.
- User instructions always override this file.

## Output

- Return code first. Explanation after, only if non-obvious.
- No inline prose. Use comments sparingly - only where logic is unclear.
- No boilerplate unless explicitly requested.

## Code Rules

- Simplest working solution. No over-engineering.
- No abstractions for single-use operations.
- No speculative features or "you might also want..."
- Read the file before modifying it. Never edit blind.
- No docstrings or type annotations on code not being changed.
- No error handling for scenarios that cannot happen.
- Three similar lines is better than a premature abstraction.

## Review Rules

- State the bug. Show the fix. Stop.
- No suggestions beyond the scope of the review.
- No compliments on the code before or after the review.

## Debugging Rules

- Never speculate about a bug without reading the relevant code first.
- State what you found, where, and the fix. One pass.
- If cause is unclear: say so. Do not guess.

## Simple Formatting

- No em dashes, smart quotes, or decorative Unicode symbols.
- Plain hyphens and straight quotes only.
- Natural language characters (accented letters, CJK, etc.) are fine when the content requires them.
- Code output must be copy-paste safe.

## General AI guidelines

- The developers know they are right. Don't need to tell them.
- BE concise.
- BE neutral. Do not waste time praising or criticizing. Focus on the facts.
- BE clear. Use simple language and avoid jargon.
- You should act like a PAIR programming partner.
- Always check your available skills before answering.

## Project Overview

websites — a monorepo of client websites, shared packages and an image service built as a moonrepo-based TypeScript monorepo managed with bun. Uses proto for tool version management.

## Toolchain

- **Package Manager**: bun 1.3.6
- **Node.js**: 24.12.0 (managed via proto)
- **Build System**: moonrepo (moon CLI)
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
│   ├── tailwind-config/   # @vandal-websites/tailwind-config — Shared Tailwind v4 theme (CSS)
│   ├── ui/                # @vandal-websites/ui — Base UI component library
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
- `moon run <project>:<task>` — Run a task in a specific project
- `moon run :build --affected` — Build only affected projects
- `moon run :typecheck` — Type check all projects
- `moon run :lint` — Lint all projects
- `moon run :test` — Run tests (local, with coverage)

## Architecture

### Package Dependency Graph

```
packages/ui → @vandal-websites/tailwind-config
```

### Moonrepo Tasks

Tasks defined in `.moon/tasks/all.yml` and inherited by all projects:

- **Implicit dependencies**: All tasks implicitly depend on `^:build` (builds upstream packages first)
- **Task presets**: Tasks with `preset: server` don't run in CI
- **Test runner**: `bun test --pass-with-no-tests --coverage .` (not vitest)

### TypeScript Configuration

Uses project references for incremental builds:

- **tsconfig.options.json**: Base options — `bun-types` and `node` in types
- **tsconfig.packages.json**: For library packages (emitDeclarationOnly)
- **tsconfig.modules.json**: For apps (noEmit)

### Moon TypeScript Notes

- Prefer Moon commands for sync and verification work: `bun moon sync`, `bun moon run :build`, `bun moon ci :typecheck`, and `bun moon ci :testci`.
- This repo uses Moon TypeScript project references with `routeOutDirToCache: true` and `syncProjectReferences: true`.
- Do not add root-level TypeScript `compilerOptions.paths` aliases that point package names like `@vandal-websites/*` to `packages/*/src/*` unless the repo intentionally switches to Moon's `syncProjectReferencesToPaths` workflow.
- With the current setup, those root `paths` aliases can conflict with Moon's generated declaration outputs in `.moon/cache/types` and break downstream typechecking with TS6305-style errors.

### Conventions

- **Function style**: Function expressions only (`const fn = () => {}`, enforced by oxlint)
- **Type definitions**: `type` over `interface` (enforced by oxlint)
- **Exports**: Prefer one grouped export per file (`const a = ...; const b = ...; export { a, b }`) to avoid `import/group-exports` lint warnings
- **Imports**: Use `workspace:*` protocol for internal deps
- **Commits**: Conventional Commits enforced by commitlint via lefthook
- **Build tool**: tsdown for all library packages
- **Tailwind v4**: CSS-native config via `@theme` blocks, no JS config files

## CI/CD

- Runs `moon ci` on pushes to main
- Uses moonrepo/setup-toolchain action
- Caches bun store and proto tools
