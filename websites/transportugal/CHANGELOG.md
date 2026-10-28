# Changelog

## [0.5.0](https://github.com/andrevandal/websites/compare/transportugal-v0.4.0...transportugal-v0.5.0) (2026-10-28)


### Features

* **assets:** serve site assets from bucket URLs without static-site secrets ([d891465](https://github.com/andrevandal/websites/commit/d8914651eb840dbb2d573958d6e7a4471a78d835))
* migrate the static sites to EmDash ([9507678](https://github.com/andrevandal/websites/commit/9507678014a0f370908be1c42ee970de03ea341b))

## [0.4.0](https://github.com/andrevandal/websites/compare/transportugal-v0.3.1...transportugal-v0.4.0) (2026-10-18)


### Features

* **pedrohenridesign:** add Pedro Henri Design website
* **websites:** default local images to the staging image service

## [0.3.1](https://github.com/andrevandal/websites/compare/transportugal-v0.3.0...transportugal-v0.3.1) (2026-10-13)


### Bug Fixes

* **websites:** route image proxies by deployment stage
* **websites:** route image proxies by deployment stage

## [0.3.0](https://github.com/andrevandal/websites/compare/transportugal-v0.2.0...transportugal-v0.3.0) (2026-10-13)


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

## 0.2.0 (2026-10-01)


### Features

* **repo:** extract typegen task to all cloudflare websites
* **transportugal:** add Transportugal landing page
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

* missing calculator leading icon
* **repo:** invalidate site build cache on sun-ui changes
* **sun-ui:** restore responsive carousel scrolling
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
