import { loadCart, saveCart, clearCart, isCartExpired } from '../../../utils/cartStorage';

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
});
