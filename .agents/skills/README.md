# Skills

Every skill is a committed directory, `<name>/SKILL.md` plus the reference
files it ships. Nothing fetches a skill at runtime.

## Invoking a skill

Read `.agents/skills/<name>/SKILL.md` and follow it. A harness skill mechanism
that invokes by name reads the same file. Skills reference each other by that
path, never by slash command.

- A **model-invoked** skill keeps a `description`; the agent may fire it.
- A **user-invoked** skill carries `disable-model-invocation: true`; only a
  human asks for it by name.

Where a skill says "delegate to a sub-agent", use your harness's delegation;
without one, do the work inline.

## Local and vendored

- **Local skills** are authored or adapted here and edited freely.
  [`ATTRIBUTION.md`](ATTRIBUTION.md) records each source and local change.
- **Vendored skills** are upstream copies pinned by hash in `skills-lock.json`.
  `bun run skills:update` refreshes them and `bun run docs` fails on a hand
  edit. To change one, adapt a copy into a local skill.

A skill never owns the format of a repo artifact; it points at the file that
does. The ownership table lives in
[`docs/agents/domain.md`](../../docs/agents/domain.md).
When sources disagree, an ADR wins over `AGENTS.md` and the format owners
in `docs/agents/domain.md`, those win over an epic's Constraints, and all of
them win over a skill. A skill that contradicts an ADR is a bug in the skill.


## Delivery flow

`grill-with-docs` -> `to-spec` -> `to-tickets` -> `tdd` -> `code-review` -> `pr`

1. `grill-with-docs` settles the design; terms and ADRs land as they resolve
   (Status Requirement).
2. `to-spec` publishes the epic (Status Design).
3. `to-tickets` publishes the tasks as sub-issues (Status Ready).
4. `tdd` builds one claimed task at a time (Status Build).
5. `code-review` and `pr` take the branch through review (Status Gate).

Board and gh conventions: [`docs/agents/issue-tracker.md`](../../docs/agents/issue-tracker.md).

## Local skills

| Skill | Invoked by | Purpose |
| --- | --- | --- |
| `grilling` | model | Interview in rounds until the design tree is exhausted |
| `grill-with-docs` | user | `grilling` plus `domain-glossary`, so docs land with decisions |
| `domain-glossary` | model | Sharpen `CONTEXT.md` terms and record ADRs |
| `to-spec` | user | Turn the conversation into an epic issue |
| `to-tickets` | user | Break an epic into tracer-bullet tasks |
| `pr` | model | Write a PR body in this repo's conventions |
| `pmi-github-project` | model | Stand up, rebuild, or extend the Lean PMI board |
| `creating-astro-website` | model | Add a client website under `websites/` |
| `blazediff` | model | Capture, check, and rebaseline BlazeDiff visual regression screenshots |
| `image-compare` | model | Compare two image files region by region |

## Vendored skills

| Skill | Purpose |
| --- | --- |
| `code-review` | Review a diff along the standards and spec axes |
| `codebase-design` | Deepen module interfaces and place seams |
| `diagnosing-bugs` | Diagnosis loop for hard bugs and regressions |
| `tdd` | Red-green loop at pre-agreed seams |
