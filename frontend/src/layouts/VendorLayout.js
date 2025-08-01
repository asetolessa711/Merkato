// VendorLayout.js
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import VendorSidebar from '../components/VendorSidebar';

function VendorLayout({ user, onLogout, lang, onLangChange }) {
  return (
    <div style={{ backgroundColor: '#f9fdfb', minHeight: '100vh', fontFamily: 'Poppins, sans-serif' }}>
      {/* Top Navbar */}
      <Navbar
        user={user}
        onLogout={onLogout}
        lang={lang}
        onLangChange={onLangChange}
      />

      {/* Layout: Sidebar + Content */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 60px)' }}>
        {/* Sidebar */}
        <VendorSidebar />

        {/* Main Content */}
        <main style={{ flex: 1, padding: '30px', overflow: 'auto' }}>
          <Outlet /> {/* ✅ Enables nested routing */}
        </main>
      </div>
    </div>
  );
}

export default VendorLayout;

