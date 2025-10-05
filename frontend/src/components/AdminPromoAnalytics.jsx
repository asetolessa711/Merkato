import React, { useEffect, useState } from 'react';
import axios from 'axios';

function AdminPromoAnalytics() {
  const [campaignStats, setCampaignStats] = useState([]);
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/admin/promo-codes', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const codes = res.data;
        const grouped = {};

        for (const code of codes) {
          const campId = code.campaign?._id || 'none';
          const campName = code.campaign?.name || '— Uncategorized —';

          if (!grouped[campId]) {
            grouped[campId] = {
              name: campName,
              promoCount: 0,
              totalUsed: 0,
              totalDiscount: 0
            };
          }

          grouped[campId].promoCount += 1;
          grouped[campId].totalUsed += code.usedCount || 0;

          const discountPerUse =
            code.type === 'percentage'
              ? 0 // Skip estimating percentage
              : code.value || 0;

          grouped[campId].totalDiscount += discountPerUse * (code.usedCount || 0);
        }

        setCampaignStats(Object.values(grouped));
      } catch {
        setMsg('Failed to fetch promo analytics');
      }
    };

    fetchData();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h3>📊 Campaign Analytics</h3>
      {msg && <p style={{ color: 'red' }}>{msg}</p>}
      {campaignStats.length === 0 ? (
        <p>No promo code data yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
          <thead>
            <tr style={{ background: '#f1f1f1' }}>
              <th style={th}>Campaign</th>
              <th style={th}># of Promo Codes</th>
              <th style={th}>Total Times Used</th>
              <th style={th}>Estimated Discount Issued</th>
            </tr>
          </thead>
          <tbody>
            {campaignStats.map((stat, i) => (
              <tr key={i}>
                <td style={td}>{stat.name}</td>
                <td style={td}>{stat.promoCount}</td>
                <td style={td}>{stat.totalUsed}</td>
                <td style={td}>${stat.totalDiscount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th = { padding: 10, textAlign: 'left', borderBottom: '1px solid #ccc' };
const td = { padding: 10, borderBottom: '1px solid #eee' };

export default AdminPromoAnalytics;
