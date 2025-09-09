# Feature Flags

Environment variables to gate new engagement features. Keep them conservative (false) by default for CI/E2E stability.

- Frontend envs: `REACT_APP_FEATURE_GAMIFICATION`, `REACT_APP_FEATURE_BEHAVIORAL_PROMOS`
- Backend envs (optional overrides): `FEATURE_GAMIFICATION`, `FEATURE_BEHAVIORAL_PROMOS`

Backend public endpoint
- `GET /api/feature-flags` returns `{ flags: { gamification: boolean, behavioralPromos: boolean } }`
- Resolution order per flag: backend-specific env (FEATURE_*), then frontend-style env (REACT_APP_*), defaulting to false.

Enable locally by creating `frontend/.env.local` (and/or backend `.env.local`) with, for example:

REACT_APP_FEATURE_GAMIFICATION=true
REACT_APP_FEATURE_BEHAVIORAL_PROMOS=true
