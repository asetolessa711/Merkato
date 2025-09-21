const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// 🛠 Mongoose Config
mongoose.set("strictQuery", false);
const IS_TEST = !!process.env.JEST_WORKER_ID || process.env.NODE_ENV === "test";
const tlog = (...args) => {
  if (!IS_TEST) console.log(...args);
};
const terror = (...args) => {
  if (!IS_TEST) console.error(...args);
};

// 🔀 Route Imports
// Helper to optionally load a route module if it exists and return a valid Express router/function
function tryRequireRoute(p) {
  try {
    const mod = require(p);
    // Normalize CommonJS and ESM default exports, and ignore empty objects
    const router =
      typeof mod === "function"
        ? mod
        : mod && typeof mod.default === "function"
          ? mod.default
          : null;
    if (!router) {
      tlog(`[server] Optional route present but empty or invalid: ${p}`);
    }
    return router;
  } catch (e) {
    if (e && e.code === "MODULE_NOT_FOUND") {
      tlog(`[server] Optional route missing: ${p}`);
      return null;
    }
    throw e;
  }
}
const codexRoutes = require("./routes/codex");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const adminRoutes = require("./routes/adminRoutes");
const adminOrdersRoutes = require("./routes/adminOrders");
const vendorRoutes = require("./routes/vendorRoutes");
const vendorPromoRoutes = require("./routes/vendorPromoRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const supportRoutes = require("./routes/supportRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const orderRoutes = require("./routes/orderRoutes");
const stripeRoutes = require("./routes/stripeRoutes");
const telebirrRoutes = require("./routes/telebirrRoutes");
const flagRoutes = require("./routes/flagRoutes");
const reviewModerationRoutes = require("./routes/reviewModerationRoutes");
const customerRoutes = require("./routes/customerRoutes");
const emailInvoiceRoutes = require("./routes/emailInvoiceRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const featureFlagRoutes = require("./routes/featureFlagRoutes");
const behaviorRoutes = require("./routes/behaviorRoutes");
const megaMenuRoutes = require("./routes/megaMenuRoutes");
const themeRoutes = require("./routes/themeRoutes");
const geoRoutes = require("./routes/geoRoutes");
const searchRoutes = require("./routes/searchRoutes");
const devSeedRoute = require("./routes/devSeedRoute");
const testSeedOrdersRoute = require("./routes/testSeedOrdersRoute");
const testSeedInvoicesRoute = require("./routes/testSeedInvoicesRoute");
const testEmailRoute = require("./routes/testEmailRoute");
const taskRoutes = require("./routes/taskRoutes");
const cartRoutes = tryRequireRoute("./routes/cartRoutes");
const paymentsRoutes = tryRequireRoute("./routes/paymentsRoutes");
const rewardsRoutes = require("./routes/rewardsRoutes");
const referralRoutes = tryRequireRoute("./routes/referralRoutes");
const bundlesRoutes = tryRequireRoute("./routes/bundlesRoutes");

// 🚀 Initialize Express App
const app = express();

// ✅ Enable trust proxy to support rate limiters, logging behind proxies
app.set("trust proxy", 1); // This fixes the express-rate-limit warning

// 🧩 Middleware
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

// 📦 API Routes
app.use("/api", codexRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);
// Mount dedicated Admin Orders routes under /api/admin/orders
app.use("/api/admin/orders", adminOrdersRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/vendor-promos", vendorPromoRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/stripe", stripeRoutes);
app.use("/api/telebirr", telebirrRoutes);
if (paymentsRoutes) app.use("/api/payments", paymentsRoutes);
if (cartRoutes) app.use("/api/cart", cartRoutes);
app.use("/api/rewards", rewardsRoutes);
if (referralRoutes) app.use("/api/referrals", referralRoutes);
app.use("/api/flags", flagRoutes);
app.use("/api/admin/reviews", reviewModerationRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/email", emailInvoiceRoutes);
app.use("/api/feature-flags", featureFlagRoutes);
app.use("/api", megaMenuRoutes);
app.use("/api", themeRoutes);
app.use("/api/geo", geoRoutes);
app.use("/api", searchRoutes);

app.use("/api/invoices", invoiceRoutes);
if (bundlesRoutes) app.use("/api/products", bundlesRoutes);
app.use("/api/behavior", behaviorRoutes);
app.use("/api/dev", devSeedRoute);
app.use("/api", testSeedOrdersRoute);
app.use("/api", testSeedInvoicesRoute);
app.use("/api/test-email", testEmailRoute);
app.use("/api", taskRoutes);

// Global error handler (must be after all routes)
app.use((err, req, res, next) => {
  console.error("[Global Error Handler]", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
});

// 🌐 Root Health Check
app.get("/", (req, res) => {
  res.send("Welcome to Merkato Backend API 🌍");
});

// 🌐 API Health Check (for CI wait-on)
app.get("/api", (req, res) => {
  res.status(200).json({ message: "Backend is running ✅" });
});

// �️ MongoDB Connection (resilient with fallback)
function getMongoUriCandidates() {
  const primary = process.env.MONGO_URI || "";
  const fallback = process.env.MONGO_URI_FALLBACK || ""; // e.g., a direct mongodb://host:port/db
  const local = process.env.MONGO_URI_LOCAL || process.env.MONGO_LOCAL || ""; // local dev convenience
  const list = [];
  if (primary) list.push(primary);
  if (fallback && fallback !== primary) list.push(fallback);
  if (local && local !== primary && local !== fallback) list.push(local);
  return list;
}

async function connectMongoWithFallback() {
  const uris = getMongoUriCandidates();
  if (!uris.length) {
    console.error("❌ No MongoDB URI provided. Set MONGO_URI (and optionally MONGO_URI_FALLBACK or MONGO_URI_LOCAL).");
    process.exit(1);
  }

  const opts = {
    // modern driver uses these by default; include explicit timeouts
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
    connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 10000),
    socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 45000),
  };

  let lastErr;
  for (const uri of uris) {
    if (!IS_TEST) console.log(`🔍 [server.js] About to connect to MongoDB: ${uri}`);
    try {
      await mongoose.connect(uri, opts);
      tlog("✅ [server.js] MongoDB connected");
      return; // success
    } catch (err) {
      lastErr = err;
      const msg = (err && err.message) || String(err);
      terror("❌ [server.js] MongoDB connection failed:", msg);
      // Special guidance for SRV/DNS issues common on Windows/corporate networks
      if (/querySrv\s+ESERVFAIL|ENOTFOUND|EAI_AGAIN/i.test(msg) && /mongodb\+srv/i.test(uri)) {
        console.error(
          "ℹ️ SRV lookup failed. Consider: (1) switching DNS (e.g., 8.8.8.8), (2) using a direct mongodb:// URI in MONGO_URI_FALLBACK, or (3) running a local MongoDB and setting MONGO_URI_LOCAL."
        );
      }
    }
  }

  // If all candidates failed, exit (nodemon will retry). In CI, fail fast.
  if (lastErr) {
    process.exitCode = 1;
    // Give a moment for logs to flush before exit in some environments
    setTimeout(() => process.exit(1), 100);
  }
}

connectMongoWithFallback().then(() => {
  if (require.main === module) {
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // 🔄 Graceful Shutdown Handling
    const shutdown = () => {
      console.log("\n🛑 Shutting down server...");
      if (server) {
        server.close(() => {
          mongoose.connection.close(false, () => {
            console.log("🛑 MongoDB connection closed.");
            process.exit(0);
          });
        });
      }
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
});

// Attach mongoose connection logs only outside of test environment to avoid noisy post-run logs
if (process.env.NODE_ENV !== "test") {
  mongoose.connection.on("connecting", () => {
    tlog("🔄 [server.js] Mongoose is connecting...");
  });
  mongoose.connection.on("connected", () => {
    tlog("✅ [server.js] Mongoose connected event fired");
  });
  mongoose.connection.on("error", (err) => {
    terror("❌ [server.js] Mongoose connection error:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    tlog("🔌 [server.js] Mongoose disconnected");
  });
}

// 🔁 Export app for testing with Supertest
module.exports = app;
