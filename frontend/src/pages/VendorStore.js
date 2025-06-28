import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import MerkatoFooter from '../components/MerkatoFooter';

function VendorStore() {
  const { id } = useParams();
  const [products, setProducts] = useState([]);
  const [vendor, setVendor] = useState(null);
  const [msg, setMsg] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const profileRes = await axios.get(`/api/vendor/profile/${id}`);
        const productRes = await axios.get(`/api/products/vendor/${id}`);
        setVendor(profileRes.data);
        setProducts(productRes.data);
      } catch (err) {
        setMsg('Failed to load vendor or products.');
      }
    };
    fetchVendor();
  }, [id]);

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
  const filteredProducts = categoryFilter === 'All' ? products : products.filter(p => p.category === categoryFilter);

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '1200px', 
      margin: '0 auto', 
      fontFamily: 'Poppins, sans-serif',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ marginBottom: '20px' }}>
          <Link to="/shop" style={{ color: '#3498DB', textDecoration: 'none', fontWeight: 'bold' }}>← Back to Marketplace</Link>
        </div>

        {vendor ? (
          <div style={{ background: '#f8f8f8', padding: '20px', borderRadius: '10px', marginBottom: '30px', textAlign: 'center' }}>
            {vendor.profileImage ? (
              <img src={vendor.profileImage} alt={vendor.storeName || vendor.name} style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '10px' }} />
            ) : (
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#00B894', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 10px' }}>
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

        {categories.length > 1 && (
          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)} 
              style={{ 
                padding: '10px', 
                borderRadius: '6px', 
                border: '1px solid #ccc', 
                fontSize: '1rem' 
              }}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: '1.1rem' }}>No products listed by this vendor yet.</p>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '20px' 
          }}>
            {filteredProducts.map((p) => (
              <div key={p._id} style={{ 
                background: 'white', 
                padding: '15px', 
                borderRadius: '10px', 
                boxShadow: '0 2px 6px rgba(0,0,0,0.05)', 
                transition: 'transform 0.2s ease' 
              }}>
                <Link to={`/product/${p._id}`} style={{ textDecoration: 'none', color: '#333' }}>
                  {p.image && (
                    <img 
                      src={p.image} 
                      alt={p.name} 
                      style={{ 
                        width: '100%', 
                        height: '180px', 
                        objectFit: 'cover', 
                        borderRadius: '6px' 
                      }} 
                    />
                  )}
                  <h4 style={{ margin: '10px 0 5px', fontSize: '1rem' }}>{p.name}</h4>
                </Link>
                <p style={{ fontWeight: 'bold', color: '#00B894', marginBottom: '5px' }}>
                  {p.currency} {p.price}
                </p>
                <p style={{ fontSize: '0.85rem', color: '#777' }}>{p.category}</p>
                <div style={{ marginTop: '8px' }}>
                  <Link 
                    to={`/product/${p._id}`} 
                    style={{ 
                      fontSize: '0.9rem', 
                      backgroundColor: '#3498DB', 
                      color: 'white', 
                      padding: '8px 14px', 
                      borderRadius: '6px', 
                      textDecoration: 'none', 
                      fontWeight: 'bold' 
                    }}
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <MerkatoFooter />
    </div>
  );
}

export default VendorStore;