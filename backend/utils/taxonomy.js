const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'uploads');
const MENU_FILE = path.join(DATA_DIR, 'mega-menu.json');
const OVERRIDES_FILE = path.join(DATA_DIR, 'categories-overrides.json');

function slugify(s) {
  return (s || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

async function ensureMenu() {
  try { await fsp.access(MENU_FILE, fs.constants.F_OK); } catch { /* created by mega menu routes when needed */ }
}

async function readMenu() {
  await ensureMenu();
  try {
    const raw = await fsp.readFile(MENU_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.menu) ? parsed : { version: 1, updatedAt: new Date().toISOString(), menu: [] };
  } catch {
    return { version: 1, updatedAt: new Date().toISOString(), menu: [] };
  }
}

async function readOverrides() {
  try {
    const raw = await fsp.readFile(OVERRIDES_FILE, 'utf8');
    const overrides = JSON.parse(raw);
    return Array.isArray(overrides) ? overrides : [];
  } catch {
    return [];
  }
}

function simplifyMenu(menu) {
  return (menu || [])
    .filter(col => col.status !== 'hidden')
    .map(col => ({
      title: col.title,
      title_en: col.title_en,
      title_am: col.title_am,
      title_or: col.title_or,
      icon: col.icon,
      thumb: col.thumb,
      links: (Array.isArray(col.links) ? col.links : [])
        .filter(l => l.status !== 'hidden')
        .map(l => ({ label: l.label, label_en: l.label_en, label_am: l.label_am, label_or: l.label_or, to: l.to, icon: l.icon, thumb: l.thumb })),
    }));
}

function buildFromSimplified(simplified) {
  return simplified.map((col, idx) => {
    const s = slugify(col.title || col.title_en || '');
    const names = [col.title, col.title_en, col.title_am, col.title_or].filter(Boolean);
    const linkNames = (Array.isArray(col.links) ? col.links : []).map(l => l.label).filter(Boolean);
    const synonyms = Array.from(new Set([...names, ...linkNames])).map(x => x.toString().toLowerCase());
    return {
      id: s || `cat-${idx + 1}`,
      name: col.title || col.title_en || `Category ${idx + 1}`,
      slug: s || `category-${idx + 1}`,
      level: 1,
      displayOrder: (idx + 1) * 10,
      icon: col.icon || null,
      visibleIn: ['mega', 'searchbar'],
      synonyms,
      parentId: null,
      path: [],
      active: true,
      regions: undefined,
      locales: {
        en: col.title_en ? { name: col.title_en } : undefined,
        am: col.title_am ? { name: col.title_am } : undefined,
        or: col.title_or ? { name: col.title_or } : undefined,
      },
      attributes: [],
    };
  });
}

function mergeOverrides(base, overrides) {
  const map = new Map(base.map(c => [c.id, c]));
  for (const o of (overrides || [])) {
    if (!o) continue;
    const id = o.id || o.slug || (o.name && slugify(o.name));
    if (!id) continue;
    const existing = map.get(id);
    if (existing) {
      map.set(id, { ...existing, ...o, id: existing.id, slug: existing.slug || slugify(existing.name) });
    } else {
      const slug = o.slug || slugify(o.name || id);
      map.set(id, { ...o, id, slug, displayOrder: o.displayOrder || 9999, level: o.level || 1 });
    }
  }
  const arr = Array.from(map.values());
  // compute children and path
  const byId = new Map(arr.map(c => [c.id, c]));
  // ensure level and parentId consistency
  for (const c of arr) {
    if (c.parentId && !byId.has(c.parentId)) {
      // dangling parentId; drop it
      c.parentId = null;
    }
  }
  // compute paths if missing
  function computePath(cat) {
    if (Array.isArray(cat.path) && cat.path.length) return cat.path;
    const chain = [];
    let cur = cat;
    const safety = 10;
    let steps = 0;
    while (cur && cur.parentId && steps < safety) {
      chain.unshift(cur.parentId);
      cur = byId.get(cur.parentId);
      steps++;
    }
    cat.path = chain;
    return cat.path;
  }
  for (const c of arr) computePath(c);
  return arr;
}

function filterAndSort(cats, { visibleIn, country }) {
  let out = Array.isArray(cats) ? cats.slice() : [];
  if (visibleIn) out = out.filter(c => !Array.isArray(c.visibleIn) || c.visibleIn.includes(visibleIn));
  out = out.filter(c => c.active !== false);
  if (country) {
    const code = String(country).toUpperCase();
    out = out.filter(c => !Array.isArray(c.regions) || c.regions.length === 0 || c.regions.includes(code));
  }
  out.sort((a, b) => {
    const code = (country || '').toString().toUpperCase();
    const aw = code && a.regionWeights && typeof a.regionWeights[code] === 'number' ? a.regionWeights[code] : 0;
    const bw = code && b.regionWeights && typeof b.regionWeights[code] === 'number' ? b.regionWeights[code] : 0;
    if (aw !== bw) return bw - aw;
    // Deterministic tie-breakers when region weight is equal:
    // 1) Prefer root categories (no parent) before children for stable top-level menus
    const aIsRoot = !(a && (a.parentId || (Array.isArray(a.path) && a.path.length > 0)));
    const bIsRoot = !(b && (b.parentId || (Array.isArray(b.path) && b.path.length > 0)));
    if (aIsRoot !== bIsRoot) return aIsRoot ? -1 : 1;
    // 2) Then by displayOrder ascending
    const byOrder = (a.displayOrder || 0) - (b.displayOrder || 0);
    if (byOrder !== 0) return byOrder;
    // 3) Finally, by name for full determinism
    return String(a.name).localeCompare(String(b.name));
  });
  return out;
}

function computeChildren(cats) {
  const byId = new Map(cats.map(c => [c.id, c]));
  const children = new Map();
  for (const c of cats) children.set(c.id, []);
  for (const c of cats) if (c.parentId) {
    const arr = children.get(c.parentId);
    if (arr) arr.push(c);
  }
  for (const [id, list] of children.entries()) {
    list.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || String(a.name).localeCompare(String(b.name)));
  }
  return { byId, children };
}

function getLeaves(cats, visibleIn) {
  const { children } = computeChildren(cats);
  return cats.filter(c => (visibleIn ? (Array.isArray(c.visibleIn) ? c.visibleIn.includes(visibleIn) : true) : true) && (children.get(c.id)?.length === 0));
}

function getAttributesForSlug(cats, slug) {
  const cat = cats.find(c => c.slug === slug || c.id === slug);
  return Array.isArray(cat?.attributes) ? cat.attributes : [];
}

async function buildTaxonomy() {
  const menuDoc = await readMenu();
  const simplified = simplifyMenu(menuDoc.menu);
  const base = buildFromSimplified(simplified);
  const overrides = await readOverrides();
  const merged = mergeOverrides(base, overrides);
  return { menuDoc, simplified, categories: merged };
}

module.exports = {
  slugify,
  buildTaxonomy,
  filterAndSort,
  computeChildren,
  getLeaves,
  getAttributesForSlug,
  mergeOverrides,
  readOverrides,
  OVERRIDES_FILE,
  DATA_DIR,
};
