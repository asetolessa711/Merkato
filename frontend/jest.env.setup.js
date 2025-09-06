const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envFiles = [
  path.resolve(__dirname, '.env.test.local'),
  path.resolve(__dirname, '.env.test')
];

let loaded = false;

envFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    dotenv.config({ path: file, override: true });
    console.log(`✅ Loaded frontend test env from: ${file}`);
    loaded = true;
  }
});

if (!loaded) {
  console.warn('⚠️ No .env.test or .env.test.local found in frontend');
}
