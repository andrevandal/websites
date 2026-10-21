# Security policy

## Report privately

Use [GitHub private vulnerability reporting](https://github.com/andrevandal/websites/security/advisories/new) to report a vulnerability. Include affected code, reproduction steps, impact and a safe proof of concept. The current tip is the supported security baseline; historical tags are not a supported release matrix.

Do not publish credentials, session tokens, private customer data or production exports in issues, pull requests, screenshots or logs. If a credential is exposed, notify its owner privately and rotate or revoke it through the owning service. Removing it from a new commit does not revoke it or remove historical copies.

Avoid probing live customer systems or modifying remote data to demonstrate a finding. Use local fixtures and the repository's credential-free checks where possible. Do not open a public issue if private reporting is unavailable; wait until a private channel with the maintainer is available.
