const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/merkato';

// Inline schema definition (if not using models/User.js)
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  roles: [String],
  country: { type: String, default: 'ET' } // Useful for country-specific admins
});

const User = mongoose.model('User', userSchema);

// Unified and standardized user list
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
    country: 'ET' // Can later be changed to 'IT', 'KE', etc. dynamically
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear all existing users before seeding
    await User.deleteMany({});
    console.log('🧹 Existing users removed');

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const newUser = new User({
        name: user.name,
        email: user.email,
        password: hashedPassword,
        roles: user.roles,
        country: user.country
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
