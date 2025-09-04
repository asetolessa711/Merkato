// Simple cart storage with TTL. Guests get shorter TTL; authed users longer.

const GUEST_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h
const USER_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90d

export function loadCart() {
  try {
    const raw = localStorage.getItem('merkato-cart');
    if (!raw) return { items: [], timestamp: 0 };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { items: parsed, timestamp: 0 };
    if (Array.isArray(parsed.items)) return { items: parsed.items, timestamp: parsed.timestamp || 0 };
    return { items: [], timestamp: 0 };
  } catch {
    return { items: [], timestamp: 0 };
  }
}

export function saveCart(items, isAuthed) {
  const ts = Date.now();
  localStorage.setItem('merkato-cart', JSON.stringify({ items, timestamp: ts }));
  // Optional mirror for legacy code paths
  localStorage.setItem('cart', JSON.stringify(items));
  localStorage.setItem('merkato-cart-ttl', JSON.stringify({ ts, maxAge: isAuthed ? USER_MAX_AGE_MS : GUEST_MAX_AGE_MS }));
}

export function clearCart() {
  localStorage.setItem('merkato-cart', JSON.stringify({ items: [], timestamp: Date.now() }));
}

export function isCartExpired(isAuthed) {
  try {
    const maxAge = isAuthed ? USER_MAX_AGE_MS : GUEST_MAX_AGE_MS;
    // Prefer explicit TTL record
    const rawTtl = localStorage.getItem('merkato-cart-ttl');
    if (rawTtl) {
      const ttl = JSON.parse(rawTtl);
      const ts = ttl.ts || 0;
      return ts ? (Date.now() - ts > maxAge) : false;
    }
    // Fallback to cart timestamp if TTL is missing
    const rawCart = localStorage.getItem('merkato-cart');
    if (rawCart) {
      const parsed = JSON.parse(rawCart);
      const ts = parsed.timestamp || 0;
      return ts ? (Date.now() - ts > maxAge) : false;
    }
    // No data means no cart; treat as not expired
    return false;
  } catch {
    return false;
  }
}
