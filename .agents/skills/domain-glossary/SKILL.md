---
name: domain-glossary
description: Build and sharpen a project's domain glossary and its decision records. Use when challenging codebase terminology, writing or editing `CONTEXT.md`, or recording an ADR.
---

# Domain glossary

Actively build and sharpen the project's domain language as you design. This is
the *active* discipline: challenging terms, inventing edge-case scenarios, and
writing the glossary and the decisions down the moment they crystallise. Merely
*reading* `CONTEXT.md` for vocabulary is not this skill - that is a one-line
habit any skill can do. This skill is for changing the model, not consuming it.

## The formats are not here

This skill owns the *process*, never the artifacts' shape:

- **`CONTEXT.md` layout and entry format** - `docs/agents/domain.md`.
- **ADR format, file naming, and the "does this earn an ADR" test** - `docs/adr/FORMAT.md`.
- **Precedence** - What the system does goes in a spec. A transversal choice,
  as the ordered test in `docs/adr/FORMAT.md`
  defines it, goes in an ADR; any other choice is a Constraint in its spec. A
  term lives in `CONTEXT.md`.

Read the owning doc before you write either file. Create both lazily: only when
there is something real to record.

## During the session

### Challenge against the glossary

When the user uses a term that conflicts with `CONTEXT.md`, call it out at once.
"Your glossary defines 'cancellation' as X, but you seem to mean Y. Which is it?"

### Sharpen fuzzy language

When a term is vague or overloaded, propose a precise canonical one. "You're
saying 'account': do you mean the Customer or the User? Those are different things."

### Discuss concrete scenarios

Stress-test domain relationships with specific scenarios. Invent ones that probe
edge cases and force precision about where one concept stops and the next starts.

### Cross-reference with code

When the user states how something works, check whether the code agrees. Surface
any contradiction: "Your code cancels whole Orders, but you just said partial
cancellation is possible. Which is right?"

### Write it down inline

When a term resolves, add it to `CONTEXT.md` right there - don't batch. When a
decision resolves, run the ordered test in `docs/adr/FORMAT.md` step by step: a
name goes to `CONTEXT.md`; with no rejected alternative it is behaviour in the
owning spec; if it is transversal (including code no spec owns yet), offer an
ADR; otherwise make it a Constraint in the owning spec.
