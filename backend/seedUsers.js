const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/merkato';

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  roles: [String],
  country: { type: String, default: 'ET' }
});

const User = mongoose.model('User', userSchema);

const users = [
  {
    name: 'Customer One',
    email: 'customer@test.com',
    password: 'Password123!',
    roles: ['customer'],
  },
  {
    name: 'Vendor One',
    email: 'vendor@test.com',
    password: 'Password123!',
    roles: ['vendor'],
  },
  {
    name: 'Admin One',
    email: 'admin@test.com',
    password: 'Password123!',
    roles: ['admin'],
  },
  {
    name: 'Global Admin',
    email: 'global_admin@test.com',
    password: 'Password123!',
    roles: ['admin', 'global_admin'],
  },
  {
    name: 'Country Admin Ethiopia',
    email: 'country_admin_et@test.com',
    password: 'Password123!',
    roles: ['admin', 'country_admin'],
    country: 'ET'
  },
  {
    name: 'Country Admin Italy',
    email: 'country_admin_it@test.com',
    password: 'Password123!',
    roles: ['admin', 'country_admin'],
    country: 'IT'
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    for (const user of users) {
      const existing = await User.findOne({ email: user.email });
      if (existing) {
        console.log(`⚠️ User already exists: ${user.email}`);
        continue;
      }

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