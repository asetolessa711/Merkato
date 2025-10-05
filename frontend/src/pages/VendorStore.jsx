import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import MerkatoFooter from '../components/MerkatoFooter'';
import ProductCard from '../components/ProductCard'';
import { useVendorStorefront } from '../hooks/useVendor'';
import { Events } from '../utils/eventsClient'';

function VendorStore() {
  const { id, slug } = useParams();
  const [categoryFilter, setCategoryFilter] = useState('All');
  const idOrSlug = id || slug;
  const { loading, error, products, vendor, customization } = useVendorStorefront(idOrSlug);
  const msg = error ? 'Failed to load vendor or products.' : '';

  useEffect(() => {
    try { Events.track('vendor_store_view', { idOrSlug }); } catch (_) {}
  }, [idOrSlug]);

  // Handle product categories
  const categories = useMemo(() => ['All', ...new Set((products || []).map(p => p.category).filter(Boolean))], [products]);
  const filteredProducts = useMemo(() => categoryFilter === 'All' ? (products || []) : (products || []).filter(p => p.category === categoryFilter), [categoryFilter, products]);

  // Storefront customizations (theme, banner, etc.)
  const storeStyles = customization ? {
    backgroundColor: customization.backgroundColor || '#fff',
    color: customization.textColor || '#333',
    bannerImage: customization.bannerImage || '',
    theme: customization.theme || 'mint',
  } : {};

  return (
    <div style={{
      padding: '20px',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: 'Poppins, sans-serif',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: storeStyles.backgroundColor,
      color: storeStyles.textColor,
    }}>
      <div style={{ flex: 1 }}>
        {/* Back to Marketplace */}
        <div style={{ marginBottom: '20px' }}>
          <Link to="/discover" style={{ color: '#3498DB', textDecoration: 'none', fontWeight: 'bold' }}>← Back to Marketplace</Link>
        </div>

        {/* Vendor Info Section */}
        {vendor ? (
          <div style={{
            background: '#f8f8f8',
            padding: '20px',
            borderRadius: '10px',
            marginBottom: '30px',
            textAlign: 'center',
          }}>
            {vendor.profileImage ? (
              <img
                src={vendor.profileImage}
                alt={vendor.storeName || vendor.name}
                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '10px' }}
              />
            ) : (
              <div
                style={{
                  width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#00B894',
                  color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem', margin: '0 auto 10px'
                }}
              >
                {vendor.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <h2 style={{ margin: '10px 0', fontSize: '1.8rem' }}>{vendor.storeName || vendor.name}'s Store</h2>
            {vendor.storeDescription && <p style={{ fontSize: '1rem', color: '#555', marginBottom: '5px' }}>{vendor.storeDescription}</p>}
            {vendor.bio && <p style={{ fontSize: '0.9rem', color: '#777' }}>{vendor.bio}</p>}
            <p style={{ fontSize: '0.85rem', color: '#999', marginTop: '5px' }}>{vendor.country || 'Country not set'}</p>
          </div>
        ) : <h2>Vendor Store</h2>}

        {msg && <p>{msg}</p>}

        {/* Custom Banner Image */}
        {storeStyles.bannerImage && (
          <div style={{
            backgroundImage: `url(${storeStyles.bannerImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: '250px',
            borderRadius: '10px',
            marginBottom: '20px',
          }} />
        )}

        {/* Category Filter */}
        {categories.length > 1 && (
          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                fontSize: '1rem',
              }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}

        {/* Display Products */}
        {loading ? (
          <div className="products-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px',
          }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} aria-hidden className="skeleton" style={{ background:'#f3f4f6', height: 320, borderRadius:8 }} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: '1.1rem' }}>No products listed by this vendor yet.</p>
        ) : (
          <div className="products-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px',
          }}>
            {filteredProducts.map((p) => (
              <ProductCard key={p._id} product={p} size="md" type="standard" colorOptions={p.colors || []} />
            ))}
          </div>
        )}
      </div>
      <MerkatoFooter />
    </div>
  );
}

export default VendorStore;
