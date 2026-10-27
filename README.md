# Websites

Six client websites, five shared packages and an image service, maintained with Bun and Moon. Contributions are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

## Install

Install the versions pinned in `.prototools`: Bun **1.4.2**, Node **26.11.1** and Moon **2.6.1**. From the repository root:

```sh
bun install --frozen-lockfile
```

Installation synchronizes Moon projects. Local checks and standard builds do not require deployment credentials or optional registry skills. Only the current tip is promised to build; historical tags label earlier repository states, not a supported build matrix.

## Repository map

### Websites

- **`websites/bellypao`** - Belly Pão bakery website.
- **`websites/brunabraz`** - Bruna Braz editorial website with EmDash.
- **`websites/clinicamauricioaraujo`** - Clínica Maurício Araujo website.
- **`websites/gruice`** - Gru Ice ice factory website.
- **`websites/pedrohenridesign`** - Pedro Henri Design portfolio with EmDash.
- **`websites/transportugal`** - Transportugal logistics website.
- **`websites/vandallabs`** - Vandal Labs website.

### Shared packages and tools

| Path                                                                 | Purpose                                             |
| -------------------------------------------------------------------- | --------------------------------------------------- |
| [apps/images](apps/images)                                           | Hono and Bun.Image image service                    |
| [packages/sun-ui](packages/sun-ui)                                   | Headless Astro/Svelte UI and runtime asset helpers  |
| [packages/sun-ui-emdash](packages/sun-ui-emdash)                     | EmDash-aware UI and content helpers                 |
| [packages/robots-sitemap](packages/robots-sitemap)                   | Host-aware robots and sitemap integration           |
| [packages/emdash-plugin-analytics](packages/emdash-plugin-analytics) | EmDash analytics plugin                             |
| [packages/emdash-plugin-jmap](packages/emdash-plugin-jmap)           | EmDash JMAP email plugin                            |
| [scripts](scripts)                                                   | Development, validation and deployment tools        |
| [docs/guides](docs/guides)                                           | Local CMS, runtime configuration and preview guides |

The website keys are `bellypao`, `brunabraz`, `clinicamauricioaraujo`, `gruice`, `pedrohenridesign`, `transportugal` and `vandallabs`. Bruna Braz and Pedro Henri Design use EmDash; the other five do not use a CMS. "Static site" here means non-CMS content, not Astro static output.

## Develop and verify

Run commands from the repository root. For a non-CMS site:

```sh
moon run bellypao:dev
moon run bellypao:build
```

For the CMS sites, stop any existing dev server, seed local data, then start one site:

```sh
env -u CI moon run brunabraz:seed pedrohenridesign:seed
env -u CI moon run brunabraz:dev
```

The seed tasks use local SQLite and filesystem uploads, not production storage. See [local EmDash development](docs/guides/emdash-local-development.md) for sign-in, reseeding and limitations.

```sh
bun run check
moon run :build
bun run docs
bun test scripts
```

`check` includes formatting, lint, type checks, tests, coverage and documentation checks. Moon builds workspace dependencies for project tasks. Use `moon run <key>:typecheck` or `moon run <key>:test` for a targeted check. Start the image service with `moon run images:dev` and build it with `moon run images:build`.

## Public assets and runtime configuration

Original site assets are served from `https://files.vandal.services/<site-key>`. The four non-CMS sites default `S3_PUBLIC_URL` in their Astro config and expose that default through the typed server environment. They need no static-site asset secret. An explicit runtime public base can override the default.

The CMS sites use runtime storage configuration: a nonempty `S3_PUBLIC_URL` wins; otherwise both `S3_ENDPOINT` and `S3_BUCKET` are needed to derive the public base. Local development uses filesystem media. Selected CMS previews use isolated D1/R2 data and Worker media routes rather than production buckets.

[Vandal Labs asset usage](docs/guides/provision-new-site-and-rotate-secrets.md#public-assets) includes the public cover and profile URLs. Runtime configuration, CI secrets and preview-only secrets have separate owners; see [ARCHITECTURE.md](ARCHITECTURE.md) and [the CI pipeline](docs/ci-pipeline.md). External-writing jobs are disabled in forks (`github.event.repository.fork == false`).

## Licence and content

Reusable implementation is [MIT licensed](LICENSE), copyright 2026 André Vandal. Website copy, data, identity, art and embedded owner material are **not** MIT licensed: each website has a `CONTENT-LICENSE.md` with all rights reserved and no licence granted. Mixed source files have both obligations; extract reusable implementation without copying reserved material. Public bucket access does not grant reuse rights.

[REUSE.toml](REUSE.toml) records file-level annotations; [site-content terms](LICENSES/LicenseRef-Site-Content.txt) explain the boundary. Existing third-party notices remain in force; see [ATTRIBUTION.md](ATTRIBUTION.md). REUSE lint checks annotation coverage, not ownership. Report vulnerabilities through [SECURITY.md](SECURITY.md).
