import React, { useState } from 'react';
import CustomerOrders from './CustomerOrders';
import CustomerInbox from './CustomerInbox';
import FavoritesPage from './FavoritesPage';
import DirectChat from './DirectChat';

export default function CustomersPage() {
  const [tab, setTab] = useState('Profile');

  // Demo/mock data
  const profile = { name: 'Alice Demo', email: 'alice@example.com', avatar: 'https://placehold.co/80x80?text=👤', join: '2023-01-01', orders: 7, wallet: 120, points: 350 };
  const orders = [
    { id: '1001', date: '2025-07-01', status: 'Delivered', total: 99, receipt: '#R1001' },
    { id: '1002', date: '2025-06-15', status: 'Shipped', total: 49, receipt: '#R1002' },
  ];
  const walletTx = [
    { id: 'tx1', type: 'Add Funds', amount: 100, date: '2025-06-01' },
    { id: 'tx2', type: 'Order Payment', amount: -49, date: '2025-06-15' },
  ];
  const wishlist = [
    { id: 'w1', name: 'Cool Shoes', price: 59 },
    { id: 'w2', name: 'Smart Watch', price: 120 },
  ];
  const recentlyViewed = [
    { id: 'rv1', name: 'T-shirt', price: 19 },
    { id: 'rv2', name: 'Headphones', price: 89 },
  ];
  const suggestions = [
    { id: 's1', name: 'AI Pick: Trendy Jacket', price: 99 },
    { id: 's2', name: 'Style Me: Blue Jeans', price: 49 },
  ];
  const notifications = [
    { id: 'n1', text: 'Order #1001 delivered!', date: '2025-07-02' },
    { id: 'n2', text: 'Promo: 10% off summer sale!', date: '2025-07-01' },
  ];
  const referrals = { link: 'https://merkato.com/invite/abc123', credits: 20 };
  const loyalty = { points: 350, nextReward: 'Free Shipping' };
const TABS = [
  'Profile', 'Orders', 'Inbox', 'Favorites', 'Direct Chat', 'Wallet', 'Wishlist', 'Recently Viewed', 'Smart Suggestions', 'Notifications', 'Referral', 'Loyalty', 'Support Chat'
];

  return (
    <div style={{ padding: 32, fontFamily: 'Poppins, sans-serif', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ color: '#00b894', fontWeight: 700, fontSize: '2rem', marginBottom: 16 }}>My Account</h1>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? 'linear-gradient(90deg,#7c2ae8,#00b894)' : '#f6f9fc',
            color: tab === t ? '#fff' : '#333',
            border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 600, cursor: 'pointer', boxShadow: tab === t ? '0 2px 8px #7c2ae855' : 'none'
          }}>{t}</button>
        ))}
      </div>

      {/* Profile Overview */}
      {tab === 'Profile' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32 }}>
          <img src={profile.avatar} alt="avatar" style={{ borderRadius: '50%', width: 80, height: 80, border: '2.5px solid #7c2ae8' }} />
          <div>
            <h2 style={{ margin: 0 }}>{profile.name}</h2>
            <p style={{ margin: 0 }}>{profile.email}</p>
            <p style={{ margin: 0, color: '#888' }}>Joined: {profile.join}</p>
            <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
              <span>Orders: <b>{profile.orders}</b></span>
              <span>Wallet: <b>${profile.wallet}</b></span>
              <span>Points: <b>{profile.points}</b></span>
            </div>
          </div>
        </div>
      )}


      {/* Orders (reuse feature component) */}
      {tab === 'Orders' && (
        <div>
          <CustomerOrders />
        </div>
      )}

      {/* Inbox (reuse feature component) */}
      {tab === 'Inbox' && (
        <div>
          <CustomerInbox />
        </div>
      )}

      {/* Wallet */}
      {tab === 'Wallet' && (
        <div>
          <h2>Wallet Balance: <span style={{ color: '#00b894' }}>${profile.wallet}</span></h2>
          <button style={{ marginRight: 8 }}>Add Funds</button>
          <button>Withdraw Funds</button>
          <h3 style={{ marginTop: 24 }}>Transaction History</h3>
          <ul>
            {walletTx.map(tx => (
              <li key={tx.id}>{tx.date}: {tx.type} <b>{tx.amount > 0 ? '+' : ''}{tx.amount}</b></li>
            ))}
          </ul>
        </div>
      )}

      {/* Wishlist */}
      {tab === 'Wishlist' && (
        <div>
          <h2>Saved Items</h2>
          <ul>
            {wishlist.map(w => (
              <li key={w.id}>{w.name} - ${w.price} <button>Add to Cart</button> <button>Share</button></li>
            ))}
          </ul>
        </div>
      )}

      {/* Recently Viewed */}
      {tab === 'Recently Viewed' && (
        <div>
          <h2>Recently Viewed Products</h2>
          <ul>
            {recentlyViewed.map(rv => (
              <li key={rv.id}>{rv.name} - ${rv.price}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Smart Suggestions */}
      {tab === 'Smart Suggestions' && (
        <div>
          <h2>AI Suggestions</h2>
          <button style={{ marginBottom: 12, background: '#7c2ae8', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px' }}>Style Me</button>
          <ul>
            {suggestions.map(s => (
              <li key={s.id}>{s.name} - ${s.price}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Notifications */}
      {tab === 'Notifications' && (
        <div>
          <h2>Notifications</h2>
          <ul>
            {notifications.map(n => (
              <li key={n.id}>{n.text} <span style={{ color: '#888', fontSize: '0.95em' }}>({n.date})</span></li>
            ))}
          </ul>
        </div>
      )}

      {/* Referral */}
      {tab === 'Referral' && (
        <div>
          <h2>Invite Friends & Earn</h2>
          <p>Share your referral link:</p>
          <input value={referrals.link} readOnly style={{ width: '100%', marginBottom: 8 }} />
          <button onClick={() => navigator.clipboard.writeText(referrals.link)}>Copy Link</button>
          <p>Credits earned: <b>${referrals.credits}</b></p>
        </div>
      )}

      {/* Loyalty */}
      {tab === 'Loyalty' && (
        <div>
          <h2>Loyalty Points</h2>
          <p>You have <b>{loyalty.points}</b> points.</p>
          <p>Next reward: <b>{loyalty.nextReward}</b></p>
        </div>
      )}

      {/* Support Chat */}
      {tab === 'Support Chat' && (
        <div>
          <h2>Support Chat</h2>
          <button style={{ background: '#00b894', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 22px', fontWeight: 600 }}>Open Chat</button>
        </div>
      )}
    </div>
  );
}
