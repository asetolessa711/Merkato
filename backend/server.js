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
const adminOrdersRoutes = require('./routes/adminOrders');
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
const testSeedOrdersRoute = require('./routes/testSeedOrdersRoute');

// 🚀 Initialize Express App
const app = express();

// ✅ Enable trust proxy to support rate limiters, logging behind proxies
app.set('trust proxy', 1); // This fixes the express-rate-limit warning

// 🧩 Middleware
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));
app.use('/api', testSeedOrdersRoute);

// 📦 API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/orders', adminOrdersRoutes);
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

// Global error handler (must be after all routes)
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// 🌐 Root Health Check
app.get('/', (req, res) => {
  res.send('Welcome to Merkato Backend API 🌍');
});

// 🌐 API Health Check (for CI wait-on)
app.get('/api', (req, res) => {
  res.status(200).json({ message: 'Backend is running ✅' });
});

// 🚦 MongoDB Connection (always connect, only start HTTP server if not in test mode)
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is not set in environment variables.');
  process.exit(1);
}

console.log(`🔍 [server.js] About to connect to MongoDB: ${process.env.MONGO_URI}`);
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ [server.js] MongoDB connected');

  if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
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
}).catch((err) => {
  console.error('❌ [server.js] MongoDB connection failed:', err.message);
  process.exit(1);
});

// Always log when mongoose.connect is called (for test runner)
mongoose.connection.on('connecting', () => {
  console.log('🔄 [server.js] Mongoose is connecting...');
});
mongoose.connection.on('connected', () => {
  console.log('✅ [server.js] Mongoose connected event fired');
});
mongoose.connection.on('error', (err) => {
  console.error('❌ [server.js] Mongoose connection error:', err.message);
});
mongoose.connection.on('disconnected', () => {
  console.log('🔌 [server.js] Mongoose disconnected');
});

// 🔁 Export app for testing with Supertest
module.exports = app;
