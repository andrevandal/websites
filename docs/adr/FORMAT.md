# ADR format

An Architecture Decision Record lives under `docs/adr` with a filename of YYYY-MM-DD-slug.md. The date is the day the record was created.

Each record is a standalone decision, with no file paths, links or numeric citations. Presence in this directory means the decision is in force; omit a Status line. To reverse a decision, replace the old record with one explaining the new choice.

## Template

```md
# Title

## Context

The forces at play and why a choice was needed.

## Decision

The chosen approach, in plain words.

## Alternatives rejected

The real alternatives and why they lost.

## Consequences

What follows, including trade-offs.
```

## When to write a record

Write an ADR when a real choice has durable consequences across package, website or operational boundaries. Explain the rejected alternative so future contributors can understand the trade-off. A name belongs in CONTEXT.md; an observable rule belongs in code and tests; a local implementation detail usually belongs near that implementation.

Keep a record under 600 words. Checks enforce valid dated filenames, an H1 near the start, no Status line and the word cap. Numeric ADR citations are rejected across checked repository text. The sections above are the authoring convention, not a parser-enforced schema.
