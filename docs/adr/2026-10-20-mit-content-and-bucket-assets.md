# Separate MIT implementation from reserved site content

## Context

Reusable website implementation can be shared publicly without granting rights over customer identity, copy, data, artwork or embedded media. Public asset delivery must not imply a licence grant.

## Decision

License reusable implementation under MIT, with existing third-party notices preserved. Each website reserves its owner material with no licence granted. Mixed source carries both MIT and reserved-content obligations; MIT covers implementation only.

Record file-level rights with REUSE annotations instead of boilerplate in every source file. Pure website assets, icons, seed material and data carry the content identifier. Mixed source includes both holders. Explicit third-party material retains its own terms.

Serve original website assets directly from public bucket URLs. Non-CMS sites commit their public-base default in Astro configuration. Standard CMS runtime derives its public base from endpoint and bucket unless explicitly supplied. Preview storage remains isolated.

## Alternatives rejected

A blanket MIT grant misrepresents content rights. A private-only repository prevents implementation reuse. Treating publicly readable media as freely reusable confuses delivery with permission. Keeping fonts and large delivery images in history adds repository weight without establishing rights.

## Consequences

Contributors must separate reusable implementation from embedded customer material and obtain permission for new content. REUSE lint validates metadata coverage, not ownership. Content users need permission from the relevant holder even when an asset is publicly accessible. Bucket availability is an operational dependency, not a code licence.
