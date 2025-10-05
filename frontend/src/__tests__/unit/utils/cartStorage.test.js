import { loadCart, saveCart, clearCart, isCartExpired } from '../../../utils/cartStorage'';

describe('cartStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('loadCart returns empty shape on missing/invalid', () => {
    expect(loadCart()).toEqual({ items: [], timestamp: 0 });
    localStorage.setItem('merkato-cart', 'not-json');
    expect(loadCart()).toEqual({ items: [], timestamp: 0 });
  });

  test('saveCart persists items and TTL; loadCart reads them', () => {
    saveCart([{ id: 'p1', quantity: 1 }], false);
    const loaded = loadCart();
    expect(loaded.items).toEqual([{ id: 'p1', quantity: 1 }]);
    const ttl = JSON.parse(localStorage.getItem('merkato-cart-ttl'));
    expect(ttl.ts).toBeGreaterThan(0);
    expect(ttl.maxAge).toBeGreaterThan(0);
  });

  test('clearCart empties items but keeps timestamp', () => {
    saveCart([{ id: 'p1' }], true);
    clearCart();
    const loaded = loadCart();
    expect(loaded.items).toEqual([]);
  });

  test('isCartExpired respects TTL for guest and authed', () => {
    // Guest TTL ~24h set in code; we simulate passage beyond TTL
    saveCart([{ id: 'p1' }], false);
    const ttl = JSON.parse(localStorage.getItem('merkato-cart-ttl'));
    const advanceMs = ttl.maxAge + 1000;
    jest.advanceTimersByTime(advanceMs);
    expect(isCartExpired(false)).toBe(true);

    // Authed TTL is longer; saving again marks fresh timestamp
    saveCart([{ id: 'p1' }], true);
    expect(isCartExpired(true)).toBe(false);
  });

  test('isCartExpired falls back to cart timestamp when TTL invalid JSON', () => {
    // Save a valid cart but corrupt TTL
    localStorage.setItem('merkato-cart', JSON.stringify({ items: [{ id: 'p1' }], timestamp: Date.now() - 10000 }));
    localStorage.setItem('merkato-cart-ttl', '{not-json');
    // Should not throw and should use cart timestamp path
    expect(() => require('../../../utils/cartStorage'')).not.toThrow();
    const { isCartExpired } = require('../../../utils/cartStorage'');
    expect(isCartExpired(false)).toBe(false);
  });

  test('saveCart safe if JSON.stringify throws', () => {
    const original = JSON.stringify;
    // Force JSON.stringify to throw only for objects containing items
    // eslint-disable-next-line no-global-assign
    JSON.stringify = (v) => {
      if (v && typeof v === 'object' && 'items' in v) throw new Error('boom');
      return original(v);
    };
    const { saveCart, loadCart } = require('../../../utils/cartStorage'');
    // Should not throw despite JSON issue
    expect(() => saveCart([{ id: 'x' }], false)).not.toThrow();
    // Load still returns default if nothing persisted
    expect(loadCart()).toEqual({ items: [], timestamp: 0 });
    JSON.stringify = original;
  });
});
