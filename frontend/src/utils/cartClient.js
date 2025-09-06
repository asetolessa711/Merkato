import axios from 'axios';

const ANON_KEY = 'merkato-anonymous-id';

export function getAnonymousId() {
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}

export async function syncCart(items, token) {
  try {
    const anonymousId = getAnonymousId();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    // Server cart expects {product, quantity}
    const payload = items.map(i => ({ product: i._id || i.product || i.id, quantity: i.quantity || 1 }));
    await axios.put('/api/cart', { items: payload, anonymousId }, headers ? { headers } : undefined);
  } catch (_) {}
}

export async function mergeCartOnLogin(token) {
  try {
    const anonymousId = getAnonymousId();
    if (!anonymousId || !token) return;
    await axios.post('/api/cart/merge', { anonymousId }, { headers: { Authorization: `Bearer ${token}` } });
  } catch (_) {}
}

