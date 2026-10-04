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

## Environment variables

Configured in `.env.example`: `IMAGES_BASE_URL`, `PUBLIC_GOOGLE_ANALYTICS_ID`,
`PUBLIC_GOOGLE_ADS_CONVERSION_ID`, `PUBLIC_GOOGLE_ADS_CONVERSION_LABEL`. The
canonical site URL is the `CANONICAL_SITE_URL` constant in `astro.config.js`.

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

Cloudflare Workers, matching the `vandallabs`/`clinicamauricioaraujo.com.br`
naming convention (production domain TBD — not yet provisioned in the
Cloudflare dashboard).

```sh
bun scripts/deploy.ts transportugal --env preview --pr 123 --no-dry-run
bun scripts/deploy.ts transportugal --env staging --no-dry-run
bun scripts/deploy.ts transportugal --env production --no-dry-run
```
