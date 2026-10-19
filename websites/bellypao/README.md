# Belly Pão Website

Astro SSR website deployed to Cloudflare Workers.

## Stack

- Astro SSR on Cloudflare Workers + Assets
- Tailwind CSS v4 via `@tailwindcss/vite`
- `@vandal-websites/sun-ui` for shared layout, image, icon, and button primitives
- `astro-iconset` with local SVG icons in `src/icons/`
- Svelte 5 integration for isolated interactions that require hydration

## Structure

```text
websites/bellypao/
├── public/favicon.svg
├── src/
│   ├── components/
│   ├── icons/
│   ├── layouts/Layout.astro
│   ├── pages/index.astro
│   └── styles/global.css
├── astro.config.js
├── config.json
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

`config.json` holds the canonical host and the non-secret variables for each
Stage (`preview`, `staging`, `production`). Deploys attach the Stage's
values to the Worker, and the site reads them at request time through
`getSecret`, so one build serves every Stage.

| Variable                             | Purpose                                            |
| ------------------------------------ | -------------------------------------------------- |
| `IMAGES_BASE_URL`                    | Optional `apps/images` transform-service base URL. |
| `PUBLIC_GOOGLE_ANALYTICS_ID`         | Optional Google Analytics measurement ID.          |
| `PUBLIC_GOOGLE_ADS_CONVERSION_ID`    | Optional Google Ads conversion ID.                 |
| `PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` | Optional Google Ads conversion label.              |
| `ENABLE_PARTYTOWN`                   | Loads Gtag through Partytown only when `true`.     |

List secret names in `secretKeys` and set their values with Wrangler, never in
`config.json`. The `CANONICAL_SITE_URL` constant in `astro.config.js`
matches `canonicalHost`. `@vandal-websites/robots-sitemap` serves `/robots.txt`
(crawlable only on that host) and `/sitemap-index.xml`.

## Client-side policy

Start with semantic HTML and CSS. Use `details`, `dialog`, form controls, `:target`, and CSS states before client JavaScript. A short inline script is allowed when native HTML cannot express a required state transition. Add a Svelte island only when a documented interaction needs hydrated, stateful behavior.

## Assets

Replace the scaffold favicon before release. Put brand images in `public/` or use Astro Image with `IMAGES_BASE_URL`; do not embed unoptimized bitmap data in components.

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
