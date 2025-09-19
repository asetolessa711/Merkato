// File: routes/themeRoutes.js
const express = require('express');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');

const DATA_DIR = path.join(__dirname, '..', 'uploads');
const THEME_FILE = path.join(DATA_DIR, 'theme.json');
const AUDIT_FILE = path.join(DATA_DIR, 'theme-audit.log.jsonl');

// Minimal default theme aligning with tokens.css
const defaultZones = {
  header: { bg: '#2C2E43', link: '#ffffff', hover: '#FFED4A', dropdownBg: '#1f2033' },
  footer: { bg: '#2C2E43', text: '#ffffff', link: '#A0AEC0' },
  hero: { bg: '#FDFDFD', overlay: 'linear-gradient(180deg, rgba(0,0,0,0.0), rgba(0,0,0,0.25))', ctaBg: '#6C63FF', ctaText: '#ffffff' },
  cards: { radius: '12px', shadow: 'var(--shadow-sm)', bg: '#FFFFFF', hoverAnim: true, badge: '#F4C430' },
  buttons: { primary: '#6C63FF', primaryHover: '#534BE6', secondary: '#FF6B6B', secondaryHover: '#e85a5a' },
  typography: { body: 'Poppins, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', heading: 'Poppins, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif', headingWeight: 700, paragraphSpacing: '0.75rem' },
  backgrounds: { page: '#FDFDFD', sectionDivider: '#eef2f7', modalOverlay: 'rgba(0,0,0,0.35)' },
  alerts: { alertBg: '#FFF7ED', promoBg: '#ECFEFF', urgency: '#DC2626' },
  forms: { border: '#CBD5E1', focus: '#6C63FF', placeholder: '#94A3B8', error: '#DC2626' },
  dashboard: { sidebarBg: '#0F172A', tabActiveBg: '#E0E7FF' },
};
const defaultTheme = {
  key: 'default',
  name: 'Default',
  colors: {
    primary: '#6C63FF',
    primary600: '#6C63FF',
    primary700: '#534BE6',
    bg: '#FDFDFD',
    surface: '#FDFDFD',
    text: '#6E7E91',
    textMuted: '#8A97A8',
    nav: '#2C2E43',
    footer: '#2C2E43',
    accentRed: '#FF6B6B',
    success: '#A0E7E5',
    warning: '#F4C430',
    danger: '#FF6B6B',
    info: '#6C63FF',
  },
  animations: true,
  zones: defaultZones,
};

function wrapState(partial) {
  const now = new Date().toISOString();
  return {
    version: 1,
    updatedAt: now,
    personalizationEnabled: false,
    activeKey: 'default',
    themes: [defaultTheme],
    schedule: null, // { from: iso, to: iso, key: string }
    ...partial,
  };
}

async function ensureFile() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    await fsp.access(THEME_FILE, fs.constants.F_OK);
  } catch (_) {
    const state = wrapState();
    await fsp.writeFile(THEME_FILE, JSON.stringify(state, null, 2), 'utf8');
  }
}

async function readThemeState() {
  await ensureFile();
  const raw = await fsp.readFile(THEME_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.themes)) return parsed;
  } catch (_) {}
  return wrapState();
}

async function writeThemeState(state) {
  const now = new Date().toISOString();
  const normalized = wrapState({ ...state, updatedAt: now });
  await fsp.writeFile(THEME_FILE, JSON.stringify(normalized, null, 2), 'utf8');
  return normalized;
}

async function appendAudit(user, action, snapshot) {
  try {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    const rec = {
      ts: new Date().toISOString(),
      action,
      user: user ? { id: user._id || user.id, email: user.email, role: user.role } : null,
      activeKey: snapshot?.activeKey,
      personalizationEnabled: !!snapshot?.personalizationEnabled,
      themeCount: Array.isArray(snapshot?.themes) ? snapshot.themes.length : 0,
    };
    await fsp.appendFile(AUDIT_FILE, JSON.stringify(rec) + '\n', 'utf8');
  } catch (_) {
    // best-effort only
  }
}

function pickActiveTheme(state) {
  const nowTs = Date.now();
  let scheduledKey = null;
  const sch = state.schedule;
  if (sch && sch.key && sch.from && sch.to) {
    const from = Date.parse(sch.from);
    const to = Date.parse(sch.to);
    if (isFinite(from) && isFinite(to) && nowTs >= from && nowTs <= to) {
      scheduledKey = sch.key;
    }
  }
  const key = scheduledKey || state.activeKey || 'default';
  return state.themes.find(t => t.key === key) || defaultTheme;
}

// Public: GET /api/theme -> resolve active theme (consider schedule)
router.get('/theme', async (req, res) => {
  try {
    const state = await readThemeState();
    const active = pickActiveTheme(state);
    res.json({
      version: state.version,
      updatedAt: state.updatedAt,
      personalizationEnabled: !!state.personalizationEnabled,
      animations: !!active.animations,
  theme: active,
  schedule: state.schedule || null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load theme' });
  }
});

// Public: GET /api/themes -> list saved themes (no admin fields)
router.get('/themes', async (req, res) => {
  try {
    const state = await readThemeState();
  res.json({ themes: state.themes.map(t => ({ key: t.key, name: t.name, colors: t.colors, animations: !!t.animations, zones: t.zones || defaultZones })) });
  } catch (err) {
    res.status(500).json({ message: 'Failed to list themes' });
  }
});

// Admin: PUT /api/admin/theme -> upsert themes, set active, update schedule/personalization
router.put('/admin/theme', protect, authorize('admin', 'global_admin'), async (req, res) => {
  try {
    const body = req.body || {};
    const state = await readThemeState();

    // Optional update: personalization and schedule
    if (typeof body.personalizationEnabled === 'boolean') {
      state.personalizationEnabled = body.personalizationEnabled;
    }
    if (body.schedule === null || (body.schedule && typeof body.schedule === 'object')) {
      state.schedule = body.schedule || null;
    }

    // Optional themes upsert and activeKey
  if (Array.isArray(body.themes)) {
      // Normalize keys; ensure unique keys
      const byKey = new Map();
      for (const t of body.themes) {
        if (!t || !t.key) continue;
        byKey.set(t.key, {
          key: String(t.key),
          name: t.name || String(t.key),
          colors: { ...defaultTheme.colors, ...(t.colors || {}) },
      animations: typeof t.animations === 'boolean' ? t.animations : true,
      zones: { ...defaultZones, ...(t.zones || {}) },
        });
      }
      state.themes = Array.from(byKey.values());
      if (!state.themes.find(t => t.key === 'default')) {
        state.themes.push(defaultTheme);
      }
    }

    if (typeof body.activeKey === 'string' && body.activeKey.trim()) {
      state.activeKey = body.activeKey;
    }

    const saved = await writeThemeState(state);
    await appendAudit(req.user, 'save', saved);
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: 'Failed to save theme' });
  }
});

module.exports = router;
