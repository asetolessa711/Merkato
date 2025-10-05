import React, { useCallback, useMemo, useState } from 'react';
import axios from 'axios';

// Minimal viable vendor gallery uploader per spec
export default function GalleryUploader({ productId, onSaved }) {
  const [files, setFiles] = useState([]); // {file, preview, alt, variantKey}
  const [error, setError] = useState('');
  const [warn, setWarn] = useState('');
  const [info, setInfo] = useState('');

  const onDrop = useCallback(async (ev) => {
    ev.preventDefault();
    const list = Array.from(ev.dataTransfer?.files || []);
    const imgs = list.filter(f => /image\//.test(f.type));
    if (imgs.length !== list.length) setError('Some files skipped (non-images).');
    const next = imgs.map(f => ({ file: f, preview: URL.createObjectURL(f), alt: '', variantKey: '' }));
    setFiles(prev => [...prev, ...next]);
  }, []);

  const onFileSelect = async (ev) => {
    const list = Array.from(ev.target.files || []);
    const next = list.map(f => ({ file: f, preview: URL.createObjectURL(f), alt: '', variantKey: '' }));
    setFiles(prev => [...prev, ...next]);
  };

  const move = (i, dir) => {
    setFiles(prev => {
      const cp = [...prev];
      const j = i + dir;
      if (j < 0 || j >= cp.length) return cp;
      const [x] = cp.splice(i, 1);
      cp.splice(j, 0, x);
      return cp;
    });
  };

  const setHero = (i) => move(i, -i); // move to front

  const submit = async () => {
    setError(''); setWarn(''); setInfo('');
    if (files.length < 1) { setError('At least one image required'); return; }
    if (files.length < 3) { setWarn('Recommended: add 2 more angles'); }

    // Upload originals first
    const form = new FormData();
    files.forEach(f => form.append('images', f.file));
    const up = await axios.post('/api/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    const detailed = Array.isArray(up.data?.images) ? up.data.images : [];
    const urls = Array.isArray(up.data?.imageUrls) ? up.data.imageUrls : [];

    // Build payload for product images
    let images = [];
    if (detailed.length) {
      images = detailed.map((it, idx) => ({
        urlOriginal: it.urlOriginal,
        urlHero: it.urlHero,
        urlThumb: it.urlThumb,
        widthOriginal: it.widthOriginal,
        heightOriginal: it.heightOriginal,
        widthHero: it.widthHero,
        heightHero: it.heightHero,
        widthThumb: it.widthThumb,
        heightThumb: it.heightThumb,
        mime: it.mime || '',
        alt: files[idx]?.alt || '',
        variantKey: files[idx]?.variantKey || '',
        order: idx,
        moderation: { status: 'submitted' }
      }));
    } else {
      images = urls.map((url, idx) => ({
        urlOriginal: url,
        urlHero: url,
        urlThumb: url,
        widthOriginal: undefined,
        heightOriginal: undefined,
        mime: '',
        alt: files[idx]?.alt || '',
        variantKey: files[idx]?.variantKey || '',
        order: idx,
        moderation: { status: 'submitted' }
      }));
    }

    const save = await axios.post(`/api/vendor/products/${productId}/images`, { images });
    try {
      // Check if async derivatives queue is enabled; if so, hint the user that images may refine shortly.
      const st = await axios.get('/api/upload/status');
      if (st.data?.status?.enabled) {
        setInfo('Images saved. Derivatives are processing in background and will refine shortly.');
      }
    } catch(_) {}
    if (save.data?.ok) onSaved?.(save.data.gallery);
  };

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{ border: '2px dashed #ddd', padding: 16, borderRadius: 8, textAlign: 'center', marginBottom: 12 }}
      >
        Drag & drop images here or <label style={{ color: '#0984e3', cursor: 'pointer' }}><input type="file" accept="image/*" multiple onChange={onFileSelect} style={{ display: 'none' }} />browse</label>
      </div>
  {warn && <div style={{ color: '#a16207', marginBottom: 8 }}>{warn}</div>}
  {info && <div style={{ color: '#065f46', marginBottom: 8 }}>{info}</div>}
      {error && <div style={{ color: '#b91c1c', marginBottom: 8 }}>{error}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
        {files.map((f, i) => (
          <div key={i} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
            <img src={f.preview} alt="Preview" style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 6 }} />
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button onClick={() => move(i,-1)} disabled={i===0}>↑</button>
              <button onClick={() => move(i,1)} disabled={i===files.length-1}>↓</button>
              <button onClick={() => setHero(i)}>Set as hero</button>
            </div>
            <label style={{ display: 'block', marginTop: 6 }}>Alt
              <input value={f.alt} onChange={(e)=> setFiles(prev => { const cp=[...prev]; cp[i] = { ...cp[i], alt: e.target.value }; return cp; })} style={{ width: '100%' }} />
            </label>
            <label style={{ display: 'block', marginTop: 6 }}>Color
              <input value={f.variantKey} onChange={(e)=> setFiles(prev => { const cp=[...prev]; cp[i] = { ...cp[i], variantKey: e.target.value }; return cp; })} style={{ width: '100%' }} placeholder="e.g., Cloud White" />
            </label>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12 }}>
        <button onClick={submit} style={{ background: '#00B894', color: '#fff', padding: '8px 14px', borderRadius: 6, border: 0 }}>Save images</button>
      </div>
    </div>
  );
}
