# ADR format

An Architecture Decision Record lives at `docs/adr/YYYY-MM-DD-<slug>.md`. The date is the day the ADR was created.

An ADR is a standalone decision record: it contains no file paths, links, or citations, and code and docs never cite ADRs; tests and checks enforce the rule it records.

Every ADR in this directory is in force; there is no Status line. To reverse a decision, delete the ADR and write a new one.

## Template

```md
# <Title>

## Context

{The forces at play and why a choice was needed.}

## Decision

{What we do, in plain words.}

## Alternatives rejected

{Each real alternative and why it lost.}

## Consequences

{What follows from the decision, good and bad.}
```

## When a decision earns an ADR

Apply the test in order. The order is what makes two people sorting the same sentence land in the same place.

1. **Is it about a name?** If deleting the sentence would leave a reader unsure what a word means, and it claims nothing about behaviour, it belongs in `CONTEXT.md`. Stop.
2. **Name the rejected alternative.** State the option that was genuinely available and why it lost. If there is none - "there was no other way" - it is not a decision; it is behaviour, and it belongs in an epic constraint.
3. **Is it transversal?** Name what changes if the decision flips. If that spans more than one epic's area, or reaches code no epic owns yet, it is transversal and earns an ADR. Also transversal: a rule a future epic writing about a different area would plausibly need to assert too.
4. Otherwise the decision stays a Constraint in the epic that owns the area.

Step 2 before step 3 is load-bearing. A property forced by reality is observed everywhere but was never chosen, and a reach-first test promotes it wrongly.

Being **hard to reverse** makes an ADR more valuable, but it is not a requirement: ADRs are cheap, and demanding it is how systems end up with one ADR and twelve specs. Lead the body with whatever a future reader would find surprising.

A decision with a real alternative that touches only one epic's area is a Constraint, not an ADR. That covers most decisions. If ADRs here ever outnumber epics by more than a factor of two, the test has gone loose: drop the future-epic clause from step 3 and require the reach to touch two existing epics.

### What qualifies

- **Architectural shape** - "the write model is event-sourced, the read model is projected into Postgres".
- **Integration patterns between contexts** - "these two communicate by domain events, not synchronous HTTP".
- **Technology choices carrying lock-in** - database, message bus, auth provider, deployment target. Not every library: the ones that would take a quarter to swap.
- **Boundary and scope decisions** - "Workspace data is owned by X; others reference it by id only". The explicit no-s are as valuable as the yes-s.
- **Deliberate deviations from the obvious path** - "manual SQL instead of the ORM because ...". These stop the next engineer from "fixing" something intentional.
- **Constraints invisible in the code** - a compliance limit, a partner API's response-time contract.
- **Rejected alternatives whose rejection is non-obvious** - otherwise someone re-proposes them in six months.

## Checks

`bun run docs` fails when an ADR's filename or date is invalid, it has no `# <Title>` heading, it has a `Status:` line, or it runs past 600 words, or any tracked file outside the legacy paths cites an ADR by number.
The template sections are not checked; issue #85 brings the existing ADRs to the template and removes file paths from them.
