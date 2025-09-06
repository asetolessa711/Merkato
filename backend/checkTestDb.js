// checkTestDb.js
// Utility script to print users and products in the test database

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables in priority: .env.test.local > .env.test > .env
const envPaths = ['.env.test.local', '.env.test', '.env'];
let loaded = false;
for (const envFile of envPaths) {
  const fullPath = path.join(__dirname, envFile);
  if (fs.existsSync(fullPath)) {
    dotenv.config({ path: fullPath });
    loaded = true;
    break;
  }
}
if (!loaded) {
  console.warn('⚠️  No .env file found. Please create one.');
}

const User = require('./models/User');
const Product = require('./models/Product');

async function checkDb() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI is not set in environment variables.');
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB');

    const users = await User.find({});
    const products = await Product.find({});
    console.log(`Users (${users.length}):`);
    users.forEach(u => console.log(`- ${u.email} [roles: ${u.roles}]`));
    console.log(`Products (${products.length}):`);
    products.forEach(p => console.log(`- ${p.name}`));

    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking DB:', err);
    process.exit(1);
  }
}

checkDb();
