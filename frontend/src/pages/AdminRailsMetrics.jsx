import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminRailsMetricsPanel from '../components/admin/AdminRailsMetricsPanel'';

export default function AdminRailsMetrics() {
  const navigate = useNavigate();
  const [windowDays, setWindowDays] = useState(7);
  const baselineDays = useMemo(() => Math.max(28, windowDays), [windowDays]);

  return (
    <div style={{ padding: 16, display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0 }}>Marketing · Rails</h2>
          <p style={{ margin: '4px 0', color: '#64748b' }}>Aggregated performance by rail with recommendations and suppression totals.</p>
        </div>
        <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>Range:</span>
          <button aria-pressed={windowDays===1} onClick={()=>setWindowDays(1)} style={btn(windowDays===1)}>Today</button>
          <button aria-pressed={windowDays===7} onClick={()=>setWindowDays(7)} style={btn(windowDays===7)}>7d</button>
          <button aria-pressed={windowDays===28} onClick={()=>setWindowDays(28)} style={btn(windowDays===28)}>28d</button>
        </div>
      </div>

      <div>
        <AdminRailsMetricsPanel windowDays={windowDays} baselineDays={baselineDays} />
      </div>

      <div style={{ marginTop: 8 }}>
        <button onClick={() => navigate('/admin/marketing')} style={{ fontSize: 12 }}>← Back to Marketing Manager</button>
      </div>
    </div>
  );
}

function btn(active){
  return {
    padding: '6px 10px',
    borderRadius: 6,
    border: active? '1px solid #0ea5e9' : '1px solid #e5e7eb',
    background: active? '#e0f2fe' : '#fff',
    color: active? '#0c4a6e' : '#0f172a',
    fontSize: 12,
    cursor: 'pointer'
  };
}
