# Skills

## Local skills

These five skills are authored or adapted in this repository and committed here.
Read `.agents/skills/<name>/SKILL.md` when invoking one. A harness may expose the
same file by name; without delegation support, do its work inline.

| Skill | Invoked by | Purpose |
| --- | --- | --- |
| `creating-website` | model | Create or port a website under `websites/` |
| `grilling` | model | Resolve a design's open decisions in interview rounds |
| `grill-with-docs` | user | Combine grilling with glossary and decision records |
| `domain-glossary` | model | Refine root `CONTEXT.md` and record architectural decisions |
| `pr` | model | Write a PR using the repository's contribution template |

Original authors and license notices are recorded in
[ATTRIBUTION.md](../../ATTRIBUTION.md). Repository-specific adaptations are
maintained here. Root [AGENTS.md](../../AGENTS.md) supplies working conventions,
[CONTEXT.md](../../CONTEXT.md) defines domain terms, and
[docs/adr/FORMAT.md](../../docs/adr/FORMAT.md) defines decision records. Skills
follow those documents instead of defining another artifact format.

## Optional registry skills

`skills-lock.json` records immutable upstream refs and content hashes. Registry
skill directories are gitignored, not vendored. A cold clone can run ordinary
checks without installing them.

| Skill | Upstream | Purpose |
| --- | --- | --- |
| `code-review` | Matt Pocock | Review correctness and maintainability |
| `codebase-design` | Matt Pocock | Improve module interfaces and boundaries |
| `diagnosing-bugs` | Matt Pocock | Investigate bugs before proposing changes |
| `tdd` | Matt Pocock | Develop behavior through red-green tests |
| `moon` | hyperb1iss | Work with Moon tasks and workspace configuration |
| `proto` | hyperb1iss | Manage pinned tools with proto |
| `debug-task` | moonrepo | Diagnose Moon task execution |

Run `bun run skills:install` to restore the pinned optional skills with
`skills@1.7.4` and validate them. If present, their frontmatter and entire folder
hash must match the lock; edits fail `bun run docs`. Installation does not update
sources or refs. Use `bun run skills:update` only for a deliberate upstream
update, then review its source, full commit ref, content hash and upstream terms.
Do not commit installed registry directories or relabel their license as MIT.
