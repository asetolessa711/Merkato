# Feature Flags

Environment variables (frontend) to gate new engagement features:

- REACT_APP_FEATURE_GAMIFICATION=false
- REACT_APP_FEATURE_BEHAVIORAL_PROMOS=false

Default them to false in CI and E2E to avoid DOM changes and keep tests stable. Enable locally by creating `frontend/.env.local` with:

REACT_APP_FEATURE_GAMIFICATION=true
REACT_APP_FEATURE_BEHAVIORAL_PROMOS=true
