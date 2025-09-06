import React, { useState } from 'react';
import DirectChat from './DirectChat';
import VendorInbox from './VendorInbox';

const TABS = [
  'Profile', 'Orders', 'Inbox', 'Direct Chat', 'Analytics', 'Products', 'Support Chat'
];

export default function VendorAccountPage() {
  const [tab, setTab] = useState('Profile');
  // Demo/mock data for vendor profile
  const profile = { name: 'Demo Vendor', email: 'vendor@demo.com', avatar: 'https://placehold.co/80x80?text=🛍️', join: '2022-05-01', products: 12, revenue: 12000 };

  return (
    <div style={{ padding: 32, fontFamily: 'Poppins, sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ color: '#7c2ae8', fontWeight: 700, fontSize: '2rem', marginBottom: 16 }}>My Vendor Account</h1>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? 'linear-gradient(90deg,#00b894,#7c2ae8)' : '#f6f9fc',
            color: tab === t ? '#fff' : '#333',
            border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: 'pointer', boxShadow: tab === t ? '0 2px 8px #00b89455' : 'none'
          }}>{t}</button>
        ))}
      </div>

      {/* Profile Overview */}
      {tab === 'Profile' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32 }}>
          <img src={profile.avatar} alt="avatar" style={{ borderRadius: '50%', width: 80, height: 80, border: '2.5px solid #00b894' }} />
          <div>
            <h2 style={{ margin: 0 }}>{profile.name}</h2>
            <p style={{ margin: 0 }}>{profile.email}</p>
            <p style={{ margin: 0, color: '#888' }}>Joined: {profile.join}</p>
            <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
              <span>Products: <b>{profile.products}</b></span>
              <span>Revenue: <b>${profile.revenue}</b></span>
            </div>
          </div>
        </div>
      )}

      {/* Orders (placeholder) */}
      {tab === 'Orders' && (
        <div>
          <h2>Order Management</h2>
          <p>View and manage your orders here.</p>
        </div>
      )}

      {/* Inbox (reuse feature component) */}
      {tab === 'Inbox' && (
        <div>
          <VendorInbox />
        </div>
      )}

      {/* Direct Chat (reuse feature component) */}
      {tab === 'Direct Chat' && (
        <div>
          <DirectChat />
        </div>
      )}

      {/* Analytics (placeholder) */}
      {tab === 'Analytics' && (
        <div>
          <h2>Analytics</h2>
          <p>View your sales and product analytics here.</p>
        </div>
      )}

      {/* Products (placeholder) */}
      {tab === 'Products' && (
        <div>
          <h2>Product Management</h2>
          <p>Manage your products here.</p>
        </div>
      )}

      {/* Support Chat (placeholder) */}
      {tab === 'Support Chat' && (
        <div>
          <h2>Support Chat</h2>
          <button style={{ background: '#7c2ae8', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 600 }}>Open Chat</button>
        </div>
      )}
    </div>
  );
}
