---
name: creating-website
description: Use when creating or porting a client-facing website under websites/ in andrevandal/websites, including Astro SSR, shared UI, assets, release registration, and CI wiring.
---

# Creating Websites

Create one Moon application at `websites/<key>`. Reuse current repository
conventions, not a generic Astro scaffold. Read root `AGENTS.md`, `CONTEXT.md`
and the contribution guide before changing registrations.

## Settle the inputs

Use `grill-with-docs` to resolve the goal, routes, locales, canonical customer
domain, design source, content rights and interactions requiring client state.
Use a stable directory/Worker key, not the customer domain. Current keys are
`bellypao`, `brunabraz`, `clinicamauricioaraujo`, `pedrohenridesign`,
`transportugal` and `vandallabs`. Human names and canonical domains do not change
when a key changes. Submit a new-website issue using the repository template.

## Scaffold and register

From the repository root:

```sh
bun run website:new <key> --title "Client Name" --dry-run
bun run website:new <key> --title "Client Name"
bun install
```

Stop if the directory or registration already exists; delete nothing. Inspect
what the generator wrote before adding missing registrations. It creates the
site, package manifest, Moon application, Astro/TypeScript/Wrangler config,
layout, homepage, styles, favicon and README. Its dependencies use Bun catalogs
or `workspace:*`, including `@vandal-websites/sun-ui` and
`@vandal-websites/robots-sitemap`.

The generated canonical URL is `https://<key>`: correct `CANONICAL_SITE_URL` in
`astro.config.js` and the matching `CUSTOM_DOMAINS` entry in `scripts/deploy.ts`
to the actual domain. Keep the package name `@vandal-websites/<key>` and Worker
names `<key>` and `<key>-staging`. Check release-please config/manifest, manual
deploy choices, preview cleanup matrix, released-websites list and root README.
Moon discovers the directory; add its root TypeScript project reference if the
generator has not done so. Do not bump existing site versions.

Keep server output, the Cloudflare adapter, `nodejs_compat`, the `SESSION` KV
binding, `wrangler.json` and `@tailwindcss/vite`. Keep canonical-host-aware
`robotsSitemap()` rather than copying `robots.txt`. Do not add a root workspace
entry, per-site workflow, Pages deployment or alternative Tailwind integration.

Add the site's `CONTENT-LICENSE.md` with the actual holder, reference it from
the site manifest and classify new files in `REUSE.toml`. Reusable implementation
is MIT; copy, data, identity/art and embedded owner material are not. Do not
assume that access to a source repository grants redistribution rights.

## Runtime assets and stage boundaries

Non-CMS sites keep their sole public bucket default in `astro.config.js`:
normalize `process.env.S3_PUBLIC_URL ||= "https://files.vandal.services/<key>"`
and expose it through a server/public `envField.string` schema default. In
request-rendered asset helpers import `S3_PUBLIC_URL` from `astro:env/server`
and pass it to `assetUrl(getSecret, path, S3_PUBLIC_URL)`. `getSecret` alone does
not read schema defaults. Call helpers from request frontmatter, not module
top level.

CMS sites use runtime S3 values and `s3PublicUrl` for the provider's public URL:
explicit `S3_PUBLIC_URL` wins, otherwise both `S3_ENDPOINT` and `S3_BUCKET` are
required. Preserve local SQLite/uploads and isolated preview D1/R2/Access
branches. Non-CMS sites do not need Infisical files. Runtime CMS secrets belong
in Infisical; CI configuration belongs in GitHub. Never commit credentials or
private service endpoints. Public `files.vandal.services` asset URLs are allowed.

Use `runtimeEnv(getSecret, "IMAGES_BASE_URL")` and `buildImageUrl` for transforms,
with raw bucket URLs when the image service is unset. Keep the adapter's
passthrough image-service setting. PRs use isolated preview resources, staging
uses `<key>-staging`, and production promotes the same build with production
configuration. Preserve the non-fork guard.

## Port an existing site

1. Inventory source routes, canonical metadata, analytics, components, assets,
   font filenames/weight/style pairs and their rights. Agree on the clean site
   key and production domain before scaffolding.
2. Scaffold once with one registration owner. Split component work only along
   disjoint file ownership with shared layout and asset-helper contracts.
3. Replace hand-written page shells with `SunLayout` from
   `@vandal-websites/sun-ui/astro`. It supplies language, body defaults,
   Open Graph/Twitter metadata, schema and analytics. Use its `links`, `schema`
   and head slot instead of duplicate tags. Gate analytics to the canonical host.
4. Replace source `getImageUrl`/ipx helpers with the shared asset/transform
   helpers. Preserve bucket-relative keys; use the agreed existing public
   objects, not committed bitmap/font copies or new upload scripts. Keep
   favicon, icon SVGs and other explicitly licensed local assets.
5. For bucket-hosted fonts, render `@font-face` URLs through `fileUrl` in the
   layout; preserve every original weight/style, fallback metrics, CSS variable
   and fallback family. Preload regular variants with `crossorigin` where
   appropriate. Do not give HTTP URLs to Astro's local font provider. Google
   fonts can use the existing Astro font integration.
6. Use the named `SunPicture` export with a full HTTPS source and numeric width
   and height. `class` styles the image; `wrapperClass` styles its wrapper.
   Hero srcsets and preload width arrays must match. Import HTML attribute
   types from `astro/types`, not `astro`.
7. Keep the scaffold's Tailwind imports, typography plugin and shared Sun UI
   source declaration, followed by the source theme/utilities. Remove scaffold
   theme overrides that conflict with the approved design. Keep component
   `@reference` paths valid; pass bucket-backed CSS backgrounds via CSS variables.
8. Preserve routes, structured data and user-visible behavior. Carry only the
   source's needed components; do not preserve obsolete build/deploy tooling.

## CSS-first client policy

Use CSS and semantic native HTML first, including links/forms, `details`,
`dialog`, media queries, transitions and reduced-motion rules. Add a small
script only for a required transition native HTML cannot express. Add a Svelte
island only for a documented stateful interaction requiring hydration, and
hydrate the smallest island with the narrowest client directive.

## Verify and contribute

Run `moon run <key>:check`, `moon run <key>:typecheck`,
`moon run <key>:build` and root `bun run check` after dependencies are ready.
Check desktop/mobile output against the source or approved design. Scroll to
load lazy images; inspect broken images, overflow, fonts, menus, icons and
canonical metadata. Verify bucket URLs and raw-file fallback without an image
service setting. Preserve intentional staging/preview asset overrides.

Update the site README and root website list to describe delivered behavior.
Use the `pr` skill and the repository PR template. Report commands actually run,
missing analytics/content and any unverified visual behavior. Do not publish,
deploy or change infrastructure merely to complete the port.
