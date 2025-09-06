require('../jest.env.setup');
const mongoose = require('mongoose');

const uri = process.env.MONGO_URI;
console.log('Testing MongoDB connection to:', uri);

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('✅ MongoDB connection successful!');
    return mongoose.disconnect();
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });
