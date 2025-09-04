# Project Boundaries: Merkato vs. Waliin

This repository is Merkato. To avoid cross-environment leakage with Waliin:

- Do not reference Waliin service URLs, env vars, or asset buckets here.
- Use MERKATO_* environment variables exclusively in this repo.
- For test emails, set MERKATO_TEST_EMAIL_TO; never hardcode other project emails.
- Keep reward/points, tiers, and feature flags scoped to Merkato naming.
- If you contribute to both projects, maintain separate .env files per repo.

Suggested env keys for Merkato
- MERKATO_TEST_EMAIL_TO
- REACT_APP_FEATURE_GAMIFICATION
- REACT_APP_FEATURE_BEHAVIORAL_PROMOS

## Automated boundary guard

- A guard runs at backend startup, in the unified test runner, and before E2E runs:
	- Script: `scripts/guard-boundaries.js`
	- Blocks env leaks like `WALIIN_*` or values containing "waliin" in critical keys.
	- In tests/CI, requires local DB URIs (no mongodb+srv / remote hosts).
	- Warns on real email provider config unless `MERKATO_TEST_EMAIL_TO` is set.
	- Fails fast to prevent cross-environment contamination.