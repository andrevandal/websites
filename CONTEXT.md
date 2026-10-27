# Domain terms

- **Website key**: stable machine identifier matching a directory under `websites`: bellypao, brunabraz, clinicamauricioaraujo, gruice, pedrohenridesign, transportugal or vandallabs. It is not a canonical customer domain or a person's name.
- **Canonical host**: the public customer domain used for indexing, sitemap URLs and host-aware robots behavior.
- **Non-CMS site**: a site whose content lives in repository files. Also called a static site here, although its Astro output is a server application.
- **CMS site**: Bruna Braz or Pedro Henri Design, using EmDash for collections, editorial content and media.
- **Stage**: staging or production runtime configuration. Data and credentials are separate from the code artifact.
- **PR preview**: an ephemeral same-repository pull-request deployment. Selected CMS previews have isolated D1/R2 data and preview-only Access protection.
- **Preview Base**: a site's Cloudflare preview foundation that owns preview bindings and audience configuration. It is not a staging or production database.
- **Build flavor**: standard or preview CMS build. Preview changes the integration and bindings, not the customer identity.
- **Promotion**: deploying the digest-verified staging artifact with production configuration, without rebuilding it.
- **Public asset base**: a URL prefix for original media, normally the site's bucket path under `https://files.vandal.services`. Public readability does not grant reuse rights.
- **Runtime reader**: a function reading Worker/environment values for shared helpers. Empty values are treated as unset by runtime resolution.
- **Image service**: the independent application that transforms source images for responsive delivery.
- **Headless UI**: shared structural behavior without a shared customer visual identity.
- **Site content**: copy, data, identity, art and embedded owner material, reserved separately from MIT implementation.
