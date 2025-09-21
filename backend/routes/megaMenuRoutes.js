// File: routes/megaMenuRoutes.js
const express = require('express');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const router = express.Router();
const { withETag } = require('../utils/etag');
const {
  buildTaxonomy,
  filterAndSort,
  computeChildren,
  getAttributesForSlug,
} = require('../utils/taxonomy');
const { protect, authorize } = require('../middleware/authMiddleware');

const DATA_DIR = path.join(__dirname, '..', 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'mega-menu.json');
const AUDIT_FILE = path.join(DATA_DIR, 'mega-menu-audit.log.jsonl');
const TAXO_LOG = path.join(DATA_DIR, 'taxonomy-events.log.jsonl');

// Default seed structure if no file exists
const defaultMenu = [
  { title: 'Fashion', icon: '👗', links: [
    { label: "Women's Clothing", to: '/shop?cat=women' },
    { label: "Men's Clothing", to: '/shop?cat=men' },
    { label: 'Shoes', to: '/shop?cat=shoes' },
    { label: 'Bags & Accessories', to: '/shop?cat=bags' },
    { label: 'Jewelry', to: '/shop?cat=jewelry' },
  ]},
  { title: 'Electronics', icon: '📱', links: [
    { label: 'Mobile Phones', to: '/shop?search=mobile%20phone&category=electronics' },
    { label: 'Laptops', to: '/shop?search=laptop&category=electronics' },
    { label: 'Smart Watches', to: '/shop?search=smartwatch&category=electronics' },
    { label: 'Audio Devices', to: '/shop?search=headphones&category=electronics' },
    { label: 'Accessories', to: '/shop?search=accessories&category=electronics' },
  ]},
  { title: 'Home & Kitchen', icon: '🏠', links: [
    { label: 'Furniture', to: '/shop?search=furniture&category=home' },
    { label: 'Decor', to: '/shop?search=decor&category=home' },
    { label: 'Kitchen Tools', to: '/shop?search=kitchen%20tools&category=home' },
    { label: 'Storage', to: '/shop?search=storage&category=home' },
    { label: 'Bedding', to: '/shop?search=bedding&category=home' },
  ]},
];

function wrap(menuArr) {
  const now = new Date().toISOString();
  return { version: 1, updatedAt: now, menu: Array.isArray(menuArr) ? menuArr : [] };
}

async function ensureFile() {
  try {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.access(DATA_FILE, fs.constants.F_OK);
  } catch (e) {
    // Create with default content
    const payload = wrap(defaultMenu);
    await fsp.writeFile(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
  }
}

async function readMenuFile() {
  await ensureFile();
  const raw = await fsp.readFile(DATA_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    // normalize shape
    if (parsed && Array.isArray(parsed.menu)) return parsed;
  } catch (_) {}
  return wrap(defaultMenu);
}

async function writeMenuFile(payload) {
  await ensureFile();
  const now = new Date().toISOString();
  const out = { version: 1, updatedAt: now, menu: Array.isArray(payload?.menu) ? payload.menu : [] };
  await fsp.writeFile(DATA_FILE, JSON.stringify(out, null, 2), 'utf8');
  return out;
}

async function appendAudit(user, action, snapshot) {
  try {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    const rec = {
      ts: new Date().toISOString(),
      action,
      user: user ? { id: user._id?.toString?.() || user._id || user.id, email: user.email, role: user.role, roles: user.roles } : null,
      counts: {
        categories: Array.isArray(snapshot?.menu) ? snapshot.menu.length : 0,
        links: Array.isArray(snapshot?.menu) ? snapshot.menu.reduce((acc, c) => acc + (Array.isArray(c.links) ? c.links.length : 0), 0) : 0
      }
    };
    await fsp.appendFile(AUDIT_FILE, JSON.stringify(rec) + '\n', 'utf8');
  } catch (_) {
    // best-effort only
  }
}

// Helpers for taxonomy enrichment and filtering
function labelFor(cat, lang) {
  const l = lang && cat.locales && cat.locales[lang] && cat.locales[lang].name;
  return l || cat.name;
}

async function obsLog(event) {
  try {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.appendFile(TAXO_LOG, JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n', 'utf8');
  } catch (_) {
    // best-effort only
  }
}

// Public endpoint: GET /api/categories -> simplified active menu for frontend
router.get('/categories', async (req, res) => {
  try {
    const { menuDoc, simplified, categories } = await buildTaxonomy();
    const filtered = filterAndSort(categories, { visibleIn: req.query.visibleIn, country: req.query.country });

    if (filtered.length === 0) {
      obsLog({ level: 'warn', type: 'empty_categories', endpoint: '/api/categories', query: req.query });
    }

    res.setHeader('X-Taxonomy-Version', '2');
    res.setHeader('Sunset', 'Wed, 15 Jan 2026 00:00:00 GMT');
    res.setHeader('Link', '</api/categories>; rel="successor-version"');
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');

    const payload = JSON.stringify({ menu: simplified, categories: filtered, updatedAt: menuDoc.updatedAt, version: menuDoc.version });
    if (withETag(req, res, payload)) return;
    res.type('application/json').send(payload);
  } catch (err) {
    res.status(500).json({ message: 'Failed to read categories' });
  }
});

// GET /api/categories/tree?visibleIn=mega&country=ET&lang=en
router.get('/categories/tree', async (req, res) => {
  try {
    const { visibleIn, country, lang } = req.query;
    const { menuDoc, categories } = await buildTaxonomy();
    const filtered = filterAndSort(categories, { visibleIn, country });
    const { children } = computeChildren(filtered);
    const langCode = (lang || '').toString().toLowerCase();

    const nodeFor = (c) => ({
      id: c.id,
      name: labelFor(c, langCode),
      slug: c.slug,
      icon: c.icon,
      displayOrder: c.displayOrder || 0,
      children: (children.get(c.id) || []).map(nodeFor),
    });
    const roots = filtered.filter(c => !c.parentId);
    const tree = roots.map(nodeFor);

    if (tree.length === 0) {
      obsLog({ level: 'warn', type: 'empty_tree', endpoint: '/api/categories/tree', query: req.query });
    }

    res.setHeader('X-Taxonomy-Version', '2');
    res.setHeader('Sunset', 'Wed, 15 Jan 2026 00:00:00 GMT');
    res.setHeader('Link', '</api/categories>; rel="successor-version"');
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    const payload = JSON.stringify({ tree, updatedAt: menuDoc.updatedAt });
    if (withETag(req, res, payload)) return;
    res.type('application/json').send(payload);
  } catch (err) {
    res.status(500).json({ message: 'Failed to build category tree' });
  }
});

// GET /api/categories/:slug/children
router.get('/categories/:slug/children', async (req, res) => {
  try {
    const slug = (req.params.slug || '').toLowerCase();
    const { country, visibleIn } = req.query;
    const { categories } = await buildTaxonomy();
    const filtered = filterAndSort(categories, { visibleIn, country });
    const maps = computeChildren(filtered);
    const parent = filtered.find(c => c.slug === slug || c.id === slug);
    const children = parent ? (maps.children.get(parent.id) || []) : [];
    res.setHeader('X-Taxonomy-Version', '2');
    res.setHeader('Sunset', 'Wed, 15 Jan 2026 00:00:00 GMT');
    res.setHeader('Link', '</api/categories>; rel="successor-version"');
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    const body = JSON.stringify({ parent, children });
    if (withETag(req, res, body)) return;
    res.type('application/json').send(body);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get children' });
  }
});

// GET /api/categories/:slug/attributes
router.get('/categories/:slug/attributes', async (req, res) => {
  try {
    const slug = (req.params.slug || '').toLowerCase();
    const { categories } = await buildTaxonomy();
    const attributes = getAttributesForSlug(categories, slug);
    res.setHeader('X-Taxonomy-Version', '2');
    res.setHeader('Sunset', 'Wed, 15 Jan 2026 00:00:00 GMT');
    res.setHeader('Link', '</api/categories>; rel="successor-version"');
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    const body = JSON.stringify({ slug, attributes });
    if (withETag(req, res, body)) return;
    res.type('application/json').send(body);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get attributes' });
  }
});

// GET /api/categories/leaves?visibleIn=upload&country=ET
router.get('/categories/leaves', async (req, res) => {
  try {
    const { visibleIn, country } = req.query;
    const { categories, menuDoc } = await buildTaxonomy();
    const filtered = filterAndSort(categories, { visibleIn, country });
    const leaves = require('../utils/taxonomy').getLeaves(filtered, visibleIn);
    if (leaves.length === 0) {
      obsLog({ level: 'info', type: 'no_leaves', endpoint: '/api/categories/leaves', query: req.query });
    }
    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
    const payload = JSON.stringify({ updatedAt: menuDoc.updatedAt, categories: leaves });
    if (withETag(req, res, payload)) return;
    res.type('application/json').send(payload);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get leaf categories' });
  }
});

// GET /api/categories/sitemap - flat sitemap-friendly list of category paths
router.get('/categories/sitemap', async (req, res) => {
  try {
    const { categories, menuDoc } = await buildTaxonomy();
    const filtered = filterAndSort(categories, { visibleIn: req.query.visibleIn, country: req.query.country });
    const { byId } = computeChildren(filtered);
    const entries = filtered.map(c => {
      const pathIds = Array.isArray(c.path) ? c.path.slice() : [];
      const pathSlugs = pathIds.map(id => byId.get(id)?.slug).filter(Boolean);
      return { id: c.id, slug: c.slug, pathIds, pathSlugs };
    });
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1200');
    const payload = JSON.stringify({ updatedAt: menuDoc.updatedAt, entries });
    if (withETag(req, res, payload)) return;
    res.type('application/json').send(payload);
  } catch (err) {
    res.status(500).json({ message: 'Failed to build sitemap' });
  }
});

// Admin endpoints: GET/PUT /api/admin/mega-menu
router.get('/admin/mega-menu', protect, authorize('admin', 'global_admin'), async (req, res) => {
  try {
    const data = await readMenuFile();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load mega menu' });
  }
});

router.put('/admin/mega-menu', protect, authorize('admin', 'global_admin'), async (req, res) => {
  try {
    const body = req.body || {};
    if (!Array.isArray(body.menu)) {
      return res.status(400).json({ message: 'Invalid payload: menu array required' });
    }
    const saved = await writeMenuFile({ menu: body.menu });
    await appendAudit(req.user, 'save', saved);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Failed to save mega menu' });
  }
});

// Admin: read audit log (last N)
router.get('/admin/mega-menu/audit', protect, authorize('admin', 'global_admin'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10) || 50, 200);
    await fsp.mkdir(DATA_DIR, { recursive: true });
    let content = '';
    try {
      content = await fsp.readFile(AUDIT_FILE, 'utf8');
    } catch (_) {
      return res.json({ entries: [] });
    }
    const lines = content.split(/\r?\n/).filter(Boolean);
    const recent = lines.slice(-limit).map((ln) => {
      try { return JSON.parse(ln); } catch { return null; }
    }).filter(Boolean).reverse();
    res.json({ entries: recent });
  } catch (err) {
    res.status(500).json({ message: 'Failed to read audit log' });
  }
});

module.exports = router;
// Keep module.exports at end; additional routes can be appended above

