// Always load test environment for standalone scripts
require('../jest.env.setup');
console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Loaded from:', process.env._ENV_FILE || 'unknown');
