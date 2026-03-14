# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## General AI guidelines

- The developers know they are right. Don't need to tell them.
- BE concise.
- BE neutral. Do not waste time praising or criticizing. Focus on the facts.
- BE clear. Use simple language and avoid jargon.
- You should act like a PAIR programming partner.
- Always check your available skills before answering.

## Project Overview

This is a moonrepo-based TypeScript monorepo managed with bun. Uses proto for tool version management and provides a structured workspace for apps and packages.

## Toolchain

- **Package Manager**: bun 1.3.6
- **Node.js**: 24.12.0 (managed via proto)
- **Build System**: moonrepo (moon CLI 2.0.4)
- **TypeScript**: 5.9.3
- **Formatter**: oxfmt
- **Linter**: oxlint
- **Release Management**: release-please

## Repository Structure

```
/
├── .moon/
│   ├── workspace.yml      # Project discovery (apps/*, packages/*)
│   ├── toolchains.yml     # Tool configuration (node, bun, typescript)
│   └── tasks/all.yml      # Shared task definitions
├── apps/                  # Application projects
├── packages/              # Shared packages/libraries
├── tsconfig.json          # Root config (project references, auto-managed)
├── tsconfig.options.json  # Base compiler options
├── tsconfig.packages.json # For packages (emitDeclarationOnly)
└── tsconfig.modules.json  # For apps/modules (noEmit)
```

## Common Commands

- `bun install` - Install dependencies
- `bun sync` - Sync dependencies and TypeScript project references (run after adding/removing projects)
- `bun check` - Run all quality checks (format, lint, typecheck, test) across all projects
- `moon run <project>:<task>` - Run a task in a specific project
- `moon run :build --affected` - Build only affected projects
- `bun graph` - View task graph
- `bun format` - Check formatting
- `moon run :formatfix` - Fix formatting
- `moon run :lint` - Lint project
- `moon run :lintfix` - Fix linting issues
- `moon run :typecheck` - Type check
- `moon run :test` - Run tests (local, with coverage)
- `moon run :testci` - Run tests in CI mode

## Architecture

### Moonrepo Tasks

Tasks defined in `.moon/tasks/all.yml` and inherited by all projects:

- **Implicit dependencies**: All tasks depend on `^:build` (upstream builds)
- **File groups**: Sources, tests, and typescript configs
- **Task presets**: Tasks with `preset: server` don't run in CI

### TypeScript Configuration

Uses project references for incremental builds:

- **tsconfig.json**: Root config (project references, auto-managed)
- **tsconfig.options.json**: Base compiler options for all projects
- **tsconfig.packages.json**: For packages (emitDeclarationOnly)
- **tsconfig.modules.json**: For apps/modules (noEmit)

Projects extend base configs:

```json
{
  "extends": "../../tsconfig.packages.json",
  "compilerOptions": { "outDir": ".moon/cache/types", "rootDir": "src" }
}
```

### Bun Workspace

Workspace defined in `package.json` workspaces field. Use workspace protocol:

```json
{ "dependencies": { "@org/shared-utils": "workspace:*" } }
```

### Release Management

Uses release-please for changelogs and releases. Configure new packages in:

- `release-please-config.json` - Package paths and release types
- `.release-please-manifest.json` - Current versions

### AWS

Use AWS CLI with [granted](https://github.com/fwdcloudsec/granted) for credential management.

## CI/CD

- Runs `moon ci` on pushes to main
- Uses moonrepo/setup-toolchain action
- Caches bun store and proto tools
