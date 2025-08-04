import React, { useEffect, useState, useCallback } from 'react';
// === MOCK MODE: Set to true to use mock data (no backend required) ===
const USE_MOCK_CUSTOMER = true; // Set to false for real API
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import styles from './CustomerDashboard.module.css';
import QuickStatCard from '../components/QuickStatCard/QuickStatCard';
import ProductRowSection from '../components/ProductRowSection';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function CustomerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [avatar, setAvatar] = useState('');
  const [preview, setPreview] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const handleError = (err) => {
    console.error('API Error:', err);
    setError(err.response?.data?.message || 'Failed to load profile data');
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  const fetchData = useCallback(async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const endpoints = [
        `${API_BASE_URL}/api/auth/me`,
        `${API_BASE_URL}/api/favorites`,
        `${API_BASE_URL}/api/orders/recent`
      ];

      const [profileRes, favoritesRes, ordersRes] = await Promise.all(
        endpoints.map(endpoint => axios.get(endpoint, { headers }))
      );

      const profile = profileRes.data.user || profileRes.data;
      setUser(profile);
      setAvatar(profile.avatar || '');
      setPreview(profile.avatar || '');
      setFavorites(favoritesRes.data || []);
      setRecentOrders(ordersRes.data || []);
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [headers, navigate, token]);

  useEffect(() => {
    if (USE_MOCK_CUSTOMER) {
      setTimeout(() => {
        setUser({ name: 'Demo Customer', email: 'customer@demo.com', lastLogin: new Date(), createdAt: new Date(), credits: 100, points: 50 });
        setFavorites([
          { _id: 'f1', name: 'Favorite Product 1', image: 'https://placehold.co/100x100?text=Fav+1', price: 25, currency: '$', stock: 3 },
          { _id: 'f2', name: 'Favorite Product 2', image: 'https://placehold.co/100x100?text=Fav+2', price: 40, currency: '$', stock: 7 },
        ]);
        setRecentOrders([
          { _id: 'o1', orderNumber: '1001', status: 'Delivered', total: 120, currency: '$' },
          { _id: 'o2', orderNumber: '1002', status: 'Shipped', total: 80, currency: '$' },
        ]);
        setIsLoading(false);
      }, 400);
      return;
    }
    fetchData();
  }, [fetchData]);

  // Add tab focus refresh
  useEffect(() => {
    const handleFocus = () => {
      fetchData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchData]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatar(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!avatar) return;

    try {
      const formData = new FormData();
      formData.append('file', avatar);
      formData.append('upload_preset', process.env.REACT_APP_CLOUDINARY_PRESET);

      const uploadRes = await axios.post(
        `https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_NAME}/image/upload`,
        formData
      );

      const imageUrl = uploadRes.data.secure_url;
      await axios.put(`${API_BASE_URL}/api/customer/profile`, 
        { avatar: imageUrl }, 
        { headers }
      );

      await fetchData();
      setError('');
    } catch (err) {
      setError('Failed to upload avatar. Please try again.');
      console.error('Upload Error:', err);
    }
  };

  const quickStats = [
    {
      icon: '📦',
      label: 'Active Orders',
      value: user?.activeOrders || '0',
      onClick: () => navigate('/account/orders')
    },
    {
      icon: '❤️',
      label: 'Wishlist',
      value: favorites.length || '0',
      onClick: () => navigate('/favorites')
    },
    {
      icon: '💰',
      label: 'Credits',
      value: `$${user?.credits || '0'}`,
      onClick: () => navigate('/account/wallet')
    },
    {
      icon: '🎯',
      label: 'Points',
      value: user?.points || '0',
      onClick: () => navigate('/account/rewards')
    }
  ];

  return (
    <>
      {isLoading ? (
        <div className={styles.loadingState}>
          <div className={styles.skeletonHeader}></div>
          <div className={styles.skeletonStats}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonIcon}></div>
                <div className={styles.skeletonText}></div>
                <div className={styles.skeletonValue}></div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className={styles.error}>
          <h2>⚠️ {error}</h2>
          <button onClick={fetchData} className={styles.retryButton}>
            🔄 Retry
          </button>
        </div>
      ) : (
        <>
          <header className={styles.welcomeHeader}>
            <h2 className={styles.welcomeTitle}>
              👋 Welcome back, {user?.name || 'Valued Customer'}
            </h2>
            <p className={styles.lastLogin}>
              Last login: {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'First time here'}
            </p>
          </header>
          <div className={styles.statsGrid}>
            {quickStats.map((stat, index) => (
              <QuickStatCard key={index} {...stat} />
            ))}
          </div>
          <section className={styles.accountSection}>
            <h2 className={styles.sectionTitle}>My Account</h2>
            <div className={styles.cardGrid}>
              <div className={styles.card}>
                <h3>Profile Info</h3>
                <div className={styles.profileContent}>
                  <div className={styles.avatarSection}>
                    <img
                      src={preview || '/default-avatar.png'}
                      alt="Profile"
                      className={styles.avatar}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className={styles.fileInput}
                      aria-label="Choose profile picture"
                    />
                    <button
                      onClick={handleUpload}
                      disabled={!avatar}
                      className={styles.uploadButton}
                    >
                      Upload Avatar
                    </button>
                  </div>
                  <div className={styles.profileDetails}>
                    <p><strong>Name:</strong> {user?.name}</p>
                    <p><strong>Email:</strong> {user?.email}</p>
                    <p><strong>Member Since:</strong> {new Date(user?.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
            {/* Horizontally scrollable product rows for favorites and recent orders */}
            <div style={{ margin: '32px 0 0 0' }}>
              <ProductRowSection
                title="Saved Products"
                products={favorites}
                emptyText="No saved products yet"
                type="standard"
                size="md"
              />
              <ProductRowSection
                title="Recent Orders"
                products={recentOrders.map(order => ({
                  ...order,
                  _id: order._id,
                  name: `Order #${order.orderNumber}`,
                  image: '/images/default-product.png',
                  price: order.total,
                  currency: order.currency || '$',
                  stock: '',
                  description: `Status: ${order.status}`
                }))}
                emptyText="No recent orders"
                type="standard"
                size="md"
              />
            </div>
          </section>
        </>
      )}
    </>
  );
}

CustomerDashboard.propTypes = {
  initialData: PropTypes.shape({
    user: PropTypes.object,
    favorites: PropTypes.array,
    orders: PropTypes.array
  })
};

export default CustomerDashboard;