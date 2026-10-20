# Keep sun-ui headless and isolate the EmDash layer

## Context

Client sites share UI structure and behavior but have distinct visual identities. Both static and EmDash sites need shared components; CMS integration must not make static sites depend on EmDash. Public CMS media need not pass through a site's Worker.

## Decision

Keep `@vandal-websites/sun-ui` headless: structural CSS only, with no shared colors, spacing, or typography. Sites theme components through class and slot props only, not `--sun-*` variables.

EmDash-aware code belongs in the separate `@vandal-websites/sun-ui-emdash` package, which builds on sun-ui and declares `emdash` as a peer dependency. Base sun-ui never imports `emdash`; static sites use base sun-ui, not the EmDash layer.

Promote components and helpers used by two or more sites into the appropriate shared package. Record single-site candidates in a TODO list rather than promoting them prematurely.

Serve public CMS media directly from the public bucket URL configured by `S3_PUBLIC_URL`, not through the site Worker. Previews keep isolated storage and the Worker media route.

## Alternatives rejected

A shared visual theme or `--sun-*` theme variables would couple independent site designs to a library-owned styling contract.

EmDash integration inside base sun-ui would couple static sites to a CMS they do not use. Keeping shared renderers in each site instead would duplicate behavior and fixes.

Promoting single-site code would add shared APIs without demonstrated reuse. Proxying public media through the Worker would keep an unnecessary hop in the image path; direct public access for previews would discard their storage isolation.

## Consequences

Sites retain visual ownership while shared packages own reusable behavior. The EmDash peer dependency makes the CMS boundary explicit. Sites must supply their own presentation classes, and the separate integration package adds a maintenance boundary. Public media delivery requires public bucket configuration; previews remain a deliberate exception. Single-site candidates stay local until another site needs them.
