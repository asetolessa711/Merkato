import axios from 'axios';

export async function fetchCategories() {
  const res = await axios.get('/api/categories');
  return Array.isArray(res.data?.menu) ? res.data.menu : [];
}

export async function fetchAdminMegaMenu(headers = {}) {
  const res = await axios.get('/api/admin/mega-menu', { headers });
  return Array.isArray(res.data?.menu) ? res.data.menu : [];
}

export async function saveAdminMegaMenu(menu, headers = {}) {
  const res = await axios.put('/api/admin/mega-menu', { menu }, { headers });
  return res.data;
}

// New: canonical flat taxonomy (level 1)
export async function fetchCanonicalCategories(params = {}) {
  const { country = '', lang = '', visibleIn = '' } = params || {};
  const query = new URLSearchParams({ country, lang });
  if (visibleIn) query.set('visibleIn', visibleIn);

  const key = `taxonomy:${country || ''}:${lang || ''}:${visibleIn || 'all'}`;
  let cached;
  try { cached = JSON.parse(localStorage.getItem(key) || 'null'); } catch { cached = null; }

  const headers = {};
  if (cached?.etag) headers['If-None-Match'] = cached.etag;

  try {
    const res = await axios.get(`/api/categories?${query.toString()}`, { headers, validateStatus: () => true });
    if (res.status === 304 && cached?.data) {
      return Array.isArray(cached.data?.categories) && cached.data.categories.length
        ? cached.data.categories
        : (Array.isArray(cached.data?.menu) ? fallbackFromMenu(cached.data.menu) : []);
    }
    if (res.status >= 200 && res.status < 300) {
      const etag = (res.headers && (res.headers.etag || res.headers.ETag)) || '';
      // persist minimal data shape for reuse on 304
      const toStore = { etag, data: res.data, ts: Date.now() };
      try { localStorage.setItem(key, JSON.stringify(toStore)); } catch { /* ignore */ }
      if (Array.isArray(res.data?.categories) && res.data.categories.length) return res.data.categories;
      const menu = Array.isArray(res.data?.menu) ? res.data.menu : [];
      return fallbackFromMenu(menu);
    }
    // Unexpected status: try cache fallback
    if (cached?.data) {
      return Array.isArray(cached.data?.categories) && cached.data.categories.length
        ? cached.data.categories
        : (Array.isArray(cached.data?.menu) ? fallbackFromMenu(cached.data.menu) : []);
    }
    return [];
  } catch (_) {
    // Network error: fallback to cache if available
    if (cached?.data) {
      return Array.isArray(cached.data?.categories) && cached.data.categories.length
        ? cached.data.categories
        : (Array.isArray(cached.data?.menu) ? fallbackFromMenu(cached.data.menu) : []);
    }
    return [];
  }
}

function fallbackFromMenu(menu) {
  return (Array.isArray(menu) ? menu : []).map((col, idx) => ({
    id: (col.title || `cat-${idx + 1}`).toLowerCase(),
    name: col.title || `Category ${idx + 1}`,
    slug: (col.title || `category-${idx + 1}`).toLowerCase(),
    level: 1,
    displayOrder: (idx + 1) * 10,
    icon: col.icon || null,
    visibleIn: ['mega', 'searchbar'],
    synonyms: Array.isArray(col.links) ? col.links.map(l => (l.label || '').toLowerCase()).filter(Boolean) : []
  }));
}

export async function fetchCategoryAttributes(slug) {
  const res = await axios.get(`/api/categories/${encodeURIComponent(slug)}/attributes`);
  return Array.isArray(res.data?.attributes) ? res.data.attributes : [];
}

// Fetch leaf categories filtered by visibleIn/country
export async function fetchLeafCategories(params = {}) {
  const { country = '', visibleIn = '' } = params || {};
  const query = new URLSearchParams();
  if (country) query.set('country', country);
  if (visibleIn) query.set('visibleIn', visibleIn);
  const res = await axios.get(`/api/categories/leaves?${query.toString()}`);
  return Array.isArray(res.data?.categories) ? res.data.categories : [];
}
