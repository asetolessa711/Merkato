import React, { useEffect, useState } from 'react';

// Simple admin page to configure home row titles via localStorage
export default function AdminHomeSections() {
  const [titles, setTitles] = useState({ deals: '', featured: '', picks: '', minimal: '' });
  useEffect(() => {
    try {
      const current = JSON.parse(localStorage.getItem('homepage-row-titles') || 'null');
      if (current) setTitles({
        deals: current.deals || '',
        featured: current.featured || '',
        picks: current.picks || '',
        minimal: current.minimal || ''
      });
    } catch (_) {}
  }, []);

  const handleSave = () => {
    const clean = {
      deals: titles.deals || 'Flash Deals',
      featured: titles.featured || 'Featured Products',
      picks: titles.picks || 'Popular Picks',
      minimal: titles.minimal || 'Just For You'
    };
    localStorage.setItem('homepage-row-titles', JSON.stringify(clean));
    alert('Homepage row titles saved. Refresh Home to see changes.');
  };

  const onChange = (e) => setTitles({ ...titles, [e.target.name]: e.target.value });

  return (
    <div style={{ maxWidth: 720, margin: '20px auto', padding: 16 }}>
      <h2>Home Sections Settings</h2>
      <p>Update the labels shown above rows on the Home Page.</p>

      <label>Deals Row Title
        <input name="deals" value={titles.deals} onChange={onChange} placeholder="Flash Deals" style={{ display: 'block', width: '100%', margin: '6px 0 16px' }} />
      </label>
      <label>Featured Row Title
        <input name="featured" value={titles.featured} onChange={onChange} placeholder="Featured Products" style={{ display: 'block', width: '100%', margin: '6px 0 16px' }} />
      </label>
      <label>Popular Picks Row Title
        <input name="picks" value={titles.picks} onChange={onChange} placeholder="Popular Picks" style={{ display: 'block', width: '100%', margin: '6px 0 16px' }} />
      </label>
      <label>Minimal Row Title
        <input name="minimal" value={titles.minimal} onChange={onChange} placeholder="Just For You" style={{ display: 'block', width: '100%', margin: '6px 0 16px' }} />
      </label>

      <button onClick={handleSave} style={{ background: '#111827', color: '#fff', border: 0, borderRadius: 6, padding: '8px 12px', cursor: 'pointer' }}>Save</button>
    </div>
  );
}
