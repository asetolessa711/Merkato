// backend/seedFeedback.js
// Script to seed the Feedback collection with example feedback for test automation


// Load environment variables in priority: .env.test.local > .env.test > .env
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
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

const mongoose = require('mongoose');
const User = require('./models/User');
const Feedback = require('./models/Feedback');

async function seedFeedback() {
  try {

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not set in environment variables.');
    }
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Remove existing feedback
    await Feedback.deleteMany({});
    console.log('🧹 Existing feedback removed');

    // Find two users to associate feedback with
    const users = await User.find({}).limit(2);
    if (users.length < 2) {
      throw new Error('Not enough users found to seed feedback. Please seed users first.');
    }

    const feedbacks = [
      {
        user: users[0]._id,
        message: 'Great platform, easy to use!',
        type: 'general',
        createdAt: new Date(),
      },
      {
        user: users[1]._id,
        message: 'Had an issue with my order, but support was helpful.',
        type: 'support',
        createdAt: new Date(),
      },
    ];

    for (const fb of feedbacks) {
      await Feedback.create(fb);
      console.log(`✅ Created feedback: ${fb.message}`);
    }

    console.log('🎉 Feedback seeding complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding feedback:', err);
    process.exit(1);
  }
}

seedFeedback();
