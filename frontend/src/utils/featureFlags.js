export const Flags = {
  GAMIFICATION: process.env.REACT_APP_FEATURE_GAMIFICATION === 'true',
  BEHAVIORAL_PROMOS: process.env.REACT_APP_FEATURE_BEHAVIORAL_PROMOS === 'true',
  // UI/layout toggles (safe defaults OFF)
  HOME_MICRO_BELOW: process.env.REACT_APP_FEATURE_HOME_MICRO_BELOW === 'true',
  NAVBAR_TALL: process.env.REACT_APP_FEATURE_NAVBAR_TALL === 'true',
  // Cards/UI experiments
  CARD_ENHANCED: process.env.REACT_APP_FEATURE_CARD_ENHANCED === 'true',
  // Backend-powered rails selection (off by default; enable with REACT_APP_FEATURE_RAILS_REMOTE=true)
  RAILS_REMOTE: process.env.REACT_APP_FEATURE_RAILS_REMOTE === 'true',
  // Browse UX experiments
  BROWSE_LOAD_MORE: process.env.REACT_APP_FEATURE_BROWSE_LOAD_MORE === 'true',
};

export const isTestEnv = () => typeof window !== 'undefined' && (window.Cypress || process.env.NODE_ENV === 'test');
