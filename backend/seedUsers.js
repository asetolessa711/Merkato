// seedUsers.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/merkato';

// Inline schema definition (if models/User.js isn't used)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  roles: [String],
  country: { type: String, default: 'ET' }
});

const User = mongoose.model('User', userSchema);

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
