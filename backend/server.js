const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// 🛠 Mongoose Config
mongoose.set('strictQuery', false);

// 🔀 Route Imports
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminRoutes = require('./routes/adminRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const vendorPromoRoutes = require('./routes/vendorPromoRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const supportRoutes = require('./routes/supportRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const orderRoutes = require('./routes/orderRoutes');
const stripeRoutes = require('./routes/stripeRoutes');
const telebirrRoutes = require('./routes/telebirrRoutes');
const flagRoutes = require('./routes/flagRoutes');
const reviewModerationRoutes = require('./routes/reviewModerationRoutes');
const customerRoutes = require('./routes/customerRoutes');
const emailInvoiceRoutes = require('./routes/emailInvoiceRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const devSeedRoute = require('./routes/devSeedRoute');
const testEmailRoute = require('./routes/testEmailRoute');

// 🚀 Initialize Express App
const app = express();

// 🧩 Middleware
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

// 📦 API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/vendor-promos', vendorPromoRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/telebirr', telebirrRoutes);
app.use('/api/flags', flagRoutes);
app.use('/api/admin/reviews', reviewModerationRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/email', emailInvoiceRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dev', devSeedRoute);
app.use('/api/test-email', testEmailRoute);

// 🌐 Root Health Check
app.get('/', (req, res) => {
  res.send('Welcome to Merkato Backend API 🌍');
});

// 🌐 API Health Check (for CI wait-on)
app.get('/api', (req, res) => {
  res.status(200).json({ message: 'Backend is running ✅' });
});

// 🚦 Start Server (only if not in test mode)
if (process.env.NODE_ENV !== 'test') {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not set in environment variables.');
    process.exit(1);
  }

  let server;
  mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
    console.log('✅ MongoDB connected');

    const PORT = process.env.PORT || 5000;
    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  }).catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

  // 🔄 Graceful Shutdown Handling
  const shutdown = () => {
    console.log('\n🛑 Shutting down server...');
    if (server) {
      server.close(() => {
        mongoose.connection.close(false, () => {
          console.log('🛑 MongoDB connection closed.');
          process.exit(0);
        });
      });
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// 🔁 Export app for testing with Supertest
module.exports = app;
