# Belly Pão Website

Astro SSR website deployed to Cloudflare Workers.

## Stack

- Astro SSR on Cloudflare Workers + Assets
- Tailwind CSS v4 via `@tailwindcss/vite`
- `@vandal-websites/sun-ui` for shared layout, images, button structure, header behavior, and WhatsApp links
- Site-owned `Icon.astro` and `public/images/icons.svg` for original brand glyphs
- Svelte 5 integration for isolated interactions that require hydration

## Structure

```text
websites/bellypao/
├── public/favicon.svg
├── src/
│   ├── components/
│   ├── data/
│   ├── layouts/Layout.astro
│   ├── pages/index.astro
│   └── styles/global.css
├── astro.config.js
├── moon.yml
├── tsconfig.json
└── wrangler.json
```

## Local development

Run from repository root:

```sh
moon run bellypao:dev
moon run bellypao:check
moon run bellypao:typecheck
moon run bellypao:build
```

## Configuration

The canonical host is `CANONICAL_SITE_URL` in `astro.config.js`; the Google
Analytics ID is committed in the layout and reported only on that host.
Deploys attach the Worker variables, read at request time through
`getSecret`, so one build serves every Stage:

| Variable          | Source                                              |
| ----------------- | --------------------------------------------------- |
| `IMAGES_BASE_URL` | GitHub environment secret; `apps/images` base URL.  |
| `S3_PUBLIC_URL`   | Infisical `/websites/bellypao`; bucket public base. |

`@vandal-websites/robots-sitemap` serves `/robots.txt` (crawlable only on the
canonical host) and `/sitemap-index.xml`.

## Client-side policy

Start with semantic HTML and CSS. Use `details`, `dialog`, form controls, `:target`, and CSS states before client JavaScript. A short inline script is allowed when native HTML cannot express a required state transition. Add a Svelte island only when a documented interaction needs hydrated, stateful behavior.

`BaseButton` delegates anchor behavior and structure to `SunButton`; local variant
and size classes retain Belly Pão's presentation. HTTP(S) links open in a new tab
with `rel="noopener noreferrer"`. Relative paths, anchors, email links, and phone
links stay in the current tab.

`TheHeader` delegates menu and scroll behavior to shared `useHeader`, keeping the
native checkbox and `.actived` state on its fixed wrapper. All six WhatsApp links
use shared `waLink` with the number stored in `src/data/contact.ts`.

## Assets

Replace the scaffold favicon before release. Put brand images in `public/` or use Astro Image with `IMAGES_BASE_URL`; do not embed unoptimized bitmap data in components.

Hero art direction and head preloads share `src/data/hero.ts`. `SunPicture` uses
the desktop source above 640px and the mobile fallback, preserving eager/high
priority. Shared default density factors generate 13 desktop and 10 mobile
candidates; other pictures retain their explicit `[1, 1.5, 2, 3]` overrides.

Astro's local font provider registers every static Fields weight (200-900) and
Quicksand weight (300-700), with `display: swap`. Layout `Font` components provide
font CSS and preloads; all 13 original WOFF2 files remain in `public/fonts/`.

The original icon sprite stays: the configured shared icon provider has no
matching glyphs for `bread`, `clock`, `map-pin`, `facebook`, `whatsapp`, `phone`,
`truck`, `instagram`, `shop`, or `wheat`. There is no site `src/icons/` collection.

## Deployment

Every Stage is the one Cloudflare Worker `bellypao` (`wrangler.json`):

| Stage        | Deployed as                                                        | KV namespace       |
| ------------ | ------------------------------------------------------------------ | ------------------ |
| Pull request | Workers Preview `pr-<N>` of `bellypao`                             | `bellypao-pr-<N>`  |
| Staging      | Version of `bellypao-staging` at 100%                              | `bellypao-staging` |
| Production   | The same build re-uploaded with production config, at 100% traffic | `bellypao`         |

CI runs `scripts/deploy.ts`: pull requests create and delete the Preview, a push
to `main` builds once and uploads the staging Version, and a release promotes
that build to production without rebuilding.
