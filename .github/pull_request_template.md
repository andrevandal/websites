<!--
Title: a Conventional Commit with a scope - feat(web): ..., fix(db): ...
Keep prose brief and skip preambles. Use the domain terms from `CONTEXT.md` when it exists.
Never mention a version or a changelog entry: release-please owns both.
-->

## Summary

<!--
Pick the smallest view that makes the point: a diff-sketch, a call tree, a file tree, pseudocode, or a Mermaid diagram. Link the epic that owns the area (e.g., #42) rather than restating it.
-->

## Evidence

<!--
Paste the command and its outcome. Example:

- bun run check passes
- Before: screenshot or error
- After: screenshot or passing output
-->

**Before:**

**After:**

## Merge danger

**Door:** one-way / two-way

**Blast radius:** one word

<!--
Door: Is this change reversible? One-way doors are hard to reverse (migrations, deletions, published contracts). Two-way doors can be reverted.
Blast radius: What breaks if this is wrong? Name affected services, pages, shared modules. Example: "auth-flow pages (sign-in, reset-password, consent), shared/result.ts"
Explain how it fails if wrong, especially for one-way doors.
-->

## Epic impact

Closes #N

<!--
If this closes an epic, the epic is "merged". If it's a task, the epic stays open until all tasks close.
If this amends an ADR: state which one and link it.
If this amends or creates `CONTEXT.md`: state "glossary" or the term added.
If this changes nothing durable: state "none".
-->
