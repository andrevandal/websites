# Changelog

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
