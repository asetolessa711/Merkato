// Simple data factories to standardize test data and reduce duplication
// Pure functions only; no side effects or Date.now() jitter unless explicitly passed.

const roles = ['guest', 'customer', 'vendor', 'admin'];

export function makeId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function makeUser(overrides = {}) {
  const base = {
    id: makeId('user'),
    name: 'Test User',
    email: 'user@example.com',
    role: 'customer',
    token: 'token-abc',
    addresses: [],
  };
  return { ...base, ...overrides };
}

export function makeProduct(overrides = {}) {
  const base = {
    id: makeId('prod'),
    name: 'Sample Product',
    price: 100,
    currency: 'USD',
    images: [],
    inStock: true,
    moq: 1,
    tiers: [
      { minQty: 1, price: 100 },
      { minQty: 10, price: 90 },
    ],
  };
  return { ...base, ...overrides };
}

export function makeOrder(overrides = {}) {
  const base = {
    id: makeId('ord'),
    number: 'ORD-1001',
    status: 'PLACED',
    total: 150,
    currency: 'USD',
    items: [],
    createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
  };
  return { ...base, ...overrides };
}

export function makeApiError(status = 500, message = 'Server error') {
  const err = new Error(message);
  err.isAxiosError = true;
  err.response = { status, data: { message } };
  return err;
}
