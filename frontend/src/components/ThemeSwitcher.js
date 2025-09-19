import React, { useEffect, useState } from 'react';

function readActive() {
  try { return JSON.parse(localStorage.getItem('merkato-active-theme') || 'null'); } catch { return null; }
}
function readAll() {
  try { return JSON.parse(localStorage.getItem('merkato-all-themes') || '[]'); } catch { return []; }
}

export default function ThemeSwitcher() {
  const [enabled, setEnabled] = useState(false);
  const [themes, setThemes] = useState([]);
  const [value, setValue] = useState('');

  useEffect(() => {
    const act = readActive();
    setEnabled(!!act?.personalizationEnabled);
    setThemes(readAll());
    const current = localStorage.getItem('merkato-user-theme-key') || (act?.theme?.key || '');
    setValue(current);
    const onUpdate = () => {
      const a = readActive();
      setEnabled(!!a?.personalizationEnabled);
      setThemes(readAll());
    };
    window.addEventListener('theme:updated', onUpdate);
    window.addEventListener('storage', (e) => {
      if (e.key === 'merkato-active-theme' || e.key === 'merkato-all-themes') onUpdate();
    });
    return () => {
      window.removeEventListener('theme:updated', onUpdate);
    };
  }, []);

  if (!enabled || (themes || []).length < 2) return null;

  return (
    <div style={{ position: 'fixed', bottom: 16, right: 16, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, boxShadow: '0 6px 16px rgba(0,0,0,0.08)', zIndex: 2500 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, opacity: 0.7 }}>Theme</span>
        <select
          value={value}
          onChange={(e) => {
            const key = e.target.value;
            setValue(key);
            try { localStorage.setItem('merkato-user-theme-key', key); } catch {}
            window.dispatchEvent(new Event('theme:updated'));
          }}
        >
          {themes.map(t => (
            <option key={t.key} value={t.key}>{t.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
