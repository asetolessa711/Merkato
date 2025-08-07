// backend/seedOrders.js
// Script to seed the Order collection with example orders for test automation

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
const Order = require('./models/Order');

async function seedOrders() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI is not set in environment variables.');
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB');

    await Order.deleteMany({});
    console.log('🧹 Existing orders removed');


    // Create test users if not exist
    const admin = await User.findOneAndUpdate(
      { email: 'admin@test.com' },
      { $setOnInsert: { name: 'Admin', email: 'admin@test.com', password: 'admin123', roles: ['admin'] } },
      { upsert: true, new: true }
    );
    const vendor = await User.findOneAndUpdate(
      { email: 'vendor@test.com' },
      { $setOnInsert: { name: 'Vendor', email: 'vendor@test.com', password: 'vendor123', roles: ['vendor'] } },
      { upsert: true, new: true }
    );
    const customer = await User.findOneAndUpdate(
      { email: 'customer@test.com' },
      { $setOnInsert: { name: 'Customer', email: 'customer@test.com', password: 'customer123', roles: ['customer'] } },
      { upsert: true, new: true }
    );

    // Create test product if not exist
    const product = await Product.findOneAndUpdate(
      { name: 'Widget' },
      { $setOnInsert: { name: 'Widget', price: 10, vendor: vendor._id } },
      { upsert: true, new: true }
    );

    if (!admin || !vendor || !customer || !product) throw new Error('Required test user or product not found or created.');

    // Seed test orders
    const orders = [
      {
        buyer: customer._id,
        vendor: vendor._id,
        products: [{ product: product._id, quantity: 2 }],
        status: 'pending',
        total: 20,
        createdAt: new Date(),
      },
      {
        buyer: customer._id,
        vendor: vendor._id,
        products: [{ product: product._id, quantity: 1 }],
        status: 'shipped',
        total: 10,
        createdAt: new Date(),
      },
    ];

    for (const order of orders) {
      await Order.create(order);
      console.log(`✅ Created order for customer: ${customer.email}`);
    }

    console.log('🎉 Order seeding complete');

    // Only exit if called from CLI
    if (require.main === module) {
      process.exit(0);
    }
  } catch (err) {
    console.error('❌ Error seeding orders:', err);
    if (require.main === module) {
      process.exit(1);
    } else {
      throw err;
    }
  }
}

// Export for Express route
module.exports = seedOrders;

// CLI support
if (require.main === module) {
  seedOrders();
}
