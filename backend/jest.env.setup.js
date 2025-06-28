const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envFiles = [
  path.resolve(__dirname, '.env.test.local'),
  path.resolve(__dirname, '.env.test')
];

let loadedAny = false;

envFiles.forEach((envPath) => {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    console.log(`✅ Loaded test environment from ${envPath}`);
    loadedAny = true;
  }
});

if (!loadedAny) {
  console.warn('⚠️ No .env.test or .env.test.local file found in backend directory.');
}
