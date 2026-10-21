# Changelog

## 0.3.0 (2026-10-18)


### Features

* **ci:** fetch pedrohenridesign runtime secrets from Infisical over OIDC
* **ci:** fetch pedrohenridesign runtime secrets from Infisical over OIDC
* **ci:** inject per-stage runtime secrets from a validated JSON in the GitHub environment
* **pedrohenridesign:** accept optional S3_PORT and S3_USE_SSL in the stage secrets JSON
* **pedrohenridesign:** add d1 and r2 pr previews behind cloudflare access
* **pedrohenridesign:** add Pedro Henri Design website
* **pedrohenridesign:** add Pedro Henri Design website
* **pedrohenridesign:** add xl image tiers and an intrinsic size audit
* **pedrohenridesign:** align EmDash runtime adapters
* **pedrohenridesign:** enable deployed Worker observability
* **pedrohenridesign:** enable placeholders on every image and fix the logo boxes
* **pedrohenridesign:** move the Turso and S3 endpoint settings from Stage vars to Worker secrets
* **pedrohenridesign:** render SEO through EmDashHead and edit tracking IDs in the Analytics plugin
* **pedrohenridesign:** require EMDASH_ENCRYPTION_KEY as a Stage secret
* **pedrohenridesign:** run EmDash core migrations and preview setup in CI
* **pedrohenridesign:** seed through the shared emdash task so SEO panels and the default image land
* **pedrohenridesign:** send email through a JMAP plugin
* **pedrohenridesign:** send email through the JMAP plugin
* **pedrohenridesign:** serve dev media from the bucket and match live buttons and feature icons
* **pedrohenridesign:** serve the footer logo as a 5x png through sunpicture
* **scripts:** add a repo-level image audit cli
* **websites:** default local images to the staging image service


### Bug Fixes

* **ci:** drop orphaned deployment key from deploy strategy
* **ci:** read Infisical secrets from /websites/&lt;site&gt;
* **pedrohenridesign:** harden previews, images, navigation and canonicals
* **pedrohenridesign:** reserve full card width while images load


### Reverts

* **pedrohenridesign:** drop DEV_MEDIA_BASE_URL and skip the image service locally
* **pedrohenridesign:** drop optional S3_PORT and S3_USE_SSL

## 0.2.0 (2026-10-18)


### Features

* **ci:** fetch pedrohenridesign runtime secrets from Infisical over OIDC
* **ci:** fetch pedrohenridesign runtime secrets from Infisical over OIDC
* **ci:** inject per-stage runtime secrets from a validated JSON in the GitHub environment
* **pedrohenridesign:** accept optional S3_PORT and S3_USE_SSL in the stage secrets JSON
* **pedrohenridesign:** add d1 and r2 pr previews behind cloudflare access
* **pedrohenridesign:** add Pedro Henri Design website
* **pedrohenridesign:** add Pedro Henri Design website
* **pedrohenridesign:** add xl image tiers and an intrinsic size audit
* **pedrohenridesign:** align EmDash runtime adapters
* **pedrohenridesign:** enable deployed Worker observability
* **pedrohenridesign:** enable placeholders on every image and fix the logo boxes
* **pedrohenridesign:** move the Turso and S3 endpoint settings from Stage vars to Worker secrets
* **pedrohenridesign:** render SEO through EmDashHead and edit tracking IDs in the Analytics plugin
* **pedrohenridesign:** run EmDash core migrations and preview setup in CI
* **pedrohenridesign:** seed through the shared emdash task so SEO panels and the default image land
* **pedrohenridesign:** serve dev media from the bucket and match live buttons and feature icons
* **pedrohenridesign:** serve the footer logo as a 5x png through sunpicture
* **scripts:** add a repo-level image audit cli
* **websites:** default local images to the staging image service


### Bug Fixes

* **ci:** drop orphaned deployment key from deploy strategy
* **ci:** read Infisical secrets from /websites/&lt;site&gt;
* **pedrohenridesign:** harden previews, images, navigation and canonicals
* **pedrohenridesign:** reserve full card width while images load


### Reverts

* **pedrohenridesign:** drop DEV_MEDIA_BASE_URL and skip the image service locally
* **pedrohenridesign:** drop optional S3_PORT and S3_USE_SSL
