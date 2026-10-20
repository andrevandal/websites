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

`src/lib/whatsapp.ts` holds only the site's WhatsApp number (`WA_NUMBER`).
`Modes.astro` and `WhatsAppCta.astro` build links with `waLink` from
`@vandal-websites/sun-ui`, passing that number and raw English or Portuguese messages
from `src/lib/i18n.ts`.

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

Configured in `.env.example`: `IMAGES_BASE_URL` and `S3_PUBLIC_URL`.
Deployed values come from the GitHub environment secret (`IMAGES_BASE_URL`)
and Infisical `/websites/vandallabs` (`S3_PUBLIC_URL` and any runtime secret),
and are read at request time through `getSecret`.

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

CI runs the root deploy script; production is the `vandallabs` Worker, staging `vandallabs-staging`:

```sh
# pull request: Workers Preview pr-123
bun scripts/deploy.ts preview vandallabs --pr 123
bun scripts/deploy.ts cleanup vandallabs --pr 123
# push to main: staging Version of vandallabs-staging, then all traffic
bun scripts/deploy.ts version-upload vandallabs --stage staging --artifact-dir websites/vandallabs/dist
bun scripts/deploy.ts version-deploy vandallabs --stage staging --version-id <uuid>
# release: same build, production config, then all traffic
bun scripts/deploy.ts version-upload vandallabs --stage production --artifact-dir <restored dist>
bun scripts/deploy.ts version-deploy vandallabs --stage production --version-id <uuid>
```

| Stage      | Deployed as                                                     | KV namespace         |
| ---------- | --------------------------------------------------------------- | -------------------- |
| PR preview | Workers Preview `pr-<N>` of `vandallabs`                        | `vandallabs-pr-<N>`  |
| Staging    | Version of `vandallabs-staging` at 100% traffic                 | `vandallabs-staging` |
| Production | A production-configured Version of `vandallabs` at 100% traffic | `vandallabs`         |

Staging is its own Worker, `vandallabs-staging`
(`vandallabs-staging.<subdomain>.workers.dev`); main CI uploads the build there
and deploys it at 100%. A release re-uploads the identical staging build with
production config to the `vandallabs` Worker and deploys that new Version. It
never deploys the staging Version itself and never rebuilds.
A Preview gets its own `SESSION` namespace because Workers Previews do not
provision KV. Staging has its own namespace (`vandallabs-staging`).

Manual website deploys (`deploy-manual.yml`) only promote an existing Main CI
build (`artifact-sha`) to production. Previews are created only from
same-repository pull request CI and deleted, with their namespace, when the PR
closes.
