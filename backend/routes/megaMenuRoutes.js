// File: routes/megaMenuRoutes.js
const express = require('express');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

// Data persistence locations
const DATA_DIR = path.join(__dirname, '..', 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'mega-menu.json');
const AUDIT_FILE = path.join(DATA_DIR, 'mega-menu-audit.log.jsonl');

// Default seed structure if no file exists
const defaultMenu = [
  {
    title: 'Fashion',
    icon: '👗',
    links: [
      { label: "Women's Clothing", to: '/shop?cat=women' },
      { label: "Men's Clothing", to: '/shop?cat=men' },
      { label: 'Shoes', to: '/shop?cat=shoes' },
      { label: 'Bags & Accessories', to: '/shop?cat=bags' },
      { label: 'Jewelry', to: '/shop?cat=jewelry' },
    ],
  },
  {
    title: 'Electronics',
    icon: '📱',
    links: [
      { label: 'Mobile Phones', to: '/shop?search=mobile%20phone&category=electronics' },
      { label: 'Laptops', to: '/shop?search=laptop&category=electronics' },
      { label: 'Smart Watches', to: '/shop?search=smartwatch&category=electronics' },
      { label: 'Audio Devices', to: '/shop?search=headphones&category=electronics' },
      { label: 'Accessories', to: '/shop?search=accessories&category=electronics' },
    ],
  },
  {
    title: 'Home & Kitchen',
    icon: '🏠',
    links: [
      { label: 'Furniture', to: '/shop?search=furniture&category=home' },
      { label: 'Decor', to: '/shop?search=decor&category=home' },
      { label: 'Kitchen Tools', to: '/shop?search=kitchen%20tools&category=home' },
      { label: 'Storage', to: '/shop?search=storage&category=home' },
      { label: 'Bedding', to: '/shop?search=bedding&category=home' },
    ],
  },
];

function wrap(menuArr) {
  const now = new Date().toISOString();
  return { version: 1, updatedAt: now, menu: Array.isArray(menuArr) ? menuArr : [] };
}

async function ensureFile() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    await fsp.access(DATA_FILE, fs.constants.F_OK);
  } catch (e) {
    const payload = wrap(defaultMenu);
    await fsp.writeFile(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
  }
}

async function readMenuFile() {
  await ensureFile();
  const raw = await fsp.readFile(DATA_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
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
      user: user
        ? {
            id: user._id?.toString?.() || user._id || user.id,
            email: user.email,
            role: user.role,
            roles: user.roles,
          }
        : null,
      counts: {
        categories: Array.isArray(snapshot?.menu) ? snapshot.menu.length : 0,
        links: Array.isArray(snapshot?.menu)
          ? snapshot.menu.reduce(
              (acc, c) => acc + (Array.isArray(c.links) ? c.links.length : 0),
              0,
            )
          : 0,
      },
    };
    await fsp.appendFile(AUDIT_FILE, JSON.stringify(rec) + '\n', 'utf8');
  } catch (_) {
    // best-effort only
  }
}

// Public endpoint: GET /api/categories -> simplified active menu for frontend
router.get('/categories', async (req, res) => {
  try {
    const data = await readMenuFile();
    const simplified = (data.menu || [])
      .filter((col) => col.status !== 'hidden')
      .map((col) => ({
        title: col.title,
        title_en: col.title_en,
        title_am: col.title_am,
        title_or: col.title_or,
        icon: col.icon,
        thumb: col.thumb,
        links: (Array.isArray(col.links) ? col.links : [])
          .filter((l) => l.status !== 'hidden')
          .map((l) => ({
            label: l.label,
            label_en: l.label_en,
            label_am: l.label_am,
            label_or: l.label_or,
            to: l.to,
            icon: l.icon,
            thumb: l.thumb,
          })),
      }));
    res.json({ menu: simplified, updatedAt: data.updatedAt, version: data.version });
  } catch (err) {
    res.status(500).json({ message: 'Failed to read categories' });
  }
});

// Admin endpoints: GET/PUT /api/admin/mega-menu
router.get(
  '/admin/mega-menu',
  protect,
  authorize('admin', 'global_admin'),
  async (req, res) => {
    try {
      const data = await readMenuFile();
      res.json(data);
    } catch (err) {
      res.status(500).json({ message: 'Failed to load mega menu' });
    }
  },
);

router.put(
  '/admin/mega-menu',
  protect,
  authorize('admin', 'global_admin'),
  async (req, res) => {
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
  },
);

// Admin: read audit log (last N)
router.get(
  '/admin/mega-menu/audit',
  protect,
  authorize('admin', 'global_admin'),
  async (req, res) => {
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
      const recent = lines
        .slice(-limit)
        .map((ln) => {
          try {
            return JSON.parse(ln);
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .reverse();
      res.json({ entries: recent });
    } catch (err) {
      res.status(500).json({ message: 'Failed to read audit log' });
    }
  },
);

module.exports = router;
