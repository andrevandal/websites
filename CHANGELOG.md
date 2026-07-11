# Changelog

## [1.2.0](https://github.com/andrevandal/websites/compare/v1.1.0...v1.2.0) (2026-07-10)


### Features

* **brunabraz:** hero image via Astro Image with placeholder and DPR densities
* **brunabraz:** route astro images through sun image service
* **brunabraz:** use circle hero placeholder
* improve Vandallabs locale routing and accessibility
* **sun-ui:** add astro-image-service external image service
* **sun-ui:** add circle placeholder mode
* **sun-ui:** add density srcset and placeholder URL helper to image service
* **sun-ui:** add RIAPI modifier-string builder
* **sun-ui:** add SunPicture component wrapping Astro Image + placeholder
* **sun-ui:** astro external image service via apps/images (+ brunabraz wiring)
* **sun-ui:** configure image service through astro integration
* **sun-ui:** serve correct image size per breakpoint plus densities
* **vandallabs:** redirect root by browser locale


### Bug Fixes

* **brunabraz:** hide hero placeholder once real image loads
* **deploy:** ignore unused env vars not declared by target site
* **deploy:** remove invalid wrangler cleanup flag
* **deploy:** remove invalid wrangler cleanup flag
* **sun-ui:** copy *.utils.ts alongside astro components in build output
* **sun-ui:** harden image service option validation
* **sun-ui:** reject non-remote astro image sources and strip layout attribute
* **sun-ui:** type astro integration image config payload
* **vandallabs:** pass accessibility audits

## [1.1.0](https://github.com/andrevandal/websites/compare/v1.0.1...v1.1.0) (2026-07-08)


### Features

* add Bruna Braz section patterns
* add Vandal Labs link-in-bio site
* **brunabraz:** add dashed timeline spine
* **brunabraz:** add dashed timeline spine
* **brunabraz:** add section patterns
* **brunabraz:** sync hero image with Figma design
* **brunabraz:** sync hero image with Figma design
* **sun-ui:** replace icon/reverse with prefix/suffix slots on Button
* **vandallabs:** add brand social images (OG, cover, WhatsApp avatar)
* **vandallabs:** add vandallabs link-in-bio website
* **vandallabs:** componentize icons and brand mark, animate CTA arrow


### Bug Fixes

* **brunabraz:** move typography plugin import before tailwindcss
* **deploy:** reuse shared KV namespace
* **deploy:** reuse shared KV namespace
* **deploy:** strip BOM before parsing wrangler config and env secrets
* **sun-ui:** apply lang attribute to html element in Layout
* **sun-ui:** let Layout spread lang through html props
* **vandallabs:** improve dark mode contrast
* **vandallabs:** improve dark mode contrast and favicon

## [1.0.1](https://github.com/andrevandal/websites/compare/v1.0.0...v1.0.1) (2026-07-06)


### Bug Fixes

* **release:** set DEPLOY_ENV for production website deploys
* **release:** set DEPLOY_ENV for production website deploys

## 1.0.0 (2026-07-06)


### Features

* add clinicamauricioaraujo
* add clinicamauricioaraujo astro's example
* add deploy and init actions for CI/CD workflow
* add website brunabraz
* add wrangler
* **astro:** add shared Astro components (Figure, Icon, Image, BaseButton)
* **astro:** implement cn and createImageUtils in @vandal-websites/astro
* **astro:** scaffold @vandal-websites/astro package
* **brunabraz:** add bruna braz website
* **brunabraz:** add carousel autoscroll and timeline icon
* **brunabraz:** enable Cloudflare SSR adapter with sitemap and session KV
* **brunabraz:** render infinity icon in timeline
* **brunabraz:** scroll testimonials carousel left-to-right
* **clinicamauricioaraujo:** sync upstream changes
* **clinicamauricioaraujo:** sync upstream changes
* **clinic:** validate env vars with valibot and add session KV binding
* **deploy:** add centralized cloudflare pages orchestrator
* **deploy:** log deployment URL after successful deploy
* **images:** add bot-defense blocklist, ban tracker, and rate limiter
* **images:** add generic SQLite KV store
* **images:** add home page route
* **images:** add hot cache layer in front of local/s3 backends
* **images:** add websites images service
* **images:** auto-fire production deploy after release-please release
* **images:** configure queue database path
* **images:** isolate test queue database from dev queue database
* **images:** migrate images-app from ipx-server to Bun.Image/Bun.S3Client/bunqueue
* **images:** route gif sources to animation-safe formats
* **images:** tag container images with semver from package.json
* **images:** transform animated gifs with sharp
* **images:** wire bot defense and robots.txt into the app
* **images:** wire consolaLevel and add tagged structured logging
* **pedrohenridesign:** consume @vandal-websites/astro for shared utils and components
* **pedrohenridesign:** copy and adapt source files from standalone site
* **pedrohenridesign:** integrate pedrohenri.design into monorepo
* streamline CI/CD initialization by adding code checkout step
* **sun-ui:** add animate-on-scroll component
* **sun-ui:** add autoscroll with infinite loop to carousel
* **sun-ui:** add open-body slot and run Gtag before body content
* **sun-ui:** add UI component library
* **sun-ui:** support shared gtag config
* **website:** initialize clinicamauricioaraujo.com.br
* **websites:** track brunabraz in release-please, auto-fire production deploy


### Bug Fixes

* action init
* add vite as a dependency in package.json
* add vite dependency and fix astro:check issues
* **astro:** add bun:test explicit imports and bun-types devDep to fix typecheck
* **astro:** fix noUncheckedIndexedAccess errors in image utils
* **astro:** replace bun-types with @types/bun in catalog reference
* **ci:** add statuses write permission to PR title workflow
* **ci:** expose site env var secrets in deploy job
* **ci:** remove push-only gate and stale astro tsconfig ref
* **ci:** remove push-only gate from deploy step
* **ci:** use bunx wrangler and handle null CF API response
* **ci:** use vars context for site env vars (not secrets)
* **cleanup-pr-previews:** handle null result from Cloudflare API
* **clinicamauricioaraujo:** fix astro check errors
* **clinicamauricioaraujo:** update cn import to sun-ui
* correct argument order in deploy command in action.yml
* **deploy:** add preview environment to wrangler.json
* **deploy:** add preview environment to wrangler.json
* **deploy:** default dry-run to false
* **deploy:** default dry-run to false, enforce --no-dry-run in CI
* **deploy:** default to empty env vars when secret not set
* **deploy:** default to empty env vars when secret not set
* **deploy:** remove server preset from deploy tasks
* **deploy:** skip env var check when .env.example has no keys
* **deploy:** use bunx wrangler instead of wrangler directly
* **deploy:** use bunx wrangler instead of wrangler directly
* **deploy:** warn with env var name when secret not set
* **docker:** add healthcheck to docker-compose
* **docker:** remove broken COPY globs in builder stage
* **docker:** use proto and moon for builder stage
* **images:** copy per-workspace node_modules into builder stage
* **images:** copy per-workspace node_modules into builder stage
* **images:** correct S3 credential env var names, drop OMR_IMAGES_ prefix
* **images:** disable fs source when configured directory is missing
* **images:** keep sharp external, install its native deps at runtime
* **images:** remove hardcoded GHCR owner from compose default image
* **images:** resolve sharp type-namespace and format-narrowing errors
* **images:** sharp fails to load in production container
* jq ci issue
* **moon:** add --no-error-on-unmatched-pattern to format-astro tasks
* **moon:** add --pass-with-no-tests to bun test tasks
* **moon:** build sun-ui before website astro checks
* **moon:** deduplicate test task via extends
* **moon:** limit lint-astro to only astro files to avoid ts parse errors
* **pedrohenridesign:** add vite as direct dependency for astro.config.mjs
* **pedrohenridesign:** convert getStaticPaths to function expressions
* **pedrohenridesign:** restore Google Analytics via partytown
* **pedrohenridesign:** restore Google Analytics via partytown
* remove commented-out background gradients from body styles
* remove deployment steps from release workflow
* **scripts:** improve deploy log messages and pick last deploy URL
* standardize quotation marks for plugin import in global.css
* **sun-ui:** add tailwindcss as explicit dependency
* update cache-base to main in CI/CD action
* update deployment environment logic in main.yml
* **websites:** coerce ENABLE_PARTYTOWN env string to boolean
* **websites:** correct ENABLE_PARTYTOWN boolean coercion
* **websites:** invalidate build cache on public env var change


