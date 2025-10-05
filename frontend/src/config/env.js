// Environment configuration with sensible defaults for local dev and CI

const isCI = typeof process !== 'undefined' && process.env && process.env.CI === 'true';
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api';
const GUIDE_URL = process.env.REACT_APP_GUIDE_URL || 'https://github.com/asetolessa711/Merkato/blob/main/docs/MERKATO_RAILS_METRICS_ADMIN_GUIDE.md';

export const ENV = {
  isCI,
  API_BASE_URL,
  GUIDE_URL,
  // Feature flags commonly used in tests
  features: {
    mockUploads: true,
  },
};

export default ENV;

