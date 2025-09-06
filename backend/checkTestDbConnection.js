// checkTestDbConnection.js
require('dotenv').config({ path: process.env.NODE_ENV === 'test' ? '.env.test.local' : '.env' });
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error('❌ No MONGO_URI found in environment.');
  process.exit(1);
}

console.log('🔍 Attempting to connect to MongoDB:', uri);

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('✅ MongoDB connection successful!');
    return mongoose.connection.close();
  })
  .then(() => {
    console.log('🔌 Connection closed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
