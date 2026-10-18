# Changelog

## [0.3.0](https://github.com/andrevandal/websites/compare/pedrohenri-v0.2.0...pedrohenridesign-v0.3.0) (2026-10-18)


### Features

* **ci:** fetch pedrohenri runtime secrets from Infisical over OIDC
* **ci:** fetch pedrohenri runtime secrets from Infisical over OIDC
* **ci:** inject per-stage runtime secrets from a validated JSON in the GitHub environment
* **pedrohenri:** accept optional S3_PORT and S3_USE_SSL in the stage secrets JSON
* **pedrohenri:** add d1 and r2 pr previews behind cloudflare access
* **pedrohenri:** add Pedro Henri Design website
* **pedrohenri:** add Pedro Henri Design website
* **pedrohenri:** add xl image tiers and an intrinsic size audit
* **pedrohenri:** align EmDash runtime adapters
* **pedrohenri:** enable deployed Worker observability
* **pedrohenri:** enable placeholders on every image and fix the logo boxes
* **pedrohenri:** move the Turso and S3 endpoint settings from Stage vars to Worker secrets
* **pedrohenri:** render SEO through EmDashHead and edit tracking IDs in the Analytics plugin
* **pedrohenri:** require EMDASH_ENCRYPTION_KEY as a Stage secret
* **pedrohenri:** run EmDash core migrations and preview setup in CI
* **pedrohenri:** seed through the shared emdash task so SEO panels and the default image land
* **pedrohenri:** send email through a JMAP plugin
* **pedrohenri:** send email through the JMAP plugin
* **pedrohenri:** serve dev media from the bucket and match live buttons and feature icons
* **pedrohenri:** serve the footer logo as a 5x png through sunpicture
* **scripts:** add a repo-level image audit cli
* **websites:** default local images to the staging image service


### Bug Fixes

* **ci:** drop orphaned deployment key from deploy strategy
* **ci:** read Infisical secrets from /websites/&lt;site&gt;
* **pedrohenri:** harden previews, images, navigation and canonicals
* **pedrohenri:** reserve full card width while images load


### Reverts

* **pedrohenri:** drop DEV_MEDIA_BASE_URL and skip the image service locally
* **pedrohenri:** drop optional S3_PORT and S3_USE_SSL

## [0.2.0](https://github.com/andrevandal/websites/compare/pedrohenri-v0.1.0...pedrohenri-v0.2.0) (2026-10-18)


### Features

* **ci:** fetch pedrohenri runtime secrets from Infisical over OIDC
* **ci:** fetch pedrohenri runtime secrets from Infisical over OIDC
* **ci:** inject per-stage runtime secrets from a validated JSON in the GitHub environment
* **pedrohenri:** accept optional S3_PORT and S3_USE_SSL in the stage secrets JSON
* **pedrohenri:** add d1 and r2 pr previews behind cloudflare access
* **pedrohenri:** add Pedro Henri Design website
* **pedrohenri:** add Pedro Henri Design website
* **pedrohenri:** add xl image tiers and an intrinsic size audit
* **pedrohenri:** align EmDash runtime adapters
* **pedrohenri:** enable deployed Worker observability
* **pedrohenri:** enable placeholders on every image and fix the logo boxes
* **pedrohenri:** move the Turso and S3 endpoint settings from Stage vars to Worker secrets
* **pedrohenri:** render SEO through EmDashHead and edit tracking IDs in the Analytics plugin
* **pedrohenri:** run EmDash core migrations and preview setup in CI
* **pedrohenri:** seed through the shared emdash task so SEO panels and the default image land
* **pedrohenri:** serve dev media from the bucket and match live buttons and feature icons
* **pedrohenri:** serve the footer logo as a 5x png through sunpicture
* **scripts:** add a repo-level image audit cli
* **websites:** default local images to the staging image service


### Bug Fixes

* **ci:** drop orphaned deployment key from deploy strategy
* **ci:** read Infisical secrets from /websites/&lt;site&gt;
* **pedrohenri:** harden previews, images, navigation and canonicals
* **pedrohenri:** reserve full card width while images load


### Reverts

* **pedrohenri:** drop DEV_MEDIA_BASE_URL and skip the image service locally
* **pedrohenri:** drop optional S3_PORT and S3_USE_SSL
