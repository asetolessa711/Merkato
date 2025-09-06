const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Product = require('../../models/productModel');
const User = require('../../models/userModel');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/merkato-test';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);

    await User.deleteMany({ email: /@example\.com$/ });
    await Product.deleteMany({ name: /Test Product/ });

    const hashedPassword = await bcrypt.hash('Password123!', 10);

    await User.create([
      {
        name: 'Test Customer',
        email: 'testuser@example.com',
        password: hashedPassword,
        role: 'customer',
        country: 'US',
      },
      {
        name: 'Test Admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        country: 'US',
      },
      {
        name: 'Test Vendor',
        email: 'vendor@example.com',
        password: hashedPassword,
        role: 'vendor',
        country: 'US',
      }
    ]);

    await Product.create([
      {
        name: 'Test Product 1',
        price: 19.99,
        stock: 10,
        description: 'E2E test product',
        category: 'general',
      },
      {
        name: 'Test Product 2',
        price: 29.99,
        stock: 5,
        description: 'Another E2E test product',
        category: 'general',
      },
      {
        name: 'Test Product 3',
        price: 49.99,
        stock: 0,
        description: 'Out of stock test product',
        category: 'general',
      }
    ]);

    console.log('✅ Test DB seeded');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
