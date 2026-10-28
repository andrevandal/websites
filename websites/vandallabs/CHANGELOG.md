# Changelog

## [1.6.0](https://github.com/andrevandal/websites/compare/vandallabs-v1.5.0...vandallabs-v1.6.0) (2026-10-28)


### Features

* **assets:** serve site assets from bucket URLs without static-site secrets ([d891465](https://github.com/andrevandal/websites/commit/d8914651eb840dbb2d573958d6e7a4471a78d835))
* migrate the static sites to EmDash ([9507678](https://github.com/andrevandal/websites/commit/9507678014a0f370908be1c42ee970de03ea341b))


### Bug Fixes

* **deploy:** create missing Worker on first version upload ([5ca9258](https://github.com/andrevandal/websites/commit/5ca9258336f82a349c9893b7d72eab28027c61e3))
  * **deploy:** attach PR previews to the staging Worker ([72dc665](https://github.com/andrevandal/websites/commit/72dc665465fe109e1c9a975fe449e4f57bab67a1))

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
