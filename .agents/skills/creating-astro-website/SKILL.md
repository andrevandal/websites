---
name: creating-astro-website
description: Use when adding a client-facing website under websites/ in the websites monorepo, including Astro SSR, Cloudflare deployment, Tailwind, Sun UI, Svelte, release, or CI wiring.
---

# Creating Astro Websites

Create one Moon application at `websites/<slug>`. Start from current repository conventions, not generic Astro tutorials. The generator creates the integration surface; the site goal owns its design and content.

## Required Sequence

1. Run `.agents/skills/grill-with-docs/SKILL.md` to nail down the site goal, routes, locales, design source, and interactions requiring client state. This grilling becomes the discussion context for the next steps.
2. Run `.agents/skills/to-spec/SKILL.md` to synthesize the discussion into an epic and publish it to the project board.
3. Run `.agents/skills/to-tickets/SKILL.md` to break the epic into tasks. The first task should set up the website scaffolding.
4. When ready to scaffold, from repository root:

   ```sh
   bun run website:new <slug> --title "Client Name"
   bun install
   moon run <slug>:check
   moon run <slug>:typecheck
   moon run <slug>:build
   ```

5. Build the design from Astro components and `@vandal-websites/sun-ui/astro` primitives. Put only site-specific components in `src/components/`; use local SVG icons through `src/icons/` and `astro-iconset`.
6. Verify actual desktop and mobile output against the approved design, then update the generated site README when the delivered behavior differs from the scaffold.

## Generator Contract

`website:new` creates:

| Area | Result |
| --- | --- |
| Site | `websites/<slug>/` with `package.json`, `moon.yml`, strict Astro TS config, Cloudflare SSR config, Wrangler config, `.env.example`, `Layout.astro`, `index.astro`, Tailwind CSS, favicon, and README. |
| Dependencies | Catalog references only. `@vandal-websites/sun-ui` uses `workspace:*`; `@astrojs/svelte` and `svelte` use `catalog:svelte`. Never add direct framework versions. |
| Moon | `layer: application`, `language: astro`, `cloudflare` tag. Shared Astro application task config supplies Wrangler type generation. |
| Deploy | release-please config and manifest, release production matrix, all CI `ENV_VARS_<NAME>` blocks, root README website list, manual-deploy choice. Moon discovers the target automatically. |

Use `bun run website:new <slug> --dry-run` before writing when validating a name or expected registrations. The command rejects an existing `websites/<slug>` or a slug that would share another site's `ENV_VARS_<NAME>` before changing root files. |

## SSR and Assets

Keep `output: "server"`, the Cloudflare adapter, `nodejs_compat`, and the `SESSION` KV binding. Keep `IMAGES_BASE_URL` wired through `SunUIAstroIntegration`; use the shared image service for remote bitmap transforms. `SITE_URL` is the canonical and sitemap base. Do not switch to static output or create a separate Cloudflare Pages project.

Do not create `marketing/<slug>`, `wrangler.toml`, a root workspace entry, a new per-site workflow, or a new Tailwind integration. Existing conventions are `websites/<slug>`, `wrangler.json`, automatic workspace discovery, one deploy matrix, and `@tailwindcss/vite`.

## CSS-First Client Policy

Every generated website includes Svelte tooling and Sun UI's Svelte integration, but starter markup has zero hydrated client code.

Use CSS and native HTML first: semantic links/forms, `details`, `dialog`, checkbox/radio state, `:target`, `:has()`, media queries, transitions, and reduced-motion rules. Use a tiny inline script only when native HTML cannot express a required state transition.

Add a Svelte island only when the design spec names a user-visible stateful interaction that requires hydration, such as a virtualized search combobox, drag interaction, or stateful carousel. Hydrate the smallest island with the narrowest Astro client directive. Do not hydrate a mobile menu, accordion, tabs, theme toggle, or animation that native HTML/CSS can deliver.

## After Cloudflare Domain Provisioning

The generator deliberately does not set a custom domain. After the production domain exists in Cloudflare, add its exact URL to `CUSTOM_DOMAINS` in `scripts/deploy.ts`. Preview workers remain `<slug>-pr-<N>`, staging is `<slug>-staging`, and production is `<slug>`.

## Common Mistakes

| Mistake | Correct action |
| --- | --- |
| Generic Astro scaffold uses `@astrojs/tailwind` | Keep Tailwind v4 through `@tailwindcss/vite`. |
| Hydrate every available Svelte component | Keep tooling installed but add client directives only for documented stateful interaction. |
| New CI workflow or root workspace list edit | Use existing Moon discovery and patch only explicit CI env/manual-deploy lists. |
| Add `wrangler.toml` or Pages deploy | Keep `wrangler.json` and Workers SSR deploy. |
| Add custom-domain mapping before DNS | Wait until Cloudflare domain provisioning completes. |
| Hand-copy dependencies with versions | Use root Bun catalogs or `workspace:*`. |
