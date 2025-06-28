const express = require('express');
const router = express.Router();
const Product = require('../models/productModel');
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');

// Seed test users and products (advanced)
router.post('/seed', async (req, res) => {
  try {
    // Clean up test users and products
    await User.deleteMany({ email: /@example\.com$/ });
    await Product.deleteMany({ name: /Test Product/ });

    const hashedPassword = await bcrypt.hash('Password123!', 10);

    // Seed users
    const users = await User.create([
      {
        name: 'Test Customer',
        email: 'testuser@example.com',
        password: hashedPassword,
        role: 'customer',
        country: 'US'
      },
      {
        name: 'Test Admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        country: 'US'
      },
      {
        name: 'Test Vendor',
        email: 'vendor@example.com',
        password: hashedPassword,
        role: 'vendor',
        country: 'US'
      }
    ]);

    // Seed products
    const products = await Product.create([
      {
        name: 'Test Product 1',
        price: 19.99,
        stock: 10,
        description: 'E2E test product',
        category: 'general'
      },
      {
        name: 'Test Product 2',
        price: 29.99,
        stock: 5,
        description: 'Another E2E test product',
        category: 'general'
      },
      {
        name: 'Test Product 3',
        price: 49.99,
        stock: 0,
        description: 'Out of stock test product',
        category: 'general'
      }
    ]);

    res.status(200).json({
      message: 'Database seeded ✅',
      users,
      products
    });
  } catch (err) {
    console.error('Seeding error:', err.message);
    res.status(500).json({ error: 'Seeding failed ❌', details: err.message });
  }
});

module.exports = router;