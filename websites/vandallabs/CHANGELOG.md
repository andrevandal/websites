# Changelog

## [1.5.0](https://github.com/andrevandal/websites/compare/vandallabs-v1.4.1...vandallabs-v1.5.0) (2026-10-18)


### Features

* **pedrohenridesign:** add Pedro Henri Design website
* **websites:** default local images to the staging image service

## [1.4.1](https://github.com/andrevandal/websites/compare/vandallabs-v1.4.0...vandallabs-v1.4.1) (2026-10-13)


### Bug Fixes

* **websites:** route image proxies by deployment stage
* **websites:** route image proxies by deployment stage

## [1.4.0](https://github.com/andrevandal/websites/compare/vandallabs-v1.3.0...vandallabs-v1.4.0) (2026-10-13)


### Features

* **deploy:** add per-site worker config
* **deploy:** add per-site worker config
* **deploy:** build once, upload staging Versions, promote the same build to production
* **deploy:** deploy pull requests as Workers Previews of one persistent Worker
* **deploy:** per-site worker config and runtime image-service binding
* **scripts:** generate websites in the final Workers Preview and Version shape
* **websites:** serve robots and sitemap from @vandal-websites/robots-sitemap
* **websites:** stage-agnostic site identity
* **websites:** stage-agnostic site identity


### Bug Fixes

* **ci:** drop orphaned deployment key from deploy strategy
* **websites:** drop SITE_URL and ENABLE_PARTYTOWN leftovers
* **websites:** read Worker vars through getSecret and restore Partytown gate
* **websites:** stage-agnostic site identity and dead env var cleanup

## [1.3.0](https://github.com/andrevandal/websites/compare/vandallabs-v1.2.0...vandallabs-v1.3.0) (2026-10-01)


### Features

* **repo:** extract typegen task to all cloudflare websites
* **transportugal:** add Transportugal landing page


### Bug Fixes

* **repo:** invalidate site build cache on sun-ui changes
* **repo:** scan sun-ui source for Tailwind utilities

## [1.2.0](https://github.com/andrevandal/websites/compare/vandallabs-v1.1.0...vandallabs-v1.2.0) (2026-07-10)


### Features

* improve Vandallabs locale routing and accessibility
* **vandallabs:** redirect root by browser locale


### Bug Fixes

* **vandallabs:** pass accessibility audits

## 1.1.0 (2026-07-08)


### Features

* add Vandal Labs link-in-bio site
* **vandallabs:** add brand social images (OG, cover, WhatsApp avatar)
* **vandallabs:** add vandallabs link-in-bio website
* **vandallabs:** componentize icons and brand mark, animate CTA arrow


### Bug Fixes

* **vandallabs:** improve dark mode contrast
* **vandallabs:** improve dark mode contrast and favicon
