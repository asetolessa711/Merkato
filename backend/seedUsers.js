// seedUsers.js

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI || 'mongodb://localhost:27017/merkato';

// Use the real User model so password hashing and methods work
const User = require('./models/User');

// Seed users with known password 'Password123!'
const users = [
  {
    name: 'Customer One',
    email: 'customer@test.com',
    password: 'Password123!',
    roles: ['customer'],
    country: 'ET'
  },
  {
    name: 'Vendor One',
    email: 'vendor@test.com',
    password: 'Password123!',
    roles: ['vendor'],
    country: 'ET'
  },
  {
    name: 'Admin One',
    email: 'admin@test.com',
    password: 'Password123!',
    roles: ['admin'],
    country: 'ET'
  },
  {
    name: 'Global Admin',
    email: 'global_admin@test.com',
    password: 'Password123!',
    roles: ['admin', 'global_admin'],
    country: 'ET'
  },
  {
    name: 'Country Admin',
    email: 'country_admin@test.com',
    password: 'Password123!',
    roles: ['admin', 'country_admin'],
    country: 'ET'
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    await User.deleteMany({});
    console.log('🧹 Existing users removed');

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const newUser = new User({
        ...user,
        password: hashedPassword
      });
      await newUser.save();
      console.log(`✅ Created user: ${user.email}`);
    }

    console.log('🎉 Seeding complete');
    process.exit();
  } catch (err) {
    console.error('❌ Error seeding users:', err);
    process.exit(1);
  }
}

seed();
