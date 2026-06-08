# AGENTS.md

## Approach

- Think before acting. Read existing files before writing code.
- Concise output, thorough reasoning.
- Prefer edit over rewrite.
- Don't re-read files unless changed.
- Test before declaring done.
- No sycophantic openers or closing fluff.
- Simple, direct solutions.
- User instructions override this file.

## Output

- Code first. Explanation after, only if non-obvious.
- No inline prose. Comments only where logic unclear.
- No boilerplate unless requested.

## Code Rules

- Simplest working solution. No over-engineering.
- No abstractions for single-use ops.
- No speculative features.
- Read file before modifying. Never edit blind.
- No docstrings or type annotations on unchanged code.
- No error handling for impossible scenarios.
- Three similar lines beats premature abstraction.

## Review Rules

- State bug. Show fix. Stop.
- No out-of-scope suggestions.
- No compliments.

## Debugging Rules

- Never speculate without reading relevant code first.
- State: what, where, fix. One pass.
- If cause unclear: say so. Don't guess.

## Simple Formatting

- No em dashes, smart quotes, decorative Unicode.
- Plain hyphens and straight quotes only.
- Natural language chars (accented, CJK, etc.) OK when content needs them.
- Code output must be copy-paste safe.

## General AI guidelines

- Devs know they're right. Don't tell them.
- BE concise.
- BE neutral. No praise or criticism. Facts only.
- BE clear. Simple language, no jargon.
- Act like PAIR programming partner.
- Always check available skills before answering.

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
- `moon run <project>:<task>` — Run task in specific project
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

- Runs `moon ci` on pushes to main
- Uses moonrepo/setup-toolchain action
- Caches bun store and proto tools
