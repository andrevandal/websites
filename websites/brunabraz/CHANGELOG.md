# Changelog

## [1.5.0](https://github.com/andrevandal/websites/compare/brunabraz-v1.4.1...brunabraz-v1.5.0) (2026-10-18)


### Features

* **pedrohenridesign:** add Pedro Henri Design website
* **websites:** default local images to the staging image service

## [1.4.1](https://github.com/andrevandal/websites/compare/brunabraz-v1.4.0...brunabraz-v1.4.1) (2026-10-13)


### Bug Fixes

* **websites:** route image proxies by deployment stage
* **websites:** route image proxies by deployment stage

## [1.4.0](https://github.com/andrevandal/websites/compare/brunabraz-v1.3.0...brunabraz-v1.4.0) (2026-10-13)


### Features

* **deploy:** add per-site worker config
* **deploy:** add per-site worker config
* **deploy:** build once, upload staging Versions, promote the same build to production
* **deploy:** per-site worker config and runtime image-service binding
* **scripts:** generate websites in the final Workers Preview and Version shape
* **sun-ui:** image-service base URL as Cloudflare runtime binding
* **websites:** serve robots and sitemap from @vandal-websites/robots-sitemap
* **websites:** stage-agnostic site identity
* **websites:** stage-agnostic site identity


### Bug Fixes

* **ci:** drop orphaned deployment key from deploy strategy
* **websites:** drop SITE_URL and ENABLE_PARTYTOWN leftovers
* **websites:** read Worker vars through getSecret and restore Partytown gate
* **websites:** remove dangling imageServiceBaseUrl wiring and stale image.service config
* **websites:** stage-agnostic site identity and dead env var cleanup

## [1.3.0](https://github.com/andrevandal/websites/compare/brunabraz-v1.2.0...brunabraz-v1.3.0) (2026-10-01)


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
* **repo:** extract typegen task to all cloudflare websites
* **sun-ui:** port SunCarousel to a Svelte island
* **transportugal:** add Transportugal landing page


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
* **landing:** align metodo positioning spacing
* **repo:** invalidate site build cache on sun-ui changes
* **repo:** scan sun-ui source for Tailwind utilities
* **sun-ui:** isolate SunCarousel export, fix svelte resolution at consuming sites
* **sun-ui:** resolve final-review findings on SunVideo
* **sun-ui:** restore responsive carousel scrolling

## [1.2.0](https://github.com/andrevandal/websites/compare/brunabraz-v1.1.0...brunabraz-v1.2.0) (2026-07-10)


### Features

* **brunabraz:** hero image via Astro Image with placeholder and DPR densities
* **brunabraz:** route astro images through sun image service
* **brunabraz:** use circle hero placeholder
* **sun-ui:** add SunPicture component wrapping Astro Image + placeholder
* **sun-ui:** astro external image service via apps/images (+ brunabraz wiring)
* **sun-ui:** serve correct image size per breakpoint plus densities


### Bug Fixes

* **brunabraz:** hide hero placeholder once real image loads
* **sun-ui:** harden image service option validation

## [1.1.0](https://github.com/andrevandal/websites/compare/brunabraz-v1.0.0...brunabraz-v1.1.0) (2026-07-08)


### Features

* add Bruna Braz section patterns
* add Vandal Labs link-in-bio site
* **brunabraz:** add dashed timeline spine
* **brunabraz:** add dashed timeline spine
* **brunabraz:** add section patterns
* **brunabraz:** sync hero image with Figma design
* **brunabraz:** sync hero image with Figma design
* **sun-ui:** replace icon/reverse with prefix/suffix slots on Button


### Bug Fixes

* **brunabraz:** move typography plugin import before tailwindcss
* **deploy:** strip BOM before parsing wrangler config and env secrets

## 1.0.0 (2026-07-06)


### Features

* add website brunabraz
* **brunabraz:** add bruna braz website
* **brunabraz:** add carousel autoscroll and timeline icon
* **brunabraz:** enable Cloudflare SSR adapter with sitemap and session KV
* **brunabraz:** render infinity icon in timeline
* **brunabraz:** scroll testimonials carousel left-to-right
* **clinicamauricioaraujo:** sync upstream changes


### Bug Fixes

* **deploy:** add preview environment to wrangler.json
* **deploy:** remove server preset from deploy tasks
* **deploy:** use bunx wrangler instead of wrangler directly
* **moon:** build sun-ui before website astro checks
* **websites:** coerce ENABLE_PARTYTOWN env string to boolean
* **websites:** correct ENABLE_PARTYTOWN boolean coercion
* **websites:** invalidate build cache on public env var change
