# Changelog

## [1.9.0](https://github.com/andrevandal/websites/compare/v1.8.0...v1.9.0) (2026-10-28)


### Features

* **assets:** serve site assets from bucket URLs without static-site secrets ([d891465](https://github.com/andrevandal/websites/commit/d8914651eb840dbb2d573958d6e7a4471a78d835))
* **brunabraz:** share EmDash seed tasks and fill the viewport ([e8ef489](https://github.com/andrevandal/websites/commit/e8ef489d5041160db5ab246e1a6d6651303a7909))
* **ci:** reuse canonical bucket media in seed-content ([85b8117](https://github.com/andrevandal/websites/commit/85b81178592649fe2a9d095dbcc7fb93a5d88b7b))
* **gruice:** port Gru Ice website ([e3d841e](https://github.com/andrevandal/websites/commit/e3d841e446a282cd663c1a41ea2eea8ff4f625b2))
  * **gruice:** align drink stepper padding ([36abe1d](https://github.com/andrevandal/websites/commit/36abe1dbd0b3f64c45bf625691d830092e629056))
  * **gruice:** improve FAQ spacing and affordance ([b5db9a5](https://github.com/andrevandal/websites/commit/b5db9a59b5b84f4940d656c5d7ce0ae961cf0d5e))
  * **gruice:** update footer address and map link ([562adee](https://github.com/andrevandal/websites/commit/562adeeea7b8569ecaf5dac46f99897e1a2730f4))
  * **gruice:** use current year and new credits link ([f2a202d](https://github.com/andrevandal/websites/commit/f2a202d0fc4201ed121c3ceb8e9e926dfd23255d))
* migrate the static sites to EmDash ([9507678](https://github.com/andrevandal/websites/commit/9507678014a0f370908be1c42ee970de03ea341b))
* **sun-ui-emdash:** add aws4fetch S3 storage adapter ([65b9121](https://github.com/andrevandal/websites/commit/65b9121c9c194b516d547e729a953d0f5b7070f4))


### Bug Fixes

* **ci:** retry versions deploy while a new Version is not yet visible ([2ae192a](https://github.com/andrevandal/websites/commit/2ae192a43dafc9fd378ae89f5e5f7701022f3d39))
* **deploy:** create missing Worker on first version upload ([5ca9258](https://github.com/andrevandal/websites/commit/5ca9258336f82a349c9893b7d72eab28027c61e3))
  * **deploy:** attach PR previews to the staging Worker ([72dc665](https://github.com/andrevandal/websites/commit/72dc665465fe109e1c9a975fe449e4f57bab67a1))
* **scripts:** open EmDash databases read-write for WAL ([42e11f1](https://github.com/andrevandal/websites/commit/42e11f1472c16569a279896e30bb78b5407b643e))
* **sun-ui-emdash:** check S3 existence with ranged GET ([cb75f05](https://github.com/andrevandal/websites/commit/cb75f05f3e8943a07192f8c4d4d0001628d58381))
* **sun-ui-emdash:** keep 200 on ranged GET, decode numeric entities, cover upload/exists/signing ([369f93d](https://github.com/andrevandal/websites/commit/369f93dbfc0f1d0ea996934d2fae9a4cd5aff867))
* **sun-ui-emdash:** log S3 storage failures with status ([6054362](https://github.com/andrevandal/websites/commit/605436284a95827f32a735c61745bb0b28578d59))
* **sun-ui-emdash:** resolve absolute internal media URLs through public storage ([8d70bf2](https://github.com/andrevandal/websites/commit/8d70bf2acb958d72c3673e323946ae4b9b95d6e5))
  * **clinicamauricioaraujo:** pass test task without test files ([d01a958](https://github.com/andrevandal/websites/commit/d01a958755dd49a894a4b52a39dd5b548a7fccb1))
* **sun-ui-emdash:** trace denied S3 HEAD requests ([f62f529](https://github.com/andrevandal/websites/commit/f62f529a2ad5765bdc87f592788cf129ea4d0aeb))

## [1.8.0](https://github.com/andrevandal/websites/compare/v1.7.0...v1.8.0) (2026-10-18)


### Features

* **emdash-plugin-jmap:** add JMAP email transport plugin
* **pedrohenridesign:** require EMDASH_ENCRYPTION_KEY as a Stage secret
* **pedrohenridesign:** send email through a JMAP plugin
* **pedrohenridesign:** send email through the JMAP plugin

## [1.7.0](https://github.com/andrevandal/websites/compare/v1.6.0...v1.7.0) (2026-10-18)


### Features

* **ci:** fetch pedrohenridesign runtime secrets from Infisical over OIDC
* **ci:** fetch pedrohenridesign runtime secrets from Infisical over OIDC
* **pedrohenridesign:** add Pedro Henri Design website


### Bug Fixes

* **ci:** read Infisical secrets from /websites/&lt;site&gt;

## [1.6.0](https://github.com/andrevandal/websites/compare/v1.5.0...v1.6.0) (2026-10-16)


### Features

* **images:** allow *.suffix wildcard entries in HTTP_DOMAINS
* **images:** allow *.suffix wildcard entries in HTTP_DOMAINS
* **images:** optionally redirect unallowed http sources instead of rejecting
* **images:** optionally redirect unallowed http sources instead of rejecting


### Bug Fixes

* **ci:** migrate runners to Ubuntu 26.04
* **ci:** migrate to Ubuntu 26.04 and refresh actions
* **ci:** pin runners and refresh actions
* **ci:** publish a floating staging image tag
* **ci:** publish a floating staging image tag

## [1.5.0](https://github.com/andrevandal/websites/compare/v1.4.0...v1.5.0) (2026-10-13)


### Features

* **images:** add /healthy/deep with an image fetch and decode check


### Bug Fixes

* **ci:** read MOON_REMOTE_HOST from secrets, not vars
* **ci:** read MOON_REMOTE_HOST from secrets, not vars
* **ci:** scope the images container concurrency group per environment
* **ci:** scope the images container concurrency group per environment
* **ci:** use POST for the Coolify deployment webhook
* **ci:** use POST for the Coolify deployment webhook
* **images:** surface a banned proxy in health checks, add /healthy/deep
* **websites:** route image proxies by deployment stage
* **websites:** route image proxies by deployment stage

## [1.4.0](https://github.com/andrevandal/websites/compare/v1.3.0...v1.4.0) (2026-10-13)


### Features

* **bellypao:** add Belly Pao website
* **bellypao:** add Belly Pao website
* **bellypao:** set production Google Analytics id
* **deploy:** add per-site worker config
* **deploy:** add per-site worker config
* **deploy:** build once, upload staging Versions, promote the same build to production
* **deploy:** deploy pull requests as Workers Previews of one persistent Worker
* **deploy:** per-site worker config and runtime image-service binding
* **robots-sitemap:** add request-time robots and sitemap integration
* **scripts:** generate websites in the final Workers Preview and Version shape
* **scripts:** generate websites in the final Workers Preview and Version shape (), closes [#150](https://github.com/andrevandal/websites/issues/150) [#143](https://github.com/andrevandal/websites/issues/143)
* **scripts:** register bellypao in site config, deploy and release tooling
* **sun-ui:** image-service base URL as Cloudflare runtime binding
* **sun-ui:** image-service base URL as Cloudflare runtime binding
* **websites:** serve robots and sitemap from @vandal-websites/robots-sitemap
* **websites:** stage-agnostic site identity
* **websites:** stage-agnostic site identity


### Bug Fixes

* **ci:** drop orphaned deployment key from deploy strategy
* **ci:** drop orphaned deployment key from deploy strategy
* **ci:** drop orphaned deployment key from deploy strategy
* **ci:** reinstall pinned tools whose proto executable is missing
* **ci:** restore bun on PATH after toolchain setup
* **deploy:** parse wrangler preview JSON after banner lines
* **deploy:** parse wrangler preview JSON after banner lines
* **images:** build docker deps from moon docker scaffold
* **images:** build docker deps from moon docker scaffold
* **images:** identify visitors behind a trusted reverse proxy
* **images:** identify visitors behind a trusted reverse proxy
* **scripts:** coverage-allowlist-guard shouldn't flag a deleted project as a regression
* **websites:** drop SITE_URL and ENABLE_PARTYTOWN leftovers
* **websites:** read Worker vars through getSecret and restore Partytown gate
* **websites:** remove dangling imageServiceBaseUrl wiring and stale image.service config
* **websites:** stage-agnostic site identity and dead env var cleanup

## [1.3.0](https://github.com/andrevandal/websites/compare/v1.2.0...v1.3.0) (2026-10-01)


### Features

* **brunabraz:** add allowedDurations and resolveDuration to pricing data
* **brunabraz:** add aula-ingles-particular landing page
* **brunabraz:** add aula-ingles-particular landing page
* **brunabraz:** add contexto floating illustration
* **brunabraz:** add data-animate markup to aula-ingles-particular.astro sections
* **brunabraz:** add data-animate markup to index.astro sections
* **brunabraz:** add fade-scale-up keyframes and data-animate base layer
* **brunabraz:** add Isabel Limoli testimonial
* **brunabraz:** add lesson pricing calculator
* **brunabraz:** add metodo illustrations and responsive connecting line
* **brunabraz:** add no-js/js toggle and mount SunAnimateOnScroll
* **brunabraz:** add number ring badge and desktop card background
* **brunabraz:** add planos sansa illustration
* **brunabraz:** add resultados banner illustration
* **brunabraz:** add ring-draw keyframes and prefers-reduced-motion compliance
* **brunabraz:** add shared autonomy card component
* **brunabraz:** add typography utility roles
* **brunabraz:** animate planos pill indicator on selection change
* **brunabraz:** centralize testimonials data with role field
* **brunabraz:** disable 9/12 month duration for Conversação plan
* **brunabraz:** extract pricing calculator into reusable component
* **brunabraz:** log the resolved image service at build time
* **brunabraz:** make planos pill selection interactive with live summary
* **brunabraz:** match dor section badge design and add lg+ layout
* **brunabraz:** opt into SunUIAstroIntegration's svelte option, hydrate SunCarousel
* **brunabraz:** optimize testimonial avatars and show role, fix card height
* **brunabraz:** randomize testimonial order
* **brunabraz:** rebuild lp hero to match home layout in green variant
* **brunabraz:** redesign aula-ingles-particular and index pages
* **brunabraz:** replace clip-path SVG ring with stroke-based gradient ring
* **brunabraz:** replace SunYoutube with self-hosted SunVideo in aula-ingles-particular
* **brunabraz:** share transparent nav and add pt-BR section ids
* **brunabraz:** stretch-grid posicionamento cards and stack icons
* **brunabraz:** update site metadata and add testimonial
* **brunabraz:** update timeline icons with final artwork
* **brunabraz:** use real carousel photography
* **brunabraz:** wire data-animate into shared card and carousel components
* **brunabraz:** wire real WhatsApp number with contextual messages on every CTA
* **brunabraz:** wire shared navigation, typography, and cards into pages
* **clinicamauricioaraujo:** add Google rating badge
* **clinicamauricioaraujo:** add GoogleRatingBadge component
* **clinicamauricioaraujo:** register rating icons and score constant
* **clinicamauricioaraujo:** show rating badge in footer
* **clinicamauricioaraujo:** show rating badge in hero
* **deploy:** add prepare-build-env script to export build-time env vars
* **repo:** extract typegen task to all cloudflare websites
* **scripts:** add agent git guardrail hooks
* **scripts:** add docs and skills checks
* **scripts:** add SVG optimization tool
* **scripts:** add website:new generator to bootstrap Astro sites
* **scripts:** add website:new generator to bootstrap Astro sites
* **sun-ui:** add SunCombobox headless combobox primitive
* **sun-ui:** add SunVideo component
* **sun-ui:** add SunVideo props and pure playback-gating utilities
* **sun-ui:** add Svelte facade entry point re-exporting bits-ui primitives
* **sun-ui:** export suncarousel as direct svelte island, enable @astrojs/svelte
* **sun-ui:** open combobox list on interaction, gate empty state on query
* **sun-ui:** port carousel autoscroll/drag/keyboard logic to a Svelte island
* **sun-ui:** port SunCarousel to a Svelte island
* **transportugal:** add Transportugal landing page
* **transportugal:** build landing page from Figma design
* **transportugal:** raise hero image quality
* **transportugal:** scaffold new Astro site infra
* **transportugal:** serve photos from files.vandal.services
* **transportugal:** add allowed-locations data module
* **transportugal:** add brazil-cities generation script and generated data
* **transportugal:** add CTA button states to route calculator
* **transportugal:** add default social image
* **transportugal:** add favicon assets
* **transportugal:** add gray/red design tokens and typography primitives
* **transportugal:** add normalizeCityName data helper
* **transportugal:** add route Astro Actions
* **transportugal:** add RoutePrazoCalculator svelte island
* **transportugal:** add searchBrazilCities data helper
* **transportugal:** animate MapBrazil SP glow and route trace
* **transportugal:** integrate map-brazil figma motion animation
* **transportugal:** make map animation direction to alternate
* **transportugal:** pause map animation when off-screen
* **transportugal:** rebuild hero and page sections with new typography components
* **transportugal:** redesign navigation with animated toggle
* **transportugal:** render real supplier logos in home page carousel
* **transportugal:** restyle footer with new gray palette
* **transportugal:** seed origin suggestions from destinations prop


### Bug Fixes

* **brunabraz:** a11y and image-sizing fixes from Lighthouse audit
* **brunabraz:** add CNPJ to footer
* **brunabraz:** align class and result sections
* **brunabraz:** align contexto and dor spacing
* **brunabraz:** align faq responsive spacing
* **brunabraz:** align results banner asset
* **brunabraz:** clear completed FAQ animations
* **brunabraz:** close planos container wrapper
* **brunabraz:** contain desktop section decorations
* **brunabraz:** correct conversação 2x/week 6-month price to 520
* **brunabraz:** correct dupla plan duration prices
* **brunabraz:** correct missing data-animate and wrong stagger delay in index.astro
* **brunabraz:** correct pricing and FAQ copy
* **brunabraz:** disable 9/12 month duration for Conversação plan
* **brunabraz:** drop unused index param and IMAGES_BASE_URL import
* **brunabraz:** expand footer credits with designer and illustrator
* **brunabraz:** faq items start closed
* **brunabraz:** fix grammar on aula-ingles-particular FAQ copy
* **brunabraz:** harden duration test coverage and drop label-keyed selector
* **brunabraz:** hero image dimensions
* **brunabraz:** implement full wireframe fidelity for aula-ingles-particular
* **brunabraz:** include details field in pricing test expectations
* **brunabraz:** keep planos cta above sansa illustration
* **brunabraz:** keep trailing period outside italic hero heading
* **brunabraz:** match dor section Figma assets
* **brunabraz:** match original Figma ring shape and lengthen draw timing
* **brunabraz:** pin testimonial divider and author row to card bottom
* **brunabraz:** prebundle Cloudflare SSR dependencies
* **brunabraz:** preserve heading caller colors
* **brunabraz:** preserve planos calculator tabs
* **brunabraz:** rebuild Método responsive layout
* **brunabraz:** reconcile wave 1 concurrent commit state
* **brunabraz:** refine English lesson copy
* **brunabraz:** refine homepage biography copy
* **brunabraz:** remove dead /blog/ link from navigation
* **brunabraz:** reposition planos illustration
* **brunabraz:** restore fill=none on ring SVG root for defensive clarity
* **brunabraz:** revert credentials band to plural 'Estudos da Linguagem'
* **brunabraz:** revert timeline entry to match home page's shipped text
* **brunabraz:** size homepage carousel slides naturally
* **brunabraz:** size testimonial cards by content
* **brunabraz:** stop hiding carousel slides behind a broken per-item observer
* **brunabraz:** sync hero cta copy to figma
* **brunabraz:** update hero images and homepage video caption
* **brunabraz:** update video and add whitespace
* **brunabraz:** update video and add whitespace
* **brunabraz:** use distinct positioning illustrations
* **brunabraz:** use literal Figma/home-page copy in 02-Contexto, 04-Posicionamento, 05-Método
* **brunabraz:** wrap SunVideo in data-animate div since component drops rest props
* **ci:** add transportugal to release-please manifest
* **ci:** free runner disk space before docker build to prevent OOM
* **ci:** never crash ci-report-summary on malformed report, correct overclaims
* **clinicamauricioaraujo:** correct rating to real 5,0 score and link badge to Google listing
* **clinicamauricioaraujo:** localize rating decimal and add a11y label to badge
* **clinicamauricioaraujo:** size hero cover to intrinsic height instead of a fixed cap
* **clinicamauricioaraujo:** size hero cover to intrinsic height instead of a fixed cap
* **deps:** patch @volar/kit to fix astro check false errors
* **docker:** copy Bun patch files before frozen install
* **landing:** align metodo positioning spacing
* missing calculator leading icon
* **repo:** ban numeric ADR citations in docs-check
* **repo:** harden git guardrails and add a pre-push guard
* **repo:** invalidate site build cache on sun-ui changes
* **repo:** scan sun-ui source for Tailwind utilities
* **repo:** stop shelling out to jq in moon project queries
* **repo:** stop shelling out to jq in moon project queries
* **scripts:** type svgo config properly, rename to .config.ts
* **sun-ui:** add focus ring to combobox trigger
* **sun-ui:** add spacing between caption and input in combobox
* **sun-ui:** fix Carousel.svelte reactive className and a11y lint warnings
* **sun-ui:** fix SunCombobox controlled input, clear desync, and loading precedence
* **sun-ui:** gate combobox popup container on hasContent
* **sun-ui:** isolate SunCarousel export, fix svelte resolution at consuming sites
* **sun-ui:** open combobox on container interaction, not just input/chevron
* **sun-ui:** recompute Carousel trackClass reactively with $derived
* **sun-ui:** remove obsolete carousel lint ignore
* **sun-ui:** resolve final-review findings on SunVideo
* **sun-ui:** restore closing div dropped in prior fix
* **sun-ui:** restore responsive carousel scrolling
* **sun-ui:** simplify picture wrapper and aspect-ratio classes
* **sun-ui:** tighten combobox item wrapper spacing
* **sun-ui:** track .svelte sources in check/build task inputs
* **sun-ui:** unwrap astro-slot wrapper so carousel logic sees real slide elements
* **sun-ui:** use Tailwind v4 arbitrary-property syntax for aspect ratio
* **transportugal:** correct heading tracking and divider element
* **transportugal:** fix hero image covering content
* **transportugal:** match mobile frame typography and alignment
* **transportugal:** reorder footer sections on mobile
* **transportugal:** restore icon colors, adopt container layout
* **transportugal:** section-by-section pixel comparison fixes
* **transportugal:** svgo-optimize icons with currentColor fills
* **transportugal:** use brunabraz's actual container breakpoints
* **transportugal:** add local bunfig.toml for test preload resolution
* **transportugal:** clarify route calculator timing
* **transportugal:** correct ES base color and add SP/ES pin markers
* **transportugal:** correct MapBrazil SP base color and mobile layout
* **transportugal:** correct mobile hero image filename
* **transportugal:** fix sp glow sizing/alignment against black base
* **transportugal:** make footer contacts actionable
* **transportugal:** make hero section flex-fill and right column self-center
* **transportugal:** make sp map marker a constant black ring
* **transportugal:** preserve inline map svg rendering
* **transportugal:** preserve map overlay layers
* **transportugal:** real Svelte test coverage, true route swap, Area export
* **transportugal:** redesign combobox to match Figma, remove swap button
* **transportugal:** reduce route calculator card padding on mobile
* **transportugal:** remove hero image opacity
* **transportugal:** render footer copyright year dynamically and adopt Logo
* **transportugal:** satisfy map lint rules
* **transportugal:** small UI fixes and supplier logo carousel
* **transportugal:** stop sp glow blur bleed getting clipped mid-loop
* **transportugal:** stretch insurance card height on xl breakpoint
* **transportugal:** switch map layout breakpoint from lg to xl
* **transportugal:** switch partner section responsive breakpoint to xl
* **transportugal:** widen supplier carousel logo gap

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
