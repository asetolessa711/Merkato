// backend/seedReviews.js
// Script to seed the Review collection with example reviews for test automation

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
const Review = require('./models/Review');

async function seedReviews() {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI is not set in environment variables.');
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB');

    await Review.deleteMany({});
    console.log('🧹 Existing reviews removed');

    // Find a customer and a product
    const customer = await User.findOne({ roles: { $in: ['customer'] } });
    const product = await Product.findOne({});
    if (!customer || !product) throw new Error('Required user or product not found.');

    const reviews = [
      {
        user: customer._id,
        product: product._id,
        rating: 5,
        comment: 'Excellent product! Highly recommend.',
        createdAt: new Date(),
      },
      {
        user: customer._id,
        product: product._id,
        rating: 4,
        comment: 'Good value for the price.',
        createdAt: new Date(),
      },
    ];

    for (const review of reviews) {
      await Review.create(review);
      console.log(`✅ Created review: ${review.comment}`);
    }

    console.log('🎉 Review seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding reviews:', err);
    process.exit(1);
  }
}

seedReviews();
