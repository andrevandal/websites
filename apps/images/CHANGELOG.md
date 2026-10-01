# Changelog

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
