# Changelog

## [1.4.0](https://github.com/andrevandal/websites/compare/clinicamauricioaraujo-v1.3.1...clinicamauricioaraujo-v1.4.0) (2026-10-18)


### Features

* **pedrohenridesign:** add Pedro Henri Design website
* **websites:** default local images to the staging image service

## [1.3.1](https://github.com/andrevandal/websites/compare/clinicamauricioaraujo-v1.3.0...clinicamauricioaraujo-v1.3.1) (2026-10-13)


### Bug Fixes

* **websites:** route image proxies by deployment stage
* **websites:** route image proxies by deployment stage

## [1.3.0](https://github.com/andrevandal/websites/compare/clinicamauricioaraujo-v1.2.0...clinicamauricioaraujo-v1.3.0) (2026-10-13)


### Features

* **deploy:** add per-site worker config
* **deploy:** add per-site worker config
* **deploy:** build once, upload staging Versions, promote the same build to production
* **deploy:** per-site worker config and runtime image-service binding
* **robots-sitemap:** add request-time robots and sitemap integration
* **scripts:** generate websites in the final Workers Preview and Version shape
* **websites:** serve robots and sitemap from @vandal-websites/robots-sitemap
* **websites:** stage-agnostic site identity
* **websites:** stage-agnostic site identity


### Bug Fixes

* **ci:** drop orphaned deployment key from deploy strategy
* **websites:** drop SITE_URL and ENABLE_PARTYTOWN leftovers
* **websites:** read Worker vars through getSecret and restore Partytown gate
* **websites:** stage-agnostic site identity and dead env var cleanup

## [1.2.0](https://github.com/andrevandal/websites/compare/clinicamauricioaraujo-v1.1.0...clinicamauricioaraujo-v1.2.0) (2026-10-01)


### Features

* **clinicamauricioaraujo:** add Google rating badge
* **clinicamauricioaraujo:** add GoogleRatingBadge component
* **clinicamauricioaraujo:** register rating icons and score constant
* **clinicamauricioaraujo:** show rating badge in footer
* **clinicamauricioaraujo:** show rating badge in hero
* **repo:** extract typegen task to all cloudflare websites
* **transportugal:** add Transportugal landing page


### Bug Fixes

* **clinicamauricioaraujo:** correct rating to real 5,0 score and link badge to Google listing
* **clinicamauricioaraujo:** localize rating decimal and add a11y label to badge
* **clinicamauricioaraujo:** size hero cover to intrinsic height instead of a fixed cap
* **clinicamauricioaraujo:** size hero cover to intrinsic height instead of a fixed cap
* **repo:** invalidate site build cache on sun-ui changes

## [1.1.0](https://github.com/andrevandal/websites/compare/clinicamauricioaraujo-v1.0.0...clinicamauricioaraujo-v1.1.0) (2026-07-08)


### Features

* add Vandal Labs link-in-bio site

## 1.0.0 (2026-07-06)


### Features

* add clinicamauricioaraujo
* add clinicamauricioaraujo astro's example
* add website brunabraz
* **brunabraz:** add carousel autoscroll and timeline icon
* **clinicamauricioaraujo:** sync upstream changes
* **clinicamauricioaraujo:** sync upstream changes
* **clinic:** validate env vars with valibot and add session KV binding
* **website:** initialize clinicamauricioaraujo.com.br


### Bug Fixes

* add vite as a dependency in package.json
* add vite dependency and fix astro:check issues
* **clinicamauricioaraujo:** fix astro check errors
* **clinicamauricioaraujo:** update cn import to sun-ui
* **deploy:** add preview environment to wrangler.json
* **deploy:** default dry-run to false, enforce --no-dry-run in CI
* **deploy:** remove server preset from deploy tasks
* **deploy:** use bunx wrangler instead of wrangler directly
* **deploy:** use bunx wrangler instead of wrangler directly
* **moon:** build sun-ui before website astro checks
* remove commented-out background gradients from body styles
* standardize quotation marks for plugin import in global.css
* **websites:** coerce ENABLE_PARTYTOWN env string to boolean
* **websites:** correct ENABLE_PARTYTOWN boolean coercion
* **websites:** invalidate build cache on public env var change
