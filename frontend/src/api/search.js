import axios from 'axios';

export async function fetchSearchSuggest({ q = '', lang = 'en', country = '', limit = 5 } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (lang) params.set('lang', lang);
  if (country) params.set('country', country);
  if (limit) params.set('limit', String(limit));
  const res = await axios.get(`/api/search/suggest?${params.toString()}`);
  return {
    categories: Array.isArray(res.data?.categories) ? res.data.categories : [],
    products: Array.isArray(res.data?.products) ? res.data.products : [],
  };
}

export async function logSearchEvent(payload = {}) {
  // payload: { type, slug, pos, role, country, q }
  try {
    await axios.post('/api/search/event', payload, { timeout: 3000 });
  } catch (_) {
    // best-effort only; ignore
  }
}
