import React, { useState } from 'react';
import AdminPromoCodes from './AdminPromoCodes';
import AdminPromoAnalytics from './AdminPromoAnalytics';
import AdminPromoCampaigns from './AdminPromoCampaigns';

function PromoManager() {
  const [activeTab, setActiveTab] = useState('codes');

  const renderTab = () => {
    switch (activeTab) {
      case 'codes':
        return <AdminPromoCodes />;
      case 'analytics':
        return <AdminPromoAnalytics />;
      case 'campaigns':
        return <AdminPromoCampaigns />;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>🎁 Promo Code Management</h2>
      <div style={{
        marginBottom: 20,
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setActiveTab('codes')}
          style={tabBtn(activeTab === 'codes')}
        >
          📋 Promo Codes
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          style={tabBtn(activeTab === 'analytics')}
        >
          📊 Analytics
        </button>
        <button
          onClick={() => setActiveTab('campaigns')}
          style={tabBtn(activeTab === 'campaigns')}
        >
          🎯 Campaigns
        </button>
      </div>

      {renderTab()}
    </div>
  );
}

const tabBtn = (active) => ({
  padding: '8px 16px',
  backgroundColor: active ? '#00B894' : '#dfe6e9',
  color: active ? '#fff' : '#2d3436',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 'bold'
});

export default PromoManager;

