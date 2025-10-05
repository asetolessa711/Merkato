import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { MEGA_MENU as DEFAULT_MENU } from '../config/megaMenu'';

// Reusable text input
function TextInput({ label, value, onChange, placeholder, style, ...rest }) {
  return (
    <label style={{ display: 'block', marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: '#555' }}>{label}</div>
      <input
        {...rest}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '8px 10px',
          border: '1px solid #ddd',
          borderRadius: 4,
          ...style,
        }}
      />
    </label>
  );
}

function LinkRow({ colIndex, index, link, onChange, onRemove }) {
  return (
    <div
      data-testid={`link-${colIndex}-${index}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 120px auto',
        gap: 8,
        alignItems: 'end',
        marginBottom: 8,
        opacity: link.status === 'hidden' ? 0.6 : 1,
      }}
    >
      <TextInput
        label="Label"
        value={link.label || ''}
        onChange={(v) => onChange({ ...link, label: v })}
        placeholder="e.g., Mobile Phones"
      />
      <TextInput
        label="Target URL (to)"
        value={link.to || ''}
        onChange={(v) => onChange({ ...link, to: v })}
  placeholder="/search?q=..."
      />
      <label style={{ display: 'block' }}>
        <div style={{ fontSize: 12, color: '#555' }}>Status</div>
        <select
          value={link.status || 'active'}
          onChange={(e) => onChange({ ...link, status: e.target.value })}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4 }}
        >
          <option value="active">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
      </label>
      <button type="button" onClick={onRemove} style={{ padding: '8px 10px' }}>
        Remove
      </button>
    </div>
  );
}

function ColumnEditor({ index, column, onChange, onRemove, onAddLink }) {
  const links = Array.isArray(column.links) ? column.links : [];
  return (
    <div
      data-testid={`column-${index}`}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 6,
        padding: 12,
        background: '#fff',
        opacity: column.status === 'hidden' ? 0.7 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <TextInput
            label="Title"
            value={column.title || ''}
            onChange={(v) => onChange({ ...column, title: v })}
            placeholder="e.g., Electronics"
          />
        </div>
        <div style={{ width: 140 }}>
          <TextInput
            label="Icon (emoji/char)"
            value={column.icon || ''}
            onChange={(v) => onChange({ ...column, icon: v })}
            placeholder="e.g., 📱"
          />
        </div>
        <div style={{ width: 160 }}>
          <label style={{ display: 'block' }}>
            <div style={{ fontSize: 12, color: '#555' }}>Status</div>
            <select
              value={column.status || 'active'}
              onChange={(e) => onChange({ ...column, status: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 4 }}
            >
              <option value="active">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <div style={{ fontWeight: 600, margin: '8px 0' }}>Links</div>
        {links.length === 0 && <div style={{ color: '#666', fontSize: 13 }}>No links yet.</div>}
        {links.map((lnk, i) => (
          <LinkRow
            key={`lnk-${i}`}
            colIndex={index}
            index={i}
            link={lnk}
            onChange={(updated) => {
              const next = links.slice();
              next[i] = updated;
              onChange({ ...column, links: next });
            }}
            onRemove={() => {
              const next = links.slice();
              next.splice(i, 1);
              onChange({ ...column, links: next });
            }}
          />
        ))}
        <button type="button" data-testid={`add-link-${index}`} onClick={onAddLink} style={{ padding: '6px 10px', marginTop: 6 }}>
          + Add Link
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <button type="button" onClick={onRemove} style={{ color: '#b91c1c' }}>
          Delete Column
        </button>
      </div>
    </div>
  );
}

export default function AdminMegaMenu() {
  const [menu, setMenu] = useState([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [audit, setAudit] = useState([]);

  const token = useMemo(() => {
    try {
      return localStorage.getItem('token') || localStorage.getItem('merkato-token') || '';
    } catch {
      return '';
    }
  }, []);
  const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  useEffect(() => {
    let mounted = true;
    const fetchMenu = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get('/api/admin/mega-menu', { headers });
        const data = res.data || {};
        if (!mounted) return;
        setMenu(Array.isArray(data.menu) ? data.menu : []);
        setUpdatedAt(data.updatedAt || '');
      } catch (e) {
        if (!mounted) return;
        // If there's nothing yet, seed with defaults for convenience
        setMenu(DEFAULT_MENU || []);
        setError(e?.response?.data?.message || e?.message || 'Failed to load mega menu');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchMenu();
    return () => {
      mounted = false;
    };
  }, [headers]);

  const addColumn = () => setMenu((prev) => [...prev, { title: '', icon: '', status: 'active', links: [] }]);
  const updateColumn = (idx, col) => setMenu((prev) => { const next = prev.slice(); next[idx] = col; return next; });
  const removeColumn = (idx) => setMenu((prev) => prev.filter((_, i) => i !== idx));
  const addLink = (idx) => setMenu((prev) => {
    const next = prev.slice();
    const col = next[idx] || { title: '', icon: '', status: 'active', links: [] };
    const links = Array.isArray(col.links) ? col.links.slice() : [];
    links.push({ label: '', to: '', status: 'active' });
    next[idx] = { ...col, links };
    return next;
  });

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const payload = { menu: Array.isArray(menu) ? menu : [] };
      const res = await axios.put('/api/admin/mega-menu', payload, { headers });
      setUpdatedAt(res.data?.updatedAt || '');
      setMessage('Saved successfully.');
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const loadAudit = async () => {
    setError('');
    try {
      const res = await axios.get('/api/admin/mega-menu/audit?limit=50', { headers });
      setAudit(Array.isArray(res.data?.entries) ? res.data.entries : []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load audit');
    }
  };

  const importDefaults = () => setMenu(DEFAULT_MENU || []);

  return (
    <div data-testid="admin-megamenu" style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 8 }}>Mega Menu Manager</h2>
      {updatedAt && <div style={{ color: '#666', fontSize: 12 }}>Last updated: {new Date(updatedAt).toLocaleString()}</div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 12, marginBottom: 12 }}>
        <button type="button" onClick={addColumn} data-testid="add-column">+ Add Category</button>
        <button type="button" onClick={save} data-testid="save-megamenu" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
        <button type="button" onClick={importDefaults}>Import Defaults</button>
        <button type="button" onClick={loadAudit}>View Audit</button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: 10, borderRadius: 6, marginBottom: 12 }}>{error}</div>
      )}
      {message && (
        <div style={{ background: '#ecfdf5', color: '#065f46', padding: 10, borderRadius: 6, marginBottom: 12 }}>{message}</div>
      )}

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {menu.map((col, idx) => (
            <ColumnEditor
              key={`col-${idx}`}
              index={idx}
              column={col}
              onChange={(updated) => updateColumn(idx, updated)}
              onRemove={() => removeColumn(idx)}
              onAddLink={() => addLink(idx)}
            />
          ))}
        </div>
      )}

      {!!audit.length && (
        <div style={{ marginTop: 20 }}>
          <h3>Recent Audit</h3>
          <ul style={{ paddingLeft: 18 }}>
            {audit.map((a, i) => (
              <li key={`audit-${i}`}>
                <code>{a.ts}</code> — {a.action} —
                {` categories: ${a.counts?.categories ?? 0}, links: ${a.counts?.links ?? 0}`} —
                {` ${a.user?.email || a.user?.id || 'system'}`}
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  );
}
