# CMS-backed sites serve their own request-time sitemap and robots.txt

## Context

CMS-backed sites run on Workers with database content that changes without a
rebuild, so sitemap and robots responses must be generated for each request.
The shared integration provides host-aware robots handling and a static-route
sitemap. EmDash also ships sitemap and robots handlers, built from collection
URL patterns and either the request host or a per-database Site URL.

EmDash's sitemap cannot place the home entry at the root, lists only collection
entries, does not verify what site routes serve, and ignores canonical
overrides. Two generators with different rules listed a redirect, omitted the
home page, and advertised the serving host.

## Decision

Every site serves one request-time sitemap and one request-time robots.txt,
always naming its canonical host. Sites without a CMS use the shared static
route sitemap and robots generator. CMS-backed sites own the main sitemap,
robots, and per-collection sitemap paths so EmDash injects none of them.

A CMS sitemap includes only published entries whose site routes answer with 200
and whose SEO settings leave them indexable and self-canonical. The home entry
uses the root path, and every URL uses the entry's latest update as its
lastmod. CMS robots output uses the shared generator: canonical hosts allow
crawling, disallow CMS admin and API paths, then append editor-entered rules;
all other hosts are disallowed.

## Alternatives rejected

- Tuning EmDash's sitemap with URL patterns and Site URL cannot serve the home
  page at the root and can list category pages that answer with 404.
- Setting EmDash's public origin to the canonical host binds sign-in and
  passkeys to that host, breaking Preview and staging admin access.
- A pluggable entry provider in the shared integration has one user, while the
  site still needs route files.
- Moving the home page to a root-pattern collection bends the content model.

## Consequences

New CMS routes or collections update the sitemap mapping in the same change.
Per-entry SEO settings come from one query on EmDash's SEO table because public
collection queries omit them; an EmDash upgrade that changes the table fails
typecheck or the sitemap smoke check. EmDash sitemap features such as images,
paging, and hreflang arrive only when deliberately adopted. Editors can add
robots rules but cannot remove generated rules or the non-canonical-host block.
A repository test fails when an EmDash site lacks one of its owned routes.
