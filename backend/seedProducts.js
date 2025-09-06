// seedProducts.js

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

const Product = require('./models/Product');
const User = require('./models/User');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI || 'mongodb://127.0.0.1:27017/merkato';

async function seedProducts() {
  try {

    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB');

    // Find a vendor user (roles is an array)
    const vendor = await User.findOne({ roles: { $in: ['vendor'] } });
    if (!vendor) {
      throw new Error('No vendor user found. Please seed users first.');
    }

    // Remove existing products
    await Product.deleteMany({});
    console.log('🧹 Existing products removed');

    // Example products
    const products = [
      {
        name: 'Test Product 1',
        description: 'A sample product for testing.',
        price: 100,
        category: 'Electronics',
        stock: 50,
        vendor: vendor._id,
        promotion: { isPromoted: true, badgeText: 'Hot' }
      },
      {
        name: 'Test Product 2',
        description: 'Another test product.',
        price: 50,
        category: 'Fashion',
        stock: 30,
        vendor: vendor._id,
        promotion: { isPromoted: false, badgeText: '' }
      }
    ];

    for (const prod of products) {
      await Product.create(prod);
      console.log(`✅ Created product: ${prod.name}`);
    }

    console.log('🎉 Product seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding products:', err);
    process.exit(1);
  }
}

seedProducts();
