# Vandal Labs Website

Astro link-in-bio website for Vandal Labs.

## Stack

- Astro SSR on Cloudflare Workers + Assets
- Tailwind v4 via `@tailwindcss/vite`
- `@vandal-websites/sun-ui` for shared layout, button, icon, and image primitives
- `astro-iconset` with local SVG icons in `src/icons/`
- Astro i18n for English and Portuguese routes

## Structure

```text
websites/vandallabs/
├── public/
│   ├── cover.png
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── og-image.png
│   └── whatsapp-profile.png
├── src/
│   ├── components/link-in-bio/
│   │   ├── BackgroundGrid.astro
│   │   ├── BrandMark.astro
│   │   ├── Hero.astro
│   │   ├── Modes.astro
│   │   ├── Page.astro
│   │   ├── SiteFooter.astro
│   │   ├── SiteHeader.astro
│   │   └── WhatsAppCta.astro
│   ├── icons/
│   │   ├── arrow-right.svg
│   │   └── whatsapp.svg
│   ├── layouts/Layout.astro
│   ├── lib/
│   │   ├── i18n.ts
│   │   └── whatsapp.ts
│   ├── pages/
│   │   ├── index.astro
│   │   └── pt/index.astro
│   └── styles/global.css
├── astro.config.js
├── moon.yml
├── tsconfig.json
└── wrangler.json
```

## Local development

Run commands from the repository root.

```sh
moon run vandallabs:dev
moon run vandallabs:check
moon run vandallabs:build
moon run vandallabs:preview
```

The dev server defaults to Astro's local port. If another server is already running, Astro may reuse or report the active process.

## Environment variables

Configured in `.env.example`:

| Variable                             | Purpose                                   |
| ------------------------------------ | ----------------------------------------- |
| `PUBLIC_GOOGLE_ANALYTICS_ID`         | Optional Google Analytics measurement id. |
| `PUBLIC_GOOGLE_ADS_CONVERSION_ID`    | Optional Google Ads conversion id.        |
| `PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` | Optional Google Ads conversion label.     |

CI reads the non-secret values from `config.json` for the requested Stage before
the build. The same values are written to the deployed Worker's `wrangler.json`
`vars`. Store a sensitive value only on the Worker with `wrangler secret put`;
do not add it to `config.json`.

## Icons

Local icon SVGs live in `src/icons/` and are loaded by `astro-iconset` through the shared Sun UI Astro integration. Use them through `SunIcon` by filename:

```astro
<SunIcon name="whatsapp" width={24} height={24} />
<SunIcon name="arrow-right" width={18} height={18} />
```

Keep SVGs simple, `viewBox`-based, and `currentColor`-driven unless the icon intentionally needs fixed brand colors.

## Brand mark

`src/components/link-in-bio/BrandMark.astro` is the single source for the severed-square mark used by:

- header logo
- footer mark
- background watermark

Pass a unique `id` per instance so SVG mask/filter ids do not collide in the DOM.

## Social assets

Static brand assets live in `public/`:

- `og-image.png` - 1200x630 Open Graph / Twitter card image
- `cover.png` - 1500x500 generic social cover/banner
- `whatsapp-profile.png` - 500x500 WhatsApp Business profile image

`src/layouts/Layout.astro` defaults `og:image` and `twitter:image` to `/og-image.png` and resolves it to an absolute URL.

## Deployment

Cloudflare custom domains are managed in the Cloudflare dashboard, not in `wrangler.json`.

`wrangler.json` only carries stable Worker build settings:

- worker base name: `vandallabs`
- compatibility flags/date
- static assets directory

The root deploy script provisions KV namespaces and deploys Workers by name:

```sh
bun scripts/deploy.ts vandallabs --env preview --pr 123 --no-dry-run
bun scripts/deploy.ts vandallabs --env staging --no-dry-run
bun scripts/deploy.ts vandallabs --env production --no-dry-run
bun scripts/deploy.ts cleanup vandallabs --pr 123 --no-dry-run
```

Naming convention:

| Environment | Worker and KV namespace name |
| ----------- | ---------------------------- |
| PR preview  | `vandallabs-pr-<PR_NUMBER>`  |
| Staging     | `vandallabs-staging`         |
| Production  | `vandallabs`                 |

All deployments bind the Cloudflare KV namespace as `SESSION`. The namespace resource itself is separated by Worker name, not by binding name.

Manual deploys support only `staging` and `production`. PR previews are created only from pull request CI and cleaned up when the PR closes.
