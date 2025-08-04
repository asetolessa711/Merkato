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


    // Find a customer and a vendor (roles is an array)
    const customer = await User.findOne({ roles: { $in: ['customer'] } });
    const vendor = await User.findOne({ roles: { $in: ['vendor'] } });
    const product = await Product.findOne({});
    if (!customer || !vendor || !product) throw new Error('Required user or product not found.');


    const orders = [
      {
        buyer: customer._id,
        vendor: vendor._id,
        products: [{ product: product._id, quantity: 2 }],
        status: 'pending',
        total: 99.99,
        createdAt: new Date(),
      },
      {
        buyer: customer._id,
        vendor: vendor._id,
        products: [{ product: product._id, quantity: 1 }],
        status: 'shipped',
        total: 49.99,
        createdAt: new Date(),
      },
    ];

    for (const order of orders) {
      await Order.create(order);
      console.log(`✅ Created order for customer: ${customer.email}`);
    }

    console.log('🎉 Order seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding orders:', err);
    process.exit(1);
  }
}

seedOrders();
