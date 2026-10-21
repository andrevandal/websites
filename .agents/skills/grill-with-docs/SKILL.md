---
name: grill-with-docs
description: A relentless interview to sharpen a plan or design, which also creates docs (ADR's and glossary) as we go.
disable-model-invocation: true
---

Run two skills together: `grilling` (`.agents/skills/grilling/SKILL.md`) and `domain-glossary` (`.agents/skills/domain-glossary/SKILL.md`). Read both, then interview.

Record resolved terms in root `CONTEXT.md` and architectural decisions under `docs/adr/`, using `docs/adr/FORMAT.md`. When the interview is complete, summarize the agreed change and its verification criteria in the relevant bug, feature or new-website issue. Do not publish an issue or start implementation without the user's agreement.
