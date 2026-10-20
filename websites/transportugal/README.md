# Transportugal Website

Astro one-page marketing site for Transportugal (SP ↔ ES cargo transport).

## Stack

- Astro SSR on Cloudflare Workers + Assets
- Tailwind v4 via `@tailwindcss/vite`
- `@vandal-websites/sun-ui` for shared layout/image primitives
- `astro-iconset` with local SVG icons in `src/icons/`
- Portuguese-only (no i18n split)

## Structure

```text
websites/transportugal/
├── public/
│   └── images/            (hero-bg.png, about.png, partners.png — Figma exports)
├── src/
│   ├── components/
│   │   ├── __tests__/RouteCalculator.utils.test.ts
│   │   ├── ui/
│   │   │   ├── Button.astro
│   │   │   └── Combobox.svelte
│   │   ├── Logo.astro
│   │   ├── MapBrazil.astro
│   │   ├── Navigation.astro
│   │   ├── RouteCalculator.svelte
│   │   └── TheFooter.astro
│   ├── data/site.ts
│   ├── icons/              (48 local SVGs: brand mark, service icons, Brazil map states)
│   ├── layouts/Base.astro
│   ├── pages/index.astro
│   └── styles/global.css
├── astro.config.js
├── moon.yml
├── tsconfig.json
└── wrangler.json
```

## Local development

Run commands from the repository root.

```sh
moon run transportugal:dev
moon run transportugal:check
moon run transportugal:build
moon run transportugal:preview
```

`Navigation.astro` uses the shared `useHeader` hook on `#navigation` and marks
the menu with `data-header-menu`: scrolling updates the header; menu links,
outside clicks, and Escape close the mobile menu. The hook cleans up listeners
and reinitializes after Astro swaps.

The local button delegates markup and external-link behavior to `SunButton`.
WhatsApp links use shared `waLink` with raw messages, encoded once; the home CTA
and footer intentionally retain different contact numbers. One art-directed
hero picture selects desktop/mobile sources with the existing density tiers;
both carousels hydrate when visible.

## Environment variables

Configured in `.env.example`: `IMAGES_BASE_URL` and `S3_PUBLIC_URL`.
Deployed values come from the GitHub environment secret (`IMAGES_BASE_URL`)
and Infisical `/websites/transportugal` (`S3_PUBLIC_URL`), and are read at
request time through `getSecret`. The canonical site URL is the `CANONICAL_SITE_URL`
constant in `astro.config.js`.

## Icons

Local icon SVGs live in `src/icons/` and are loaded by `astro-iconset`
through the local `iconDir` default. Use them through `Icon` by filename:

```astro
<Icon name="whatsapp" width={24} height={24} />
<Icon name="check" width={20} height={20} />
```

`br-*.svg` are the Brazil state-outline SVGs used by `MapBrazil.astro`
to reproduce the coverage-map illustration (SP/ES highlighted) from the
Figma design.

## Design source

Figma file `gXJuYDqXXEc3O5iJuF5TWW` ("Transportugal"):

- Desktop: node `8991:298`
- Mobile: node `8902:145`
- Mobile menu (open): node `8950:480`
- Icon set: node `8941:419`

Content (copy, prices, addresses) is taken verbatim from the Figma
frames per the project's design spec
(`docs/specs/2026-08-29-transportugal-website-design.md`).

## Deployment

Cloudflare Workers, one persistent Worker `transportugal`, like
`vandallabs`/`clinicamauricioaraujo.com.br` (production domain TBD, not yet
provisioned in the Cloudflare dashboard). See `websites/vandallabs/README.md`
for how pull requests get Workers Previews and how releases promote the staging
build.
