const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const CANONICAL_DB_NAMES = {
  dev: 'merkato-dev',
  test: 'merkato_test',
  e2e: 'merkato_e2e',
};

function parseArgs(argv) {
  const args = {};
  for (const raw of argv) {
    if (!raw.startsWith('--')) continue;
    const [k, v] = raw.slice(2).split('=');
    args[k] = v === undefined ? true : v;
  }
  return args;
}

function getTargetFromArgs(args) {
  const target = String(args.env || 'dev').toLowerCase();
  if (!CANONICAL_DB_NAMES[target]) {
    throw new Error(`Unsupported --env value: ${target}. Use dev, test, or e2e.`);
  }
  return target;
}

function loadEnvForTarget(target) {
  const backendRoot = path.resolve(__dirname, '..', '..');
  const envFilesByTarget = {
    dev: ['.env.local', '.env'],
    test: ['.env.test.local', '.env.test', '.env.local', '.env'],
    e2e: ['.env.e2e.local', '.env.e2e', '.env.local', '.env'],
  };

  const loaded = [];
  for (const rel of envFilesByTarget[target] || []) {
    const envPath = path.join(backendRoot, rel);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false });
      loaded.push(envPath);
    }
  }

  return loaded;
}

function defaultMongoUriForDb(dbName) {
  const host = process.env.MONGO_HOST || '127.0.0.1';
  const port = process.env.MONGO_PORT || '27017';
  return `mongodb://${host}:${port}/${dbName}`;
}

function resolveMongoUri(target) {
  const dbName = CANONICAL_DB_NAMES[target];
  const envVar = target === 'dev'
    ? process.env.MONGO_URI_DEV || process.env.MONGO_URI
    : target === 'test'
      ? process.env.MONGO_URI_TEST
      : process.env.MONGO_URI_E2E;

  const resolved = envVar || defaultMongoUriForDb(dbName);
  return { dbName, uri: resolved };
}

function canonicalModelFiles() {
  const modelsDir = path.resolve(__dirname, '..', '..', 'models');
  return fs
    .readdirSync(modelsDir)
    .filter((f) => /^[A-Z].*\.js$/.test(f))
    .map((f) => path.join(modelsDir, f));
}

function loadCanonicalModels() {
  const before = new Set(mongoose.modelNames());
  const files = canonicalModelFiles();
  for (const file of files) {
    require(file);
  }

  const after = new Set(mongoose.modelNames());
  const loadedNames = [];
  for (const modelName of after) {
    if (!before.has(modelName)) loadedNames.push(modelName);
  }

  return {
    files,
    loadedNames: loadedNames.sort(),
    modelNames: [...after].sort(),
  };
}

async function connectMongo(uri) {
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 15000),
    connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 15000),
  });
}

async function createIndexesFromSchemas(modelNames) {
  const results = [];
  for (const modelName of modelNames) {
    const model = mongoose.model(modelName);
    const expectedIndexCount = model.schema.indexes().length;
    await model.createIndexes();
    results.push({ modelName, expectedIndexCount });
  }
  return results;
}

function normalizeKeyObject(keyObj) {
  const sorted = {};
  for (const key of Object.keys(keyObj).sort()) {
    sorted[key] = keyObj[key];
  }
  return JSON.stringify(sorted);
}

async function validateRequiredIndexes(modelNames) {
  const missing = [];
  for (const modelName of modelNames) {
    const model = mongoose.model(modelName);
    const expected = model.schema.indexes().map(([keys]) => normalizeKeyObject(keys));
    if (expected.length === 0) continue;

    const existing = await model.collection.indexes();
    const existingKeys = new Set(existing.map((idx) => normalizeKeyObject(idx.key || {})));

    for (const keySig of expected) {
      if (!existingKeys.has(keySig)) {
        missing.push({ modelName, key: keySig });
      }
    }
  }

  return missing;
}

async function ensureBootstrapConfigDocs() {
  const summary = {
    deliverySettingsCreated: false,
    firstTimeDiscountCreated: false,
    deliveryOptionsCreated: 0,
  };

  const DeliverySettings = mongoose.models.DeliverySettings;
  if (DeliverySettings) {
    const count = await DeliverySettings.countDocuments();
    if (count === 0) {
      await DeliverySettings.create({
        defaultEtaDays: 5,
        defaultEtaNote: 'Standard delivery',
        shippingOptions: [
          { name: 'Standard', cost: 0, days: 5 },
          { name: 'Express', cost: 7.5, days: 2 },
        ],
      });
      summary.deliverySettingsCreated = true;
    }
  }

  const FirstTimeDiscount = mongoose.models.FirstTimeDiscount;
  if (FirstTimeDiscount) {
    const count = await FirstTimeDiscount.countDocuments();
    if (count === 0) {
      await FirstTimeDiscount.create({ active: false, percentage: 10 });
      summary.firstTimeDiscountCreated = true;
    }
  }

  const DeliveryOption = mongoose.models.DeliveryOption;
  if (DeliveryOption) {
    const defaults = [
      { name: 'Standard', description: 'Default shipping option', cost: 0, days: '3-5 days', isActive: true },
      { name: 'Express', description: 'Fast shipping option', cost: 7.5, days: '1-2 days', isActive: true },
    ];

    for (const option of defaults) {
      const existing = await DeliveryOption.findOne({ name: option.name });
      if (!existing) {
        await DeliveryOption.create(option);
        summary.deliveryOptionsCreated += 1;
      }
    }
  }

  return summary;
}

async function seedCanonicalData() {
  const User = mongoose.models.User;
  const Product = mongoose.models.Product;

  if (!User || !Product) {
    throw new Error('Canonical seeding requires User and Product models to be loaded.');
  }

  const maybeClear = [
    'Order',
    'Invoice',
    'Review',
    'Feedback',
    'Support',
    'Flag',
    'Favorite',
    'Cart',
    'PromoCode',
    'PromoCampaign',
    'BehaviorEvent',
  ];

  for (const modelName of maybeClear) {
    if (mongoose.models[modelName]) {
      await mongoose.models[modelName].deleteMany({});
    }
  }

  await Product.deleteMany({});
  await User.deleteMany({});

  const users = [
    {
      _id: '000000000000000000000002',
      name: 'Customer One',
      email: 'customer@test.com',
      password: 'Password123!',
      roles: ['customer'],
      country: 'ET',
    },
    {
      _id: '000000000000000000000003',
      name: 'Vendor One',
      email: 'vendor@test.com',
      password: 'Password123!',
      roles: ['vendor'],
      country: 'ET',
    },
    {
      _id: '000000000000000000000001',
      name: 'Admin One',
      email: 'admin@test.com',
      password: 'Password123!',
      roles: ['admin'],
      country: 'ET',
    },
    {
      name: 'Global Admin',
      email: 'global_admin@test.com',
      password: 'Password123!',
      roles: ['admin', 'global_admin'],
      country: 'ET',
    },
    {
      name: 'Country Admin',
      email: 'country_admin@test.com',
      password: 'Password123!',
      roles: ['admin', 'country_admin'],
      country: 'ET',
    },
  ];

  for (const doc of users) {
    const user = new User(doc);
    await user.save();
  }

  const vendor = await User.findOne({ email: 'vendor@test.com' });
  if (!vendor) {
    throw new Error('Vendor seed user was not created.');
  }

  const products = [
    {
      name: 'Cypress Test Product',
      description: 'Product used in Cypress E2E tests',
      price: 9.99,
      currency: 'USD',
      category: 'general',
      stock: 50,
      vendor: vendor._id,
      promotion: { isPromoted: false, badgeText: '' },
    },
    {
      name: 'Test Product 1',
      description: 'A sample product for testing.',
      price: 100,
      currency: 'USD',
      category: 'Electronics',
      stock: 50,
      vendor: vendor._id,
      promotion: { isPromoted: true, badgeText: 'Hot' },
    },
    {
      name: 'Test Product 2',
      description: 'Another test product.',
      price: 50,
      currency: 'USD',
      category: 'Fashion',
      stock: 30,
      vendor: vendor._id,
      promotion: { isPromoted: false, badgeText: '' },
    },
  ];

  await Product.insertMany(products);

  return {
    users: users.length,
    products: products.length,
  };
}

async function validateCanonicalState() {
  const problems = [];

  if (mongoose.models.DeliverySettings) {
    const count = await mongoose.models.DeliverySettings.countDocuments();
    if (count === 0) problems.push('DeliverySettings is missing bootstrap document(s).');
  }

  if (mongoose.models.FirstTimeDiscount) {
    const count = await mongoose.models.FirstTimeDiscount.countDocuments();
    if (count === 0) problems.push('FirstTimeDiscount is missing bootstrap document(s).');
  }

  if (mongoose.models.User) {
    const requiredUsers = [
      'customer@test.com',
      'vendor@test.com',
      'admin@test.com',
      'global_admin@test.com',
      'country_admin@test.com',
    ];

    for (const email of requiredUsers) {
      const exists = await mongoose.models.User.exists({ email });
      if (!exists) problems.push(`Required seed user not found: ${email}`);
    }
  }

  if (mongoose.models.Product) {
    const count = await mongoose.models.Product.countDocuments();
    if (count === 0) problems.push('Product collection is empty after bootstrap.');
  }

  return problems;
}

module.exports = {
  CANONICAL_DB_NAMES,
  parseArgs,
  getTargetFromArgs,
  loadEnvForTarget,
  resolveMongoUri,
  connectMongo,
  loadCanonicalModels,
  createIndexesFromSchemas,
  validateRequiredIndexes,
  ensureBootstrapConfigDocs,
  seedCanonicalData,
  validateCanonicalState,
};
