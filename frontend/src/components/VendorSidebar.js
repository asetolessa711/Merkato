import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './VendorSidebar.css';

const VendorSidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vendor-sidebar-collapsed') || '{}'); } catch (_) { return {}; }
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('vendor-sidebar-isCollapsed') === 'true'; } catch (_) { return false; }
  });
  const [onboarded, setOnboarded] = useState(true);
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => {
    try { return localStorage.getItem('vendor-welcome-dismissed') === 'true'; } catch(_) { return false; }
  });
  useEffect(() => {
    try {
      const v = localStorage.getItem('vendor-onboarded');
      setOnboarded(v === null ? true : v === 'true');
    } catch (_) {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem('vendor-sidebar-collapsed', JSON.stringify(collapsed)); } catch(_){}
  }, [collapsed]);
  useEffect(() => {
    try { localStorage.setItem('vendor-sidebar-isCollapsed', String(isSidebarCollapsed)); } catch(_){}
  }, [isSidebarCollapsed]);

  const status = (() => {
    try { return JSON.parse(localStorage.getItem('vendor-system-status') || '{}'); } catch(_) { return {}; }
  })();
  const storefrontHealth = (() => {
    try { return localStorage.getItem('vendor-storefront-health') || 'GOOD'; } catch(_) { return 'GOOD'; }
  })();
  const fulfillmentRating = (() => {
    try { return parseInt(localStorage.getItem('vendor-fulfillment-rating') || '82', 10); } catch(_) { return 82; }
  })();
  const statusColor = (v) => v === 'OK' || v === 'GOOD' ? '#10b981' : v === 'WARN' ? '#f59e0b' : '#ef4444';

  const linkStyle = {
    display: 'block',
    padding: '10px 14px',
    textDecoration: 'none',
    color: '#0f172a',
    fontWeight: 500,
    borderRadius: 6,
    transition: 'all 0.2s ease-in-out'
  };
  const activeStyle = {
    ...linkStyle,
    backgroundColor: '#ecf0f1',
    borderLeft: '4px solid var(--color-primary)',
    fontWeight: 700
  };
  const Section = ({ title, id, children, hidden }) => {
    // Hook must run unconditionally (even if hidden)
    const isActiveSection = useMemo(() => {
      const arr = React.Children.toArray(children || []);
      return arr.some((child) => {
        const to = child?.props?.to;
        return typeof to === 'string' && location.pathname.startsWith(to);
      });
    }, [children, location.pathname]);
    if (hidden) return null;
    const isCollapsed = !!collapsed[id];
    return (
      <div className={`sidebar-section ${isActiveSection ? 'active-section' : ''}`}>
        <button
          className="sidebar-section-title"
          aria-expanded={!isCollapsed}
          aria-controls={`sec-${id}`}
          onClick={() => setCollapsed((c) => ({ ...c, [id]: !c[id] }))}
          title={isCollapsed ? 'Expand' : 'Collapse'}
          style={{
            background: 'transparent', border: 'none', padding: 0, width: '100%', textAlign: 'left', cursor: 'pointer'
          }}
        >
          {title} {isCollapsed ? '▸' : '▾'}
        </button>
        {!isCollapsed && (
          <div id={`sec-${id}`} className="sidebar-section-links">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`vendor-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      <h3 className="sidebar-header">
        <span>Vendor Menu</span>
        <button className="sidebar-toggle" title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setIsSidebarCollapsed(v => !v)}>
          {isSidebarCollapsed ? '⤢' : '⤡'}
        </button>
      </h3>
      {!onboarded && !welcomeDismissed && (
        <div className="welcome-banner" role="status">
          <div>
            <strong>Welcome!</strong>
            <div>Finish setup to unlock analytics and payouts.</div>
          </div>
          <div className="welcome-actions">
            <NavLink to="/vendor/onboarding" title="Open setup checklist">Complete Setup</NavLink>
            <button onClick={() => { setWelcomeDismissed(true); try { localStorage.setItem('vendor-welcome-dismissed','true'); } catch(_) {} }} aria-label="Dismiss">✕</button>
          </div>
        </div>
      )}
      <nav className="sidebar-nav">
        <Section title="Dashboard" id="dashboard">
          <NavLink to="/vendor" end style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Overview of sales, orders, and status"><span>🏠</span> <span>Overview</span></NavLink>
          <NavLink to="/vendor/dashboard" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Key metrics and trends"><span>📈</span> <span>Performance Summary</span></NavLink>
          <NavLink to="/storefront" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Preview your public storefront"><span>🪞</span> <span>Storefront Preview</span></NavLink>
          <NavLink to="/vendor/trust" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="View and improve your trust badge status"><span>🛡️</span> <span>Trust Badge Status</span></NavLink>
        </Section>

        <Section title="Products" id="products">
          <NavLink to="/vendor/products" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Manage live products"><span>📦</span> <span>All Products</span></NavLink>
          <NavLink to="/vendor/upload" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Add a new product"><span>➕</span> <span>Add New Product</span></NavLink>
          <NavLink to="/vendor/drafts" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Draft and scheduled products"><span>📝</span> <span>Drafts & Scheduled</span></NavLink>
          <NavLink to="/vendor/product-reviews" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="See and respond to reviews"><span>⭐</span> <span>Product Reviews</span></NavLink>
        </Section>

        <Section title="Orders" id="orders">
          <NavLink to="/vendor/orders" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="All orders and statuses"><span>📬</span> <span>Order List</span></NavLink>
          <NavLink to="/vendor/fulfillment" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Pick, pack, ship center"><span>🚚</span> <span>Fulfillment Center</span></NavLink>
          <NavLink to="/vendor/returns" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Manage returns and disputes"><span>↩️</span> <span>Returns & Disputes</span></NavLink>
        </Section>

  <Section title="Vendor Profile" id="user">
          <NavLink to="/vendor/profile" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Your business account details"><span>👤</span> <span>Business Info</span></NavLink>
          <NavLink to="/vendor/bank" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Payout destination and bank details"><span>🏦</span> <span>Bank Details</span></NavLink>
          <NavLink to="/vendor/verification" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="KYC/KYB verification status"><span>✅</span> <span>Verification Status</span></NavLink>
        </Section>

        <Section title="Upload Center" id="upload">
          <NavLink to="/vendor/upload" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Quick single upload"><span>⬆️</span> <span>Quick Upload</span></NavLink>
          <NavLink to="/vendor/bulk-upload" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="CSV or XLS bulk upload"><span>📥</span> <span>Bulk Upload</span></NavLink>
          <NavLink to="/vendor/media" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Images, videos, assets"><span>🖼️</span> <span>Media Library</span></NavLink>
          <NavLink to="/vendor/video-promotions" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Short promotional videos"><span>🎥</span> <span>Video Promotions</span></NavLink>
        </Section>

        <Section title="Analytics" id="analytics" hidden={!onboarded}>
          <NavLink to="/vendor/analytics" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Sales over time"><span>📊</span> <span>Sales Trends</span></NavLink>
          <NavLink to="/vendor/analytics/products" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Product performance KPIs"><span>📈</span> <span>Product Performance</span></NavLink>
          <NavLink to="/vendor/analytics/customers" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Customer insights and segments"><span>👥</span> <span>Customer Insights</span></NavLink>
        </Section>

        <Section title="Finance" id="finance" hidden={!onboarded}>
          <NavLink to="/vendor/payouts" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Payout schedule and balance"><span>💳</span> <span>Payouts</span></NavLink>
          <NavLink to="/vendor/invoices" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Invoice history"><span>🧾</span> <span>Invoice History</span></NavLink>
          <NavLink to="/vendor/tax-docs" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Tax documents"><span>📄</span> <span>Tax Documents</span></NavLink>
        </Section>

        <Section title="Support" id="support">
          <NavLink to="/vendor/help" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Self-serve help center"><span>❓</span> <span>Help Center</span></NavLink>
          <NavLink to="/vendor/contact-admin" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Contact marketplace admin"><span>📮</span> <span>Contact Admin</span></NavLink>
          <NavLink to="/vendor/policy" style={({ isActive }) => (isActive ? activeStyle : linkStyle)} title="Policy and guidelines"><span>📘</span> <span>Policy & Guidelines</span></NavLink>
        </Section>
      </nav>
      <div className="sidebar-footer">
        <div className="status" title="System status"><span className="dot" style={{ background: (localStorage.getItem('vendor-system-status') ? '#10b981' : '#f59e0b') }}></span> System Status</div>
        <div className="signals">
          <span className="chip" title={`Moderation: ${status?.moderation || 'OK'}`}><i className="chip-dot" style={{ background: statusColor(status?.moderation || 'OK') }} /> Moderation</span>
          <span className="chip" title={`Storefront Health: ${storefrontHealth}`}><i className="chip-dot" style={{ background: statusColor(storefrontHealth) }} /> Health</span>
          <span className="chip" title={`Fulfillment Rating: ${fulfillmentRating}%`}><i className="chip-dot" style={{ background: fulfillmentRating >= 80 ? '#10b981' : fulfillmentRating >= 60 ? '#f59e0b' : '#ef4444' }} /> Fulfillment {fulfillmentRating}%</span>
        </div>
        <NavLink to="/vendor/help" className="help-link" title="Visit Help Center">Help Center ↗</NavLink>
        <button className="sidebar-toggle" title="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to Top ↑</button>
      </div>
    </div>
  );
};

export default VendorSidebar;
