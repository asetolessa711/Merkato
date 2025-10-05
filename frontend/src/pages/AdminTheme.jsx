import React, { useEffect, useMemo, useState } from 'react';
import { fetchActiveTheme, fetchThemes, saveAdminTheme } from '../api/theme'';

const presets = [
  { key: 'merkato-classic', name: 'Merkato Classic', colors: { primary: '#6C63FF', primary600: '#6C63FF', primary700: '#534BE6', bg: '#FDFDFD', surface: '#FDFDFD', text: '#6E7E91', textMuted: '#8A97A8', nav: '#2C2E43', footer: '#2C2E43', accentRed: '#FF6B6B', success: '#A0E7E5', warning: '#F4C430', danger: '#FF6B6B', info: '#6C63FF' } },
  { key: 'minimalist', name: 'Minimalist', colors: { primary: '#111827', primary600: '#0F172A', primary700: '#0B1220', bg: '#FFFFFF', surface: '#FFFFFF', text: '#111827', textMuted: '#6B7280', nav: '#F8FAFC', footer: '#F8FAFC', accentRed: '#EF4444', success: '#22C55E', warning: '#F59E0B', danger: '#DC2626', info: '#2563EB' } },
  { key: 'youth-pulse', name: 'Youth Pulse', colors: { primary: '#F97316', primary600: '#EA580C', primary700: '#C2410C', bg: '#FFF7ED', surface: '#FFFFFF', text: '#111827', textMuted: '#6B7280', nav: '#0EA5E9', footer: '#0EA5E9', accentRed: '#EF4444', success: '#10B981', warning: '#F59E0B', danger: '#DC2626', info: '#22D3EE' } },
  { key: 'holiday-glow', name: 'Holiday Glow', colors: { primary: '#E11D48', primary600: '#BE123C', primary700: '#9F1239', bg: '#FFF8F1', surface: '#FFFFFF', text: '#1F2937', textMuted: '#6B7280', nav: '#111827', footer: '#111827', accentRed: '#DC2626', success: '#10B981', warning: '#F59E0B', danger: '#DC2626', info: '#2563EB' } },
  { key: 'pan-african-pride', name: 'Pan-African Pride', colors: { primary: '#009639', primary600: '#007A2E', primary700: '#006225', bg: '#FFFDF7', surface: '#FFFFFF', text: '#1F2937', textMuted: '#6B7280', nav: '#D22630', footer: '#D22630', accentRed: '#D22630', success: '#009639', warning: '#FAD201', danger: '#D22630', info: '#1D4ED8' } },
  { key: 'night-market', name: 'Night Market', colors: { primary: '#38BDF8', primary600: '#0EA5E9', primary700: '#0284C7', bg: '#0B1220', surface: '#0F172A', text: '#E5E7EB', textMuted: '#9CA3AF', nav: '#0B1220', footer: '#0B1220', accentRed: '#F43F5E', success: '#22C55E', warning: '#F59E0B', danger: '#EF4444', info: '#60A5FA' } },
  { key: 'vendor-spotlight', name: 'Vendor Spotlight', colors: { primary: '#EF4444', primary600: '#DC2626', primary700: '#B91C1C', bg: '#FFF1F2', surface: '#FFFFFF', text: '#111827', textMuted: '#6B7280', nav: '#111827', footer: '#111827', accentRed: '#EF4444', success: '#10B981', warning: '#F59E0B', danger: '#DC2626', info: '#2563EB' } },
  { key: 'wellness-calm', name: 'Wellness Calm', colors: { primary: '#10B981', primary600: '#059669', primary700: '#047857', bg: '#F0FDFA', surface: '#FFFFFF', text: '#065F46', textMuted: '#047857', nav: '#0C4A6E', footer: '#0C4A6E', accentRed: '#F97316', success: '#34D399', warning: '#F59E0B', danger: '#F97316', info: '#06B6D4' } },
  { key: 'sunrise-bazaar', name: 'Sunrise Bazaar', colors: { primary: '#FB7185', primary600: '#F43F5E', primary700: '#E11D48', bg: '#FFF7ED', surface: '#FFFFFF', text: '#1F2937', textMuted: '#6B7280', nav: '#FFEDD5', footer: '#FFEDD5', accentRed: '#DC2626', success: '#10B981', warning: '#F59E0B', danger: '#DC2626', info: '#2563EB' } },
  { key: 'moonlight-deals', name: 'Moonlight Deals', colors: { primary: '#1D4ED8', primary600: '#1E40AF', primary700: '#1E3A8A', bg: '#0B1220', surface: '#0F172A', text: '#E5E7EB', textMuted: '#9CA3AF', nav: '#0B1220', footer: '#0B1220', accentRed: '#EF4444', success: '#22C55E', warning: '#F59E0B', danger: '#EF4444', info: '#60A5FA' } },
  { key: 'eco-roots', name: 'Eco Roots', colors: { primary: '#16A34A', primary600: '#15803D', primary700: '#166534', bg: '#F7FEE7', surface: '#FFFFFF', text: '#14532D', textMuted: '#14532D', nav: '#1C1917', footer: '#1C1917', accentRed: '#D97706', success: '#86EFAC', warning: '#F59E0B', danger: '#DC2626', info: '#2563EB' } },
  { key: 'tech-flow', name: 'Tech Flow', colors: { primary: '#06B6D4', primary600: '#0891B2', primary700: '#0E7490', bg: '#F1F5F9', surface: '#FFFFFF', text: '#0F172A', textMuted: '#475569', nav: '#0F172A', footer: '#0F172A', accentRed: '#F43F5E', success: '#22C55E', warning: '#F59E0B', danger: '#EF4444', info: '#22D3EE' } },
  { key: 'artisan-touch', name: 'Artisan Touch', colors: { primary: '#8B5CF6', primary600: '#7C3AED', primary700: '#6D28D9', bg: '#FFFBEB', surface: '#FFFFFF', text: '#1F2937', textMuted: '#6B7280', nav: '#78350F', footer: '#78350F', accentRed: '#DC2626', success: '#84CC16', warning: '#FBBF24', danger: '#DC2626', info: '#2563EB' } },
  { key: 'global-youth', name: 'Global Youth', colors: { primary: '#A78BFA', primary600: '#8B5CF6', primary700: '#7C3AED', bg: '#FDF4FF', surface: '#FFFFFF', text: '#111827', textMuted: '#6B7280', nav: '#0EA5E9', footer: '#0EA5E9', accentRed: '#EF4444', success: '#22C55E', warning: '#F59E0B', danger: '#DC2626', info: '#22D3EE' } },
  { key: 'heritage-harmony', name: 'Heritage Harmony', colors: { primary: '#C59300', primary600: '#8A6D00', primary700: '#5C4800', bg: '#FFFBEB', surface: '#FFFFFF', text: '#3F2D20', textMuted: '#6B5E54', nav: '#2C2E43', footer: '#2C2E43', accentRed: '#A42226', success: '#009639', warning: '#D4AF37', danger: '#A42226', info: '#1D4ED8' } },
];

export default function AdminTheme() {
  const [themes, setThemes] = useState([]);
  const [activeKey, setActiveKey] = useState('default');
  const [personalizationEnabled, setPersonalizationEnabled] = useState(false);
  const [animations, setAnimations] = useState(true);
  const [schedule, setSchedule] = useState(null); // {from, to, key}
  const [editing, setEditing] = useState(() => ({ ...presets[0], zones: {} }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Simple WCAG contrast helpers
  const srgb = (c) => {
    const v = parseInt(c.replace('#', ''), 16);
    const r = (v >> 16) & 255; const g = (v >> 8) & 255; const b = v & 255;
    const toLin = (u) => {
      const s = u / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return { r: toLin(r), g: toLin(g), b: toLin(b) };
  };
  const luminance = (hex) => {
    try { const { r, g, b } = srgb(hex); return 0.2126 * r + 0.7152 * g + 0.0722 * b; } catch { return 0; }
  };
  const contrast = (hex1, hex2) => {
    const l1 = luminance(hex1) + 0.05; const l2 = luminance(hex2) + 0.05; const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (a / b);
  };

  // Load current state
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [activeRes, list] = await Promise.all([
          fetchActiveTheme(),
          fetchThemes(),
        ]);
        if (!mounted) return;
        const actKey = activeRes?.theme?.key || 'default';
        setActiveKey(actKey);
        setPersonalizationEnabled(!!activeRes?.personalizationEnabled);
        setAnimations(!!activeRes?.theme?.animations);
        setThemes(list.length ? list : presets);
  const active = list.find(t => t.key === actKey) || activeRes?.theme || presets[0];
  setEditing({ ...active, colors: { ...active.colors }, zones: { ...(active.zones || {}) } });
        setSchedule(activeRes?.schedule || null);
      } catch (e) {
        // fallback to presets
        setThemes(presets);
        setEditing({ ...presets[0] });
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const previewStyle = useMemo(() => ({
    '--color-primary': editing.colors?.primary,
    '--color-bg': editing.colors?.bg,
    '--color-text': editing.colors?.text,
  }), [editing]);

  const a11yFindings = useMemo(() => {
    const c = editing.colors || {};
    const pairs = [
      { name: 'Primary on BG', a: c.primary, b: c.bg },
      { name: 'Text on BG', a: c.text, b: c.bg },
      { name: 'Nav on BG', a: c.nav, b: c.bg },
      { name: 'Footer on BG', a: c.footer, b: c.bg },
    ];
    return pairs.map(p => {
      const ratio = Number.isFinite(contrast(p.a, p.b)) ? contrast(p.a, p.b) : 0;
      const okLarge = ratio >= 3.0; // AA large text
      const okNormal = ratio >= 4.5; // AA normal text
      return { ...p, ratio: Number(ratio.toFixed(2)), okLarge, okNormal };
    });
  }, [editing, contrast]);

  const handleColorChange = (key, value) => {
    setEditing(prev => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
  };

  const handlePreset = (key) => {
    const p = presets.find(p => p.key === key);
    if (p) {
      setEditing({ ...p, zones: editing.zones || {} });
    }
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setMessage('');
    try {
      const upsert = themes.filter(Boolean).reduce((acc, t) => {
        const exists = acc.find(x => x.key === t.key);
        if (!exists) acc.push({ key: t.key, name: t.name, colors: t.colors, animations: !!t.animations, zones: t.zones });
        return acc;
      }, []);
      // Include current editing theme (replace if same key)
      const idx = upsert.findIndex(x => x.key === editing.key);
  if (idx >= 0) upsert[idx] = { key: editing.key, name: editing.name, colors: editing.colors, animations, zones: editing.zones };
  else upsert.push({ key: editing.key, name: editing.name, colors: editing.colors, animations, zones: editing.zones });

      const payload = {
        themes: upsert,
        activeKey,
        personalizationEnabled,
        schedule: schedule && schedule.key ? schedule : null,
      };
      const saved = await saveAdminTheme(payload);
      setMessage('Saved');
      // Cache and broadcast
  try { localStorage.setItem('merkato-active-theme', JSON.stringify({ theme: saved.themes.find(t => t.key === saved.activeKey) })); } catch {}
      window.dispatchEvent(new Event('theme:updated'));
    } catch (e) {
      setError('Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading theme…</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>🎨 Theme Manager</h2>
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
      {message && <div style={{ color: 'green' }}>{message}</div>}

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
        <div>
      <h3>Colors</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))', gap: 12 }}>
            {Object.entries(editing.colors || {}).map(([k, v]) => (
              <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12, opacity: 0.7 }}>{k}</span>
                <input type="color" value={v} onChange={(e) => handleColorChange(k, e.target.value)} />
              </label>
            ))}
          </div>

          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={animations} onChange={(e) => setAnimations(e.target.checked)} />
              Enable animations
            </label>
          </div>

          <h3 style={{ marginTop: 20 }}>Active Theme</h3>
          <select value={activeKey} onChange={(e) => setActiveKey(e.target.value)}>
            {[...themes, editing].filter(Boolean).reduce((acc, t) => {
              if (!acc.find(x => x.key === t.key)) acc.push(t);
              return acc;
            }, []).map(t => (
              <option key={t.key} value={t.key}>{t.name} ({t.key})</option>
            ))}
          </select>

          <h3 style={{ marginTop: 20 }}>Presets</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {presets.map(p => (
              <button key={p.key} type="button" onClick={() => handlePreset(p.key)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #e5e7eb', cursor: 'pointer' }}>{p.name}</button>
            ))}
          </div>

          <h3 style={{ marginTop: 20 }}>Personalization</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={personalizationEnabled} onChange={(e) => setPersonalizationEnabled(e.target.checked)} />
            Allow users to override theme
          </label>

          <h3 style={{ marginTop: 20 }}>Schedule</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>From: <input type="datetime-local" value={schedule?.from || ''} onChange={(e) => setSchedule(prev => ({ key: (prev?.key || activeKey), to: prev?.to || '', from: e.target.value }))} /></label>
            <label>To: <input type="datetime-local" value={schedule?.to || ''} onChange={(e) => setSchedule(prev => ({ key: (prev?.key || activeKey), from: prev?.from || '', to: e.target.value }))} /></label>
          </div>
          <div style={{ marginTop: 8 }}>
            <label>Theme Key: <input value={schedule?.key || activeKey} onChange={(e) => setSchedule(prev => ({ ...(prev || {}), key: e.target.value }))} /></label>
          </div>

          <div style={{ marginTop: 20 }}>
            <button onClick={handleSave} disabled={saving} style={{ background: 'var(--color-primary)', color: '#fff', border: 0, padding: '10px 16px', borderRadius: 6, cursor: 'pointer' }}>{saving ? 'Saving…' : 'Save & Apply'}</button>
          </div>

          {/* Modular Zones */}
          <div style={{ marginTop: 28 }}>
            <h3>Modular Zones</h3>
            {[
              { key: 'header', label: 'Header', fields: [
                { k: 'bg', type: 'color', label: 'Background' },
                { k: 'link', type: 'color', label: 'Link Color' },
                { k: 'hover', type: 'color', label: 'Hover Color' },
                { k: 'dropdownBg', type: 'color', label: 'Dropdown BG' },
              ]},
              { key: 'footer', label: 'Footer', fields: [
                { k: 'bg', type: 'color', label: 'Background' },
                { k: 'text', type: 'color', label: 'Text' },
                { k: 'link', type: 'color', label: 'Link' },
              ]},
              { key: 'hero', label: 'Hero Section', fields: [
                { k: 'bg', type: 'color', label: 'Background' },
                { k: 'overlay', type: 'text', label: 'Overlay Gradient/CSS' },
                { k: 'ctaBg', type: 'color', label: 'CTA BG' },
                { k: 'ctaText', type: 'color', label: 'CTA Text' },
              ]},
              { key: 'cards', label: 'Cards', fields: [
                { k: 'radius', type: 'text', label: 'Border Radius' },
                { k: 'shadow', type: 'text', label: 'Shadow' },
                { k: 'bg', type: 'color', label: 'Background' },
                { k: 'hoverAnim', type: 'checkbox', label: 'Hover Animation' },
                { k: 'badge', type: 'color', label: 'Badge Color' },
              ]},
              { key: 'buttons', label: 'Buttons', fields: [
                { k: 'primary', type: 'color', label: 'Primary' },
                { k: 'primaryHover', type: 'color', label: 'Primary Hover' },
                { k: 'secondary', type: 'color', label: 'Secondary' },
                { k: 'secondaryHover', type: 'color', label: 'Secondary Hover' },
              ]},
              { key: 'typography', label: 'Typography', fields: [
                { k: 'body', type: 'text', label: 'Body Font' },
                { k: 'heading', type: 'text', label: 'Heading Font' },
                { k: 'headingWeight', type: 'number', label: 'Heading Weight' },
                { k: 'paragraphSpacing', type: 'text', label: 'Paragraph Spacing' },
              ]},
              { key: 'backgrounds', label: 'Backgrounds', fields: [
                { k: 'page', type: 'color', label: 'Page' },
                { k: 'sectionDivider', type: 'color', label: 'Section Divider' },
                { k: 'modalOverlay', type: 'text', label: 'Modal Overlay CSS' },
              ]},
              { key: 'alerts', label: 'Alerts & Banners', fields: [
                { k: 'alertBg', type: 'color', label: 'Alert BG' },
                { k: 'promoBg', type: 'color', label: 'Promo BG' },
                { k: 'urgency', type: 'color', label: 'Urgency' },
              ]},
              { key: 'forms', label: 'Forms & Inputs', fields: [
                { k: 'border', type: 'color', label: 'Border' },
                { k: 'focus', type: 'color', label: 'Focus' },
                { k: 'placeholder', type: 'color', label: 'Placeholder' },
                { k: 'error', type: 'color', label: 'Error' },
              ]},
              { key: 'dashboard', label: 'User Dashboard', fields: [
                { k: 'sidebarBg', type: 'color', label: 'Sidebar BG' },
                { k: 'tabActiveBg', type: 'color', label: 'Tab Active BG' },
              ]},
            ].map(zone => (
              <details key={zone.key} style={{ margin: '14px 0', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{zone.label}</summary>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(140px, 1fr))', gap: 10, marginTop: 12 }}>
                  {zone.fields.map(f => (
                    <label key={f.k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <span style={{ fontSize: 12, opacity: 0.7 }}>{f.label}</span>
                      {f.type === 'color' && (
                        <input type="color" value={editing.zones?.[zone.key]?.[f.k] || ''}
                          onChange={(e) => setEditing(prev => ({ ...prev, zones: { ...prev.zones, [zone.key]: { ...(prev.zones?.[zone.key] || {}), [f.k]: e.target.value } } }))} />
                      )}
                      {f.type === 'text' && (
                        <input type="text" value={editing.zones?.[zone.key]?.[f.k] || ''}
                          onChange={(e) => setEditing(prev => ({ ...prev, zones: { ...prev.zones, [zone.key]: { ...(prev.zones?.[zone.key] || {}), [f.k]: e.target.value } } }))} />
                      )}
                      {f.type === 'number' && (
                        <input type="number" value={editing.zones?.[zone.key]?.[f.k] ?? ''}
                          onChange={(e) => setEditing(prev => ({ ...prev, zones: { ...prev.zones, [zone.key]: { ...(prev.zones?.[zone.key] || {}), [f.k]: Number(e.target.value) } } }))} />
                      )}
                      {f.type === 'checkbox' && (
                        <input type="checkbox" checked={!!editing.zones?.[zone.key]?.[f.k]}
                          onChange={(e) => setEditing(prev => ({ ...prev, zones: { ...prev.zones, [zone.key]: { ...(prev.zones?.[zone.key] || {}), [f.k]: e.target.checked } } }))} />
                      )}
                    </label>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>

        <div>
          <h3>Live Preview</h3>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ background: editing.zones?.header?.bg || editing.colors?.nav, color: editing.zones?.header?.link || '#fff', padding: 12 }}>Navbar preview</div>
            <div style={{ padding: 20, background: editing.colors?.bg, color: editing.colors?.text }}>
              <p>Buttons, cards, and accents preview:</p>
              <button style={{ background: editing.zones?.buttons?.primary || 'var(--color-primary)', color: '#fff', border: 0, padding: '8px 12px', borderRadius: 6, cursor: 'pointer' }}>Primary CTA</button>
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[1,2,3].map(n => (
                  <div key={n} style={{ padding: 12, background: editing.zones?.cards?.bg || '#fff', borderRadius: editing.zones?.cards?.radius || 8, boxShadow: editing.zones?.cards?.shadow || 'var(--shadow-sm)', border: '1px solid #e5e7eb' }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Card {n}</div>
                    <div style={{ height: 6, borderRadius: 999, background: 'var(--color-primary)' }} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: editing.zones?.footer?.bg || editing.colors?.footer, color: editing.zones?.footer?.text || '#fff', padding: 12 }}>Footer preview</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: '8px 0' }}>Accessibility checks</h4>
            <ul style={{ paddingLeft: 16 }}>
              {a11yFindings.map((f, i) => (
                <li key={i} style={{ color: f.okNormal ? 'green' : f.okLarge ? '#b45309' : 'crimson' }}>
                  {f.name}: {f.ratio}:1 {f.okNormal ? '✓ AA normal' : f.okLarge ? '• AA large only' : '✗ Low contrast'}
                </li>
              ))}
            </ul>
          </div>
          {/* Scoped inline CSS vars for preview */}
          <div style={{ marginTop: 8, padding: 8, border: '1px dashed #e5e7eb', borderRadius: 8 }}>
            <div style={previewStyle}>This area uses CSS vars from the editor.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
