import { fetchCanonicalCategories } from '../api/categories'';

let cache = { ts: 0, categories: [], country: '', lang: '', visibleIn: '' };
const TTL_MS = 2 * 60 * 1000; // small cache to avoid repeated calls

export async function getCanonicalTaxonomy({ country = '', lang = '', visibleIn = '' } = {}) {
  const now = Date.now();
  if (
    cache.categories.length &&
    now - cache.ts < TTL_MS &&
    cache.country === (country || '') &&
    cache.lang === (lang || '') &&
    cache.visibleIn === (visibleIn || '')
  ) return cache.categories;
  const cats = await fetchCanonicalCategories({ country, lang, visibleIn });
  cache = { ts: now, categories: Array.isArray(cats) ? cats : [], country: country || '', lang: lang || '', visibleIn: visibleIn || '' };
  return cache.categories;
}

export function getCategoryListFrom(canonical, lang) {
  return (Array.isArray(canonical) ? canonical : [])
    .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
    .map(c => getLabel(c, lang))
    .filter(Boolean);
}

export function matchesCategory(productCategory, taxonomyTitle) {
  if (!productCategory || !taxonomyTitle) return false;
  return String(productCategory).toLowerCase() === String(taxonomyTitle).toLowerCase();
}

// Return localized label if available, falling back to name
export function getLabel(category, lang) {
  if (!category) return '';
  const l = lang && category.locales && category.locales[lang] && category.locales[lang].name;
  return l || category.name || '';
}

// Derive preselected category id from URL like /c/:slug
// @allow-hardcode - utility matches legacy '/c/' path for selection logic in admin/tools
export function preselectFromUrl(canonical, pathname) {
  const m = (pathname || '').match(/^\/c\/([^\/?#]+)/);
  if (!m) return 'all';
  const slug = decodeURIComponent(m[1]);
  const cat = (Array.isArray(canonical) ? canonical : []).find(c => c.slug === slug);
  return cat?.id || 'all';
}

// Map category slug to taxonomy object (id, name). Returns null if not found.
export function findCategoryBySlug(canonical, slug) {
  const cats = Array.isArray(canonical) ? canonical : [];
  const key = String(slug || '').toLowerCase();
  return cats.find(c => String(c.slug).toLowerCase() === key) || null;
}

// Map subcategory slug under given category slug; returns taxonomy object or null
export function findSubcategoryBySlug(canonical, categorySlug, subcatSlug) {
  const cat = findCategoryBySlug(canonical, categorySlug);
  if (!cat) return null;
  const subs = Array.isArray(cat.children) ? cat.children : [];
  const key = String(subcatSlug || '').toLowerCase();
  return subs.find(s => String(s.slug).toLowerCase() === key) || null;
}
