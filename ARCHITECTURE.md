# Architecture

## Applications and packages

All six websites are Astro server applications deployed to Cloudflare Workers. `brunabraz` and `pedrohenridesign` use EmDash; `bellypao`, `clinicamauricioaraujo`, `transportugal` and `vandallabs` use repository-managed content. Canonical customer domains are independent of project keys and Worker names.

The five workspace packages are private implementation boundaries:

| Package                                    | Owns                                                     | Dependency boundary                                                 |
| ------------------------------------------ | -------------------------------------------------------- | ------------------------------------------------------------------- |
| `@vandal-websites/sun-ui`                  | Headless Astro/Svelte UI and runtime environment helpers | Astro/Svelte ecosystem only; no EmDash dependency                   |
| `@vandal-websites/sun-ui-emdash`           | CMS renderers and content helpers                        | Depends on sun-ui; EmDash is a peer                                 |
| `@vandal-websites/robots-sitemap`          | Request-time robots and route sitemap generation         | No runtime package dependency; sites supply canonical configuration |
| `@vandal-websites/emdash-plugin-analytics` | Analytics administration                                 | EmDash, React and Cloudflare Kumo peers                             |
| `@vandal-websites/emdash-plugin-jmap`      | JMAP email integration                                   | ofetch runtime dependency; EmDash, React and Kumo peers             |

Packages export built `dist` files. Moon tasks build workspace dependencies before consumers. Site-specific presentation stays in the site; sun-ui supplies structure and behavior, not a shared visual theme. CMS sites own their request-time content sitemaps and use shared canonical-host robots behavior.

The image application in [apps/images](apps/images) is a separate Hono service using Bun.Image, with sharp for animated GIF output. It transforms source assets; it does not own website content or replace site storage configuration.

## Asset configuration

Shared runtime helpers live in sun-ui. `s3PublicUrl` uses a nonempty public URL first, otherwise joins a nonempty endpoint and bucket. A partial endpoint/bucket pair is not a public base. `assetUrl` then considers a caller's default before returning a root-relative path.

Each non-CMS Astro config is the sole committed default for `S3_PUBLIC_URL`, pointing at its key under `https://files.vandal.services`. Typed server-env imports carry that build default into asset readers. Runtime overrides retain precedence; the sites remain server-rendered.

Standard CMS deployments read Turso, S3 and encryption configuration at runtime. An omitted public URL derives from endpoint plus bucket; explicitly empty supplied secrets remain invalid. Local Astro dev instead uses SQLite and filesystem media. See [the local guide](docs/guides/emdash-local-development.md).

## Stages and delivery

Staging and production use separate runtime configuration. Infisical owns application runtime secrets; GitHub owns CI credentials and public image-service injection. Selected CMS previews use the preview build flavor, Cloudflare D1/R2 and Access configuration owned by their Preview Base. They do not read staging or production Infisical secrets or use production database/storage bindings. Cleanup removes PR-owned preview resources.

A staging build produces the artifact later promoted to production. Promotion validates its digest and uploads that artifact with production configuration instead of rebuilding. This proves code-artifact continuity, not equality of stage data or credentials. The production Infisical environment slug is `production`.

Fork checks run read-only without deployment or remote-cache credentials. Every release, publishing, deployment and preview-writing job additionally requires the canonical repository and `ENABLE_DEPLOY=true`; reusable workflows enforce the same boundary. Preview Access provisioning and production permissions remain owner responsibilities.

## Rights boundary

MIT covers reusable code. Site copy, identity, data and artwork remain reserved; mixed source files retain both sets of obligations. See [LICENSE](LICENSE), [REUSE.toml](REUSE.toml) and each site's content notice. Public assets are a delivery mechanism, not a grant of reuse rights.
