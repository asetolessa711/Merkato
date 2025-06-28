// File: src/pages/BuyerHome.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const BuyerHome = () => {
  const [wishlist, setWishlist] = useState([]);
  const [featuredDeals, setFeaturedDeals] = useState([]);
  const [hotDeals, setHotDeals] = useState([]);
  const [userName, setUserName] = useState('');
  const [firstTimeDiscount, setFirstTimeDiscount] = useState(false);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [wishlistRes, featuredRes, hotRes, discountRes] = await Promise.all([
          axios.get('/api/favorites', { headers }),
          axios.get('/api/products/featured', { headers }),
          axios.get('/api/products/hot-deals', { headers }),
          axios.get('/api/admin/first-time-discount', { headers }) // Admin controlled toggle
        ]);

        const storedUser = JSON.parse(localStorage.getItem('user'));
        setUserName(storedUser?.name || 'Shopper');
        setWishlist(wishlistRes.data);
        setFeaturedDeals(featuredRes.data);
        setHotDeals(hotRes.data);
        setFirstTimeDiscount(discountRes.data.active);
      } catch (err) {
        console.error('Failed to fetch buyer home data');
      }
    };

    fetchData();
  }, [token]);

  if (!token) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Welcome to Merkato! 🛍️</h2>
        <p className="mb-6">Create an account to save your wish list, get personalized deals, and enjoy seamless shopping!</p>
        <div className="flex justify-center gap-4">
          <Link to="/register" className="bg-blue-500 text-white px-6 py-3 rounded font-semibold hover:bg-blue-600">Register</Link>
          <Link to="/login" className="bg-gray-500 text-white px-6 py-3 rounded font-semibold hover:bg-gray-600">Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Welcome back, {userName} 👋</h2>

      {firstTimeDiscount && (
        <div className="bg-green-100 text-green-700 p-4 mb-6 rounded shadow">
          🎁 Congratulations! As a new buyer, you get a 10% discount on your first order!
        </div>
      )}

      {/* Featured Deals */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-2">🎯 Featured Deals for You</h3>
        <div className="flex overflow-x-scroll space-x-4">
          {featuredDeals.map(product => (
            <Link key={product._id} to={`/product/${product._id}`} className="min-w-[180px] bg-white p-2 rounded shadow-md">
              <img src={product.image} alt={product.name} className="h-32 object-cover w-full rounded" />
              <h4 className="font-semibold mt-2 text-center">{product.name}</h4>
              <p className="text-center text-green-600 font-bold">${product.price}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Shop by Category */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-2">🛒 Shop by Category</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/shop?category=electronics" className="bg-blue-100 p-4 rounded text-center font-bold">Electronics</Link>
          <Link to="/shop?category=fashion" className="bg-pink-100 p-4 rounded text-center font-bold">Fashion</Link>
          <Link to="/shop?category=home" className="bg-yellow-100 p-4 rounded text-center font-bold">Home</Link>
          <Link to="/shop?category=beauty" className="bg-purple-100 p-4 rounded text-center font-bold">Beauty</Link>
        </div>
      </section>

      {/* Wishlist */}
      {wishlist.length > 0 && (
        <section className="mb-8">
          <h3 className="text-xl font-semibold mb-2">❤️ Your Wishlist</h3>
          <div className="flex overflow-x-scroll space-x-4">
            {wishlist.slice(0, 3).map(item => (
              <Link key={item._id} to={`/product/${item._id}`} className="min-w-[180px] bg-white p-2 rounded shadow-md">
                <img src={item.image} alt={item.name} className="h-32 object-cover w-full rounded" />
                <h4 className="font-semibold mt-2 text-center">{item.name}</h4>
                <p className="text-center text-green-600 font-bold">${item.price}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Hot Deals */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-2">🔥 Today's Hot Deals</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {hotDeals.map(product => (
            <Link key={product._id} to={`/product/${product._id}`} className="bg-white p-4 rounded shadow-md">
              <img src={product.image} alt={product.name} className="h-32 object-cover w-full rounded" />
              <h4 className="font-semibold mt-2 text-center">{product.name}</h4>
              <p className="text-center text-red-500 font-bold">${product.price}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Orders Shortcut */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-2">📦 Track Your Orders</h3>
        <Link to="/account/orders" className="block text-center bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded">
          View Your Orders
        </Link>
      </section>
    </div>
  );
};

export default BuyerHome;
