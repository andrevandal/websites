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

- **Glossary** - root `CONTEXT.md` defines terms without implementation details. Follow its existing entry format.
- **ADR format, file naming, and the "does this earn an ADR" test** - `docs/adr/FORMAT.md`.
- **Behavior and contribution scope** - describe observable behavior and acceptance criteria in the relevant issue or PR, not the glossary.

Read the existing glossary and ADR format before writing. Record only terms
and decisions that have actually resolved.

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

When a term resolves, add it to root `CONTEXT.md` right there - don't batch.
When a decision resolves, apply the test in `docs/adr/FORMAT.md`. Offer an ADR
for a cross-cutting choice with a genuine rejected alternative; otherwise
record the behavior in the relevant issue or PR. A glossary entry remains a
definition, not an implementation plan.
