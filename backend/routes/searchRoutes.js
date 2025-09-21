const express = require('express');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { withETag } = require('../utils/etag');

const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'mega-menu.json');
const SEARCH_LOG = path.join(DATA_DIR, 'search-events.log.jsonl');

async function ensureFile() {
  try {
    await fsp.access(DATA_FILE, fs.constants.F_OK);
  } catch (_) {
    // noop: mega-menu route will create on demand; here we just handle absence
  }
}

async function readMenuFile() {
  await ensureFile();
  try {
    const raw = await fsp.readFile(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.menu)) return parsed;
  } catch (_) {}
  return { version: 1, updatedAt: new Date().toISOString(), menu: [] };
}

async function logEvent(event) {
  try {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.appendFile(SEARCH_LOG, JSON.stringify({ ts: new Date().toISOString(), ...event }) + '\n', 'utf8');
  } catch (_) {
    // best-effort
  }
}

function slugify(s) {
  return (s || '')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function buildCanonicalFromMenu(simplified) {
  const categories = simplified.map((col, idx) => {
    const slug = slugify(col.title || col.title_en || '');
    const names = [col.title, col.title_en, col.title_am, col.title_or].filter(Boolean);
    const linkNames = (Array.isArray(col.links) ? col.links : []).map(l => l.label).filter(Boolean);
    const synonyms = Array.from(new Set([...names, ...linkNames]))
      .map(x => x.toString().toLowerCase())
      .filter(Boolean);
    return {
      id: slug || `cat-${idx + 1}`,
      name: col.title || col.title_en || `Category ${idx + 1}`,
      slug: slug || `category-${idx + 1}`,
      level: 1,
      displayOrder: (idx + 1) * 10,
      icon: col.icon || null,
      visibleIn: ['mega', 'searchbar'],
      synonyms,
      active: true,
      locales: {
        en: col.title_en ? { name: col.title_en } : undefined,
        am: col.title_am ? { name: col.title_am } : undefined,
        or: col.title_or ? { name: col.title_or } : undefined,
      },
    };
  });
  return categories;
}

// GET /api/search/suggest?q=...&lang=en&country=ET&limit=3
router.get('/search/suggest', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim().toLowerCase();
    const lang = (req.query.lang || '').toString().toLowerCase();
    const limit = Math.min(parseInt(req.query.limit || '3', 10) || 3, 10);
    const data = await readMenuFile();
    const simplified = (data.menu || [])
      .filter(col => col.status !== 'hidden')
      .map(col => ({
        title: col.title,
        title_en: col.title_en,
        title_am: col.title_am,
        title_or: col.title_or,
        icon: col.icon,
        links: (Array.isArray(col.links) ? col.links : [])
          .filter(l => l.status !== 'hidden')
          .map(l => ({ label: l.label })),
      }));
    let categories = buildCanonicalFromMenu(simplified);
    // Apply overrides for synonyms/locales/etc.
    try {
      const overridesPath = path.join(DATA_DIR, 'categories-overrides.json');
      const raw = await fsp.readFile(overridesPath, 'utf8');
      const overrides = JSON.parse(raw);
      if (Array.isArray(overrides)) {
        const map = new Map(categories.map(c => [c.id, c]));
        for (const o of overrides) {
          const id = o.id || o.slug || (o.name && slugify(o.name));
          if (!id) continue;
          const base = map.get(id);
          if (base) map.set(id, { ...base, ...o, id: base.id, slug: base.slug });
        }
        categories = Array.from(map.values());
      }
    } catch (_) {}

    let matched = categories.filter(c => c.active !== false);
    if (q) {
      matched = matched.filter(c => {
        const base = c.name || '';
        const localized = lang && c.locales && c.locales[lang] && c.locales[lang].name;
        const hay = [base, localized, ...(Array.isArray(c.synonyms) ? c.synonyms : [])].filter(Boolean).map(x => x.toString().toLowerCase());
        return hay.some(h => h.includes(q));
      });
    }
    matched.sort((a, b) => {
      const aScore = (a.displayOrder || 0);
      const bScore = (b.displayOrder || 0);
      if (aScore !== bScore) return aScore - bScore;
      return String(a.name).localeCompare(String(b.name));
    });
    const top = matched.slice(0, limit).map(c => ({ id: c.id, slug: c.slug, name: (c.locales && lang && c.locales[lang]?.name) || c.name, icon: c.icon }));
    // Log impression with the ranked categories
    try {
      const role = (req.user?.role || req.user?.roles?.[0] || 'public').toString();
      const country = (req.query.country || '').toString().toUpperCase();
      await logEvent({ type: 'category_suggest_shown', q, lang, role, country, results: top.map((c, i) => ({ slug: c.slug, pos: i + 1 })) });
    } catch (_) {}

    const body = JSON.stringify({ categories: top, products: [] });
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    if (withETag(req, res, body)) return;
    res.type('application/json').send(body);
  } catch (err) {
    res.status(500).json({ message: 'Failed to suggest' });
  }
});

// Log search events (e.g., category_suggest_clicked)
// POST /api/search/event { type: 'category_suggest_clicked', slug, pos, role, country }
router.post('/search/event', async (req, res) => {
  try {
    const { type, slug, pos, role, country, q } = req.body || {};
    if (!type) return res.status(400).json({ message: 'type required' });
    await logEvent({ type, slug, pos, role: role || (req.user?.role || req.user?.roles?.[0] || 'public'), country: (country || '').toString().toUpperCase(), q: (q || '').toString(), ua: req.headers['user-agent'] || '' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Failed to log event' });
  }
});

module.exports = router;
