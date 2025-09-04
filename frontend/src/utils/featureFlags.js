export const Flags = {
  GAMIFICATION: process.env.REACT_APP_FEATURE_GAMIFICATION === 'true',
  BEHAVIORAL_PROMOS: process.env.REACT_APP_FEATURE_BEHAVIORAL_PROMOS === 'true',
};

export const isTestEnv = () => typeof window !== 'undefined' && (window.Cypress || process.env.NODE_ENV === 'test');
