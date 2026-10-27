# Gru Ice Website

Single-page Portuguese (pt-BR) website for Gru Ice, an ice factory in Guarulhos. Astro SSR on Cloudflare Workers; canonical host `https://gruice.com.br`.

## Stack

- Astro SSR on Cloudflare Workers + Assets
- Tailwind CSS v4 via `@tailwindcss/vite`
- `@vandal-websites/sun-ui` for shared layout, images, icons and header behavior
- `astro-iconset` with local SVG icons in `src/icons/`
- One Svelte 5 island: `IceCalculator`, hydrated with `client:visible`

## Structure

```text
websites/gruice/
├── public/favicon.svg
├── src/
│   ├── components/   Astro sections plus IceCalculator.svelte
│   ├── data/         contact, products, FAQ, solutions, calculator constants
│   ├── icons/
│   ├── layouts/Layout.astro
│   ├── pages/index.astro
│   ├── styles/global.css
│   └── utils/        image URLs and calculator maths
├── astro.config.js
├── moon.yml
├── tsconfig.json
└── wrangler.json
```

## Page

`/` is the only page. Sections: header and hero, products (`#produtos`),
ice calculator (`#calculadora`), solutions, why us, resellers (`#revendedor`)
and footer.

Interactions use native HTML and CSS. Only the calculator needs JavaScript state.

| Interaction        | Pattern                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| Mobile menu        | Checkbox `#menu-opened` and `label`; `useHeader` closes it on link click and Escape |
| Reseller questions | `<details name="faq">`, one open at a time                                          |
| Product selector   | Radio inputs `name="product"`; labels act as thumbnails and prev/next               |
| "Ler mais" modal   | `<dialog>` opened with `commandfor` and `command="show-modal"`                      |
| Ice calculator     | Svelte island `IceCalculator`, `client:visible`                                     |

## Local development

Run from repository root:

```sh
moon run gruice:dev
moon run gruice:check
moon run gruice:typecheck
moon run gruice:build
```

## Configuration

The site ID is the folder name and the canonical host is `CANONICAL_SITE_URL`
in `astro.config.js`. That config also declares the public server variable
`S3_PUBLIC_URL` with the site's bucket default, preserving nonempty build-time
overrides. This non-CMS site needs no Infisical export or mandatory runtime secret.
Deploys attach Worker variables at request time through `getSecret`, so one build
serves every Stage:

| Variable          | Source                                                                                         |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| `S3_PUBLIC_URL`   | Typed public default from `astro.config.js`; runtime S3 variables can override the asset base. |
| `IMAGES_BASE_URL` | CI-injected public Worker variable.                                                            |

Google Analytics (`G-MV1B5QJVWB`) is committed in the layout and loads only on the canonical host.
`@vandal-websites/robots-sitemap` serves `/robots.txt` (crawlable only on the
canonical host) and `/sitemap-index.xml`.

## Client-side policy

Start with semantic HTML and CSS. Use `details`, `dialog`, form controls, `:target`, and CSS states before client JavaScript. A short inline script is allowed when native HTML cannot express a required state transition. Add a Svelte island only when a documented interaction needs hydrated, stateful behavior.

## Assets

Fonts, bitmaps and videos live in the bucket, never in git. Keys:

- `fonts/ClashDisplay-Regular.woff2`, `fonts/ClashDisplay-Variable.woff2`
- `images/mobile/*.png` and `images/mobile/logo-white.svg`
- `videos/mobile_sessao-gelo-saudavel.mp4`

Resolve keys with `fileUrl` from `src/utils/images.ts`, from component frontmatter only.
For local work, serve a copy of the bucket folder and point the site at it:

```sh
bunx serve@14 --cors -l 8788 .data/bucket/gruice
S3_PUBLIC_URL=http://localhost:8788 moon run gruice:dev
```

## Deployment

Every Stage is the one Cloudflare Worker `gruice` (`wrangler.json`):

| Stage        | Deployed as                                                        | KV namespace     |
| ------------ | ------------------------------------------------------------------ | ---------------- |
| Pull request | Workers Preview `pr-<N>` of `gruice`                               | `gruice-pr-<N>`  |
| Staging      | Version of `gruice-staging` at 100%                                | `gruice-staging` |
| Production   | The same build re-uploaded with production config, at 100% traffic | `gruice`         |

CI runs `scripts/deploy.ts`: pull requests create and delete the Preview, a push
to `main` builds once and uploads the staging Version, and a release promotes
that build to production without rebuilding.
