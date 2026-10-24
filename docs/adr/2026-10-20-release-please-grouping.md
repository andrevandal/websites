# Group component releases with release-please

## Context

Release-please can list both a merged PR and its branch commits at the same changelog level. Independent component versions also need stable routing from changed paths to tags and production delivery.

## Decision

Keep the release grouping step: retain the merged PR's main changelog entry and nest its branch entries beneath it in changelogs and release notes. Preserve descriptions instead of discarding detail or presenting the same work twice at the same level.

Use an explicit component map with stable website keys and images-app for the image service. Root releases use plain version tags without a component prefix; component tags retain their mapped prefixes. Preserve existing versions. Release automation owns version files and changelog updates. Website production promotes validated staging artifacts without rebuilding; image releases dispatch their separate container workflow. All release-writing jobs retain the non-fork guard.

## Alternatives rejected

Leaving duplicate top-level entries obscures the PR-sized change. Dropping branch entries loses useful detail. Hand-maintained versions or tags bypass the component map, and rebuilding websites at release time weakens artifact continuity.

## Consequences

Path, component, manifest, workflow and tag mappings must change together when a machine key changes. Group-merge behavior needs regression coverage. Historical tags label prior repository states; only the current tip is promised to build. A successful release job is not evidence of production data or integration correctness.
