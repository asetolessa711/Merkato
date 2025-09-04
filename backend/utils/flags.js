// Centralized backend feature flags (default OFF)
// Use environment variables to control experimental features safely in CI/E2E

module.exports = {
  FEATURE_GAMIFICATION: process.env.FEATURE_GAMIFICATION === 'true',
  FEATURE_BEHAVIORAL_PROMOS: process.env.FEATURE_BEHAVIORAL_PROMOS === 'true',
};
