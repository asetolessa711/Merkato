# Feature Flags

Environment variables to gate new engagement features. Keep them conservative (false) by default for CI/E2E stability.

- Frontend envs: `REACT_APP_FEATURE_GAMIFICATION`, `REACT_APP_FEATURE_BEHAVIORAL_PROMOS`, `REACT_APP_MICROBAR_ENABLED`
- Backend envs (optional overrides): `FEATURE_GAMIFICATION`, `FEATURE_BEHAVIORAL_PROMOS`

Backend public endpoint
- `GET /api/feature-flags` returns `{ flags: { gamification: boolean, behavioralPromos: boolean } }`
- Resolution order per flag: backend-specific env (FEATURE_*), then frontend-style env (REACT_APP_*), defaulting to false.

Enable locally by creating `frontend/.env.local` (and/or backend `.env.local`) with, for example:

REACT_APP_FEATURE_GAMIFICATION=true
REACT_APP_FEATURE_BEHAVIORAL_PROMOS=true

# Microbar (top compact strip)
# Disabled by default. Set to true to enable rendering.
REACT_APP_MICROBAR_ENABLED=true

Notes
- If `REACT_APP_MICROBAR_ENABLED` is not set (or set to `false`), the microbar will not render at all, avoiding visual/layout risk during CI, E2E, and local dev.
- When enabled, the microbar content is sourced from admin-configured messages when available; otherwise it falls back to safe defaults.
