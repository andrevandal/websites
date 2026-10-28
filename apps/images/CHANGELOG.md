# Changelog

## [1.4.0](https://github.com/andrevandal/websites/compare/images-app-v1.3.0...images-app-v1.4.0) (2026-10-28)


### Features

* **assets:** serve site assets from bucket URLs without static-site secrets ([d891465](https://github.com/andrevandal/websites/commit/d8914651eb840dbb2d573958d6e7a4471a78d835))
* migrate the static sites to EmDash ([9507678](https://github.com/andrevandal/websites/commit/9507678014a0f370908be1c42ee970de03ea341b))

## [1.3.0](https://github.com/andrevandal/websites/compare/images-app-v1.2.0...images-app-v1.3.0) (2026-10-16)


### Features

* **images:** allow *.suffix wildcard entries in HTTP_DOMAINS
* **images:** allow *.suffix wildcard entries in HTTP_DOMAINS
* **images:** optionally redirect unallowed http sources instead of rejecting
* **images:** optionally redirect unallowed http sources instead of rejecting

## [1.2.0](https://github.com/andrevandal/websites/compare/images-app-v1.1.1...images-app-v1.2.0) (2026-10-13)


### Features

* **images:** add /healthy/deep with an image fetch and decode check


### Bug Fixes

* **images:** surface a banned proxy in health checks, add /healthy/deep

## [1.1.1](https://github.com/andrevandal/websites/compare/images-app-v1.1.0...images-app-v1.1.1) (2026-10-13)


### Bug Fixes

* **ci:** drop orphaned deployment key from deploy strategy
* **images:** identify visitors behind a trusted reverse proxy
* **images:** identify visitors behind a trusted reverse proxy

## [1.1.0](https://github.com/andrevandal/websites/compare/images-app-v1.0.0...images-app-v1.1.0) (2026-10-01)


### Features

* **scripts:** add docs and skills checks

## 1.0.0 (2026-07-06)


### Features

* **images:** add bot-defense blocklist, ban tracker, and rate limiter
* **images:** add generic SQLite KV store
* **images:** add home page route
* **images:** add hot cache layer in front of local/s3 backends
* **images:** add websites images service
* **images:** configure queue database path
* **images:** isolate test queue database from dev queue database
* **images:** migrate images-app from ipx-server to Bun.Image/Bun.S3Client/bunqueue
* **images:** route gif sources to animation-safe formats
* **images:** tag container images with semver from package.json
* **images:** transform animated gifs with sharp
* **images:** wire bot defense and robots.txt into the app
* **images:** wire consolaLevel and add tagged structured logging


### Bug Fixes

* **images:** correct S3 credential env var names, drop OMR_IMAGES_ prefix
* **images:** disable fs source when configured directory is missing
* **images:** resolve sharp type-namespace and format-narrowing errors
* **images:** sharp fails to load in production container
