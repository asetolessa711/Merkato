// src/utils/heroBanners.js
// Local, client-side hero banners runtime similar to Micro-banners.
// Stores admin-managed slides in localStorage and resolves eligible slides per route/user.

const LS_KEY = 'merkato-hero-banners:v1';
const METRICS_KEY = 'merkato-hero-metrics:v1';
const TEMPLATES_KEY = 'merkato-hero-templates:v1';

export function loadHeroBanners() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}

export function saveHeroBanners(banners) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(Array.isArray(banners) ? banners : []));
    return true;
  } catch (_) {
    return false;
  }
}

export function clearHeroBanners() {
  try { localStorage.removeItem(LS_KEY); } catch (_) {}
}

export function getHeroMetrics() {
  try {
    const raw = localStorage.getItem(METRICS_KEY);
    const v = JSON.parse(raw || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch (_) {
    return {};
  }
}

export function resetHeroMetrics() {
  try { localStorage.removeItem(METRICS_KEY); } catch (_) {}
}

function bumpMetric(key, by = 1) {
  try {
    const metrics = getHeroMetrics();
    metrics[key] = (Number(metrics[key]) || 0) + by;
    localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
  } catch (_) {}
}

function normalizeStr(x) { return String(x || '').trim().toLowerCase(); }

function nowTs() { return Date.now(); }

function isActiveWindow(slide) {
  const n = nowTs();
  const s = slide.startAt ? Number(new Date(slide.startAt).getTime()) : null;
  const e = slide.endAt ? Number(new Date(slide.endAt).getTime()) : null;
  if (s && n < s) return false;
  if (e && n > e) return false;
  return true;
}

function pageMatches(slidePages, currentPath) {
  if (!Array.isArray(slidePages) || slidePages.length === 0) return true;
  const p = currentPath || '/';
  return slidePages.some((pat) => {
    if (!pat) return false;
    if (pat === '*' || pat === 'home') return p === '/' || p === '';
  // prefix match for simple routes
    return String(p).startsWith(String(pat));
  });
}

function roleMatches(slideRoles, role) {
  if (!Array.isArray(slideRoles) || slideRoles.length === 0) return true;
  const r = normalizeStr(role || 'guest');
  return slideRoles.map(normalizeStr).some((sr) => sr === 'all' || sr === r);
}

function langMatches(slideLang, lang) {
  if (!slideLang || normalizeStr(slideLang) === 'all') return true;
  const wanted = normalizeStr(slideLang);
  const cur = normalizeStr(lang || 'en');
  return cur.startsWith(wanted);
}

function regionMatches(slideRegions, region) {
  if (!Array.isArray(slideRegions) || slideRegions.length === 0) return true;
  const r = String(region || 'US').toUpperCase();
  return slideRegions.map((x) => String(x).toUpperCase()).includes(r);
}

function getUserContext() {
  let role = 'guest';
  let lang = 'en';
  let region = 'US';
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    if (user && user.role) role = user.role;
  } catch (_) {}
  try {
    const preferred = localStorage.getItem('lang') || navigator.language || 'en-US';
    lang = String(preferred).toLowerCase();
  } catch (_) {}
  try {
    const loc = (navigator.language || 'en-US').split('-')[1];
    if (loc) region = loc.toUpperCase();
  } catch (_) {}
  return { role, lang, region };
}

// Map stored slide to HeroBar slide shape
function toHeroBarSlide(s) {
  return {
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    bg: s.bg,
    type: s.type || 'copy-image-right',
    image: s.imageUrl,
    imageTablet: s.imageTabletUrl || null,
    imageMobile: s.imageMobileUrl || null,
    imageAlt: s.imageAlt || 'Featured promotion',
    imageFocal: s.imageFocal || '50% 50%',
    ctas: [
      s.ctaText && s.ctaHref ? { label: s.ctaText, href: s.ctaHref, variant: 'primary' } : null,
      s.secondaryCtaText && s.secondaryCtaHref ? { label: s.secondaryCtaText, href: s.secondaryCtaHref, variant: 'ghost' } : null,
    ].filter(Boolean),
  };
}

export function resolveHeroSlides({ currentPath = '/', role, lang, region, includeDrafts = false } = {}) {
  const eligible = eligibleHeroSlides({ currentPath, role, lang, region, includeDrafts });
  const limited = eligible.slice(0, 6);
  bumpMetric('resolve.count');
  bumpMetric(`resolve.path.${currentPath}`);
  bumpMetric(`resolve.eligible.${eligible.length}`);
  limited.forEach((s) => {
    const id = s.id || s.title || 'untitled';
    bumpMetric(`resolve.slide.${id}`);
    bumpMetric(`resolve.slidePath.${id}.${currentPath}`);
  });

  return limited.map(toHeroBarSlide);
}

// Return all eligible slides before capping; sorted by priority then recency.
export function eligibleHeroSlides({ currentPath = '/', role, lang, region, includeDrafts = false } = {}) {
  const ctx = {
    ...getUserContext(),
    ...(role ? { role } : {}),
    ...(lang ? { lang } : {}),
    ...(region ? { region } : {}),
  };
  const all = loadHeroBanners();
  const eligible = all
    .filter((s) => s && (includeDrafts ? true : s.published !== false))
    .filter((s) => isActiveWindow(s))
    .filter((s) => pageMatches(s.pages, currentPath))
    .filter((s) => roleMatches(s.roles, ctx.role))
    .filter((s) => langMatches(s.language, ctx.lang))
    .filter((s) => regionMatches(s.regions, ctx.region));
  eligible.sort((a, b) => {
    const pa = Number(a.priority || 0);
    const pb = Number(b.priority || 0);
    if (pa !== pb) return pa - pb;
    const ta = Number(new Date(a.createdAt || 0).getTime());
    const tb = Number(new Date(b.createdAt || 0).getTime());
    return tb - ta;
  });
  return eligible;
}

export function presetsBg() {
  return [
    { key: 'amber', label: 'Amber', value: 'var(--hero-amber)' },
    { key: 'rose', label: 'Rose → Pink', value: 'linear-gradient(90deg, var(--hero-rose), #FFE4E6)' },
    { key: 'mint-sky', label: 'Mint → Sky', value: 'linear-gradient(90deg, var(--hero-mint), #E0F2FE)' },
    { key: 'sky-lilac', label: 'Sky → Lilac', value: 'linear-gradient(90deg, var(--hero-sky), var(--hero-lilac))' },
  ];
}

export function newSlideTemplate() {
  return {
    id: `hero_${Date.now()}`,
    title: 'Headline',
    subtitle: 'Sub-headline copy here',
    bg: presetsBg()[0].value,
    type: 'copy-image-right',
  imageUrl: '/images/default-product.svg',
    imageTabletUrl: '',
    imageMobileUrl: '',
    imageAlt: 'Featured promotion',
    imageFocal: '50% 50%',
    ctaText: 'Shop Now',
  ctaHref: '/discover',
    secondaryCtaText: 'Explore Categories',
  secondaryCtaHref: '/discover',
    pages: ['home'],
    roles: ['all'],
    regions: [],
    language: 'all',
    startAt: null,
    endAt: null,
    priority: 0,
    published: false, // new slides start as Draft
    createdAt: new Date().toISOString(),
  };
}

export function upsertBanner(slide) {
  const all = loadHeroBanners();
  const idx = all.findIndex((s) => (s.id && slide.id ? s.id === slide.id : s.title === slide.title));
  const next = [...all];
  if (idx >= 0) next[idx] = { ...next[idx], ...slide };
  else next.unshift({ ...slide, createdAt: new Date().toISOString() });
  saveHeroBanners(next);
  return next;
}

export function deleteBanner(id) {
  const all = loadHeroBanners();
  const next = all.filter((s) => (s.id ? s.id !== id : s.title !== id));
  saveHeroBanners(next);
  return next;
}

// Record a CTA click for analytics (admin/local metrics only)
export function recordHeroClick({ slideId, href, currentPath = '/' }) {
  if (!slideId) return;
  bumpMetric(`click.slide.${slideId}`);
  if (href) bumpMetric(`click.href.${href}`);
  bumpMetric(`click.path.${currentPath}`);
  bumpMetric(`click.slidePath.${slideId}.${currentPath}`);
}

// =====================
// Reusable Templates API
// =====================

export function loadHeroTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (_) {
    return [];
  }
}

export function saveHeroTemplates(templates) {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(Array.isArray(templates) ? templates : []));
    return true;
  } catch (_) {
    return false;
  }
}

export function createTemplateFromSlide(slide, name) {
  if (!slide) return loadHeroTemplates();
  const tpl = {
    templateId: `tpl_${nowTs()}_${Math.random().toString(36).slice(2, 7)}`,
    name: String(name || slide.title || 'Untitled template'),
    createdAt: new Date().toISOString(),
    // Persist a clean copy of the slide without runtime-only fields
    data: {
      title: slide.title || '',
      subtitle: slide.subtitle || '',
      bg: slide.bg || presetsBg()[0].value,
      type: slide.type || 'copy-image-right',
  imageUrl: slide.imageUrl || '/images/default-product.svg',
      imageTabletUrl: slide.imageTabletUrl || '',
      imageMobileUrl: slide.imageMobileUrl || '',
      imageAlt: slide.imageAlt || 'Featured promotion',
      imageFocal: slide.imageFocal || '50% 50%',
      ctaText: slide.ctaText || '',
      ctaHref: slide.ctaHref || '',
      secondaryCtaText: slide.secondaryCtaText || '',
      secondaryCtaHref: slide.secondaryCtaHref || '',
      pages: Array.isArray(slide.pages) ? slide.pages : ['home'],
      roles: Array.isArray(slide.roles) ? slide.roles : ['all'],
      regions: Array.isArray(slide.regions) ? slide.regions : [],
      language: slide.language || 'all',
      startAt: slide.startAt || null,
      endAt: slide.endAt || null,
      priority: Number(slide.priority || 0),
    },
  };
  const all = loadHeroTemplates();
  const next = [tpl, ...all];
  saveHeroTemplates(next);
  return next;
}

export function deleteHeroTemplate(templateId) {
  const all = loadHeroTemplates();
  const next = all.filter((t) => t.templateId !== templateId);
  saveHeroTemplates(next);
  return next;
}

export function applyHeroTemplate(tpl) {
  if (!tpl) return newSlideTemplate();
  const base = newSlideTemplate();
  const data = tpl.data || {};
  return {
    ...base,
    // Always force a new id and Draft state; keep createdAt fresh
    id: `hero_${nowTs()}_${Math.random().toString(36).slice(2,6)}`,
    published: false,
    // Overlay stored fields
    ...data,
  };
}
