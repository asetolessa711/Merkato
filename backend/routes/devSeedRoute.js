const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Seed test users and products for E2E (idempotent)
router.post('/seed', async (req, res) => {
  try {
    const password = 'Password123!';
    const ensureUser = async (name, email, roles, country) => {
      let user = await User.findOne({ email });
      if (!user) {
        const hash = await bcrypt.hash(password, 10);
        user = await User.create({ name, email, password: hash, roles, country });
      }
      return user;
    };

    const customer = await ensureUser('Customer One', 'customer@test.com', ['customer'], 'US');
    const vendor = await ensureUser('Vendor One', 'vendor@test.com', ['vendor'], 'US');
    await ensureUser('Admin One', 'admin@test.com', ['admin'], 'US');
    await ensureUser('Global Admin', 'global_admin@test.com', ['admin', 'global_admin'], 'US');
    await ensureUser('Country Admin', 'country_admin@test.com', ['admin', 'country_admin'], 'US');

    const ensureProduct = async (doc) => {
      let p = await Product.findOne({ name: doc.name });
      if (!p) p = await Product.create(doc);
      return p;
    };

    // Seed a predictable product used by E2E
    const cypressProduct = await ensureProduct({
      name: 'Cypress Test Product',
      description: 'Product used in Cypress E2E tests',
      price: 9.99,
      currency: 'USD',
      category: 'general',
      stock: 50,
      vendor: vendor._id,
    });

    // Additional sample products
    await ensureProduct({
      name: 'Test Product 1',
      description: 'E2E test product',
      price: 19.99,
      currency: 'USD',
      category: 'general',
      stock: 10,
      vendor: vendor._id,
    });
    await ensureProduct({
      name: 'Test Product 2',
      description: 'Another E2E test product',
      price: 29.99,
      currency: 'USD',
      category: 'general',
      stock: 5,
      vendor: vendor._id,
    });

    res.status(200).json({
      message: 'Database seeded ✅',
      users: {
        customer: customer.email,
        vendor: vendor.email,
        admin: 'admin@test.com',
        global_admin: 'global_admin@test.com',
        country_admin: 'country_admin@test.com',
      },
      products: ['Cypress Test Product', 'Test Product 1', 'Test Product 2']
    });
  } catch (err) {
    console.error('Seeding error:', err);
    res.status(500).json({ error: 'Seeding failed ❌', details: err.message });
  }
});

module.exports = router;
