# Node-standard subpath imports instead of tsconfig path aliases

Context: a tsconfig `paths` alias (e.g. `@/*`) is a TypeScript-compiler-only
mapping - it does nothing at runtime by itself, so the bundler, the test
runner, and any script executed outside the TS compiler each need their
own separate resolution logic (a Vite plugin, a `tsconfig-paths` register,
etc.) to agree with it. Node's own `imports` field in `package.json` is
resolved natively by the JS runtime (Node and Bun both), no plugin
required, so bundler, test runner, and plain script execution all resolve
the same way automatically.

Decision: internal app-own-code imports use a Node-standard subpath
import (`#/*` maps to `./src/*`), declared in `package.json`'s `imports` field -
this is the real source of truth, resolved natively by Bun/Node and by
Vite (confirmed by an isolated build test with no bundler plugin
present). Workspace package imports (`@vandal-websites/sun-ui`, etc.) are
unaffected - they're real npm package names, not aliases.

One caveat, confirmed empirically, not assumed from TypeScript's docs:
`tsc`'s `moduleResolution: "bundler"` does **not** read `package.json`'s
`imports` field for type-checking, despite bundler mode nominally
supporting it - removing `tsconfig.json`'s `paths` entirely produced 195
`Cannot find module '#/...'` errors. `tsconfig.json` keeps a `"paths":
{ "#/*": ["./src/*"] }` entry as a **required companion for `tsc` only**,
not a second real mechanism - nothing else (Vite, Bun, a bundler plugin)
needs it or reads it.

Consequences:

- One real resolution mechanism (Bun/Node/Vite all read `package.json`
  directly); `tsc` needs a `paths` mirror as a known, documented
  exception, not a second thing to keep in sync by discipline.
- Existing `@/*` imports across the codebase migrate to `#/*` - mechanical but wide.
- Subpath imports must start with `#` (a hard requirement of the spec,
  not a style choice) - can't reuse an arbitrary prefix.

Do:

- Keep exactly one subpath root (`#/*` maps to `./src/*`), not a growing list of
  narrow aliases (`#utils/*`, `#configs`, ...) - one alias is enough for
  one app's internal code.
- Whatever `tsc`'s `moduleResolution` mode, verify with an isolated test
  (remove `tsconfig.json`'s `paths`, run typecheck) rather than trusting
  that the mode's nominal spec support means this TS version honors it -
  `bundler` mode did not.
- Update import-alias documentation in the same change that migrates the imports.

Don't:

- Don't mix `@/*` and `#/*` in the same codebase mid-migration for longer
  than one contained change - pick a cutover point, migrate all of it, not
  file-by-file over time.
- Don't alias workspace packages (`@vandal-websites/*`) through this mechanism -
  those already resolve correctly as real packages; aliasing them adds a
  redundant indirection.
