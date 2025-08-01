import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import PropTypes from 'prop-types';
import styles from './CustomerDashboard.module.css';
import QuickStatCard from '../components/QuickStatCard/QuickStatCard';

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

  if (isLoading) {
    return (
      <div className={styles.container}>
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
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>⚠️ {error}</h2>
          <button onClick={fetchData} className={styles.retryButton}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
  <div className={styles.container}>
    <header className={styles.welcomeHeader}>
      <h2>Customer Dashboard</h2> {/* <-- Add this line */}
      <h1 className={styles.welcomeTitle}>
        👋 Welcome back, {user?.name || 'Valued Customer'}
      </h1>
      <p className={styles.lastLogin}>
        Last login: {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'First time here'}
      </p>
    </header>
    {/* ...rest of the code... */}

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

          <div className={styles.card}>
            <h3>Saved Products</h3>
            {favorites.length === 0 ? (
              <p className={styles.emptyState}>No saved products yet</p>
            ) : (
              <ul className={styles.productList}>
                {favorites.slice(0, 3).map((product) => (
                  <li key={product._id} className={styles.productItem}>
                    <img
                      src={product.image}
                      alt={product.name}
                      className={styles.productImage}
                    />
                    <div className={styles.productInfo}>
                      <h4>{product.name}</h4>
                      <p>{product.currency} {product.price}</p>
                      <p>Stock: {product.stock}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {favorites.length > 3 && (
              <Link to="/favorites" className={styles.viewAllButton}>
                View All Saved Products
              </Link>
            )}
          </div>

          <div className={styles.card}>
            <h3>Recent Orders</h3>
            {recentOrders.length === 0 ? (
              <p className={styles.emptyState}>No recent orders</p>
            ) : (
              <ul className={styles.orderList}>
                {recentOrders.slice(0, 3).map((order) => (
                  <li key={order._id} className={styles.orderItem}>
                    <div className={styles.orderInfo}>
                      <h4>Order #{order.orderNumber}</h4>
                      <p>Status: {order.status}</p>
                      <p>Total: {order.currency} {order.total}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/account/orders" className={styles.viewAllButton}>
              📦 View All Orders
            </Link>
          </div>
        </div>
      </section>
    </div>
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