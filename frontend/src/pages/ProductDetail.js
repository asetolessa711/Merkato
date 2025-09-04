import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';

function ProductDetail({ currency = 'USD', rates = { USD: 1, ETB: 144, EUR: 0.91 } }) {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: '', comment: '' });
  const [orderForm, setOrderForm] = useState({ quantity: 1, paymentMethod: 'cod', shippingAddress: '' });
  const [msg, setMsg] = useState('');
  const [recent, setRecent] = useState([]);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pRes = await axios.get('/api/products');
        const prod = pRes.data.find(p => p._id === id);
        setProduct(prod);
        const rRes = await axios.get(`/api/reviews/${id}`);
        setReviews(rRes.data);

        const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
        const updated = [id, ...viewed.filter(pid => pid !== id)].slice(0, 8);
        localStorage.setItem('recentlyViewed', JSON.stringify(updated));
        const matches = pRes.data.filter(p => updated.includes(p._id) && p._id !== id);
        setRecent(matches);
      } catch (err) {
        console.error('Failed to load product or reviews');
      }
    };
    fetchData();
  }, [id]);

const getDisplayPrice = (p) => {
  const productCurrency = p.currency || 'USD';
  if (productCurrency === currency) return `${currency} ${p.price.toFixed(2)}`;
  const baseToUSD = 1 / (rates[productCurrency] || 1);
  const converted = p.price * baseToUSD * (rates[currency] || 1);
  return `${currency} ${converted.toFixed(2)}`;
};

const handleAddToCart = () => {
  const stored = localStorage.getItem('merkato-cart');
  const parsed = stored ? JSON.parse(stored) : { items: [], timestamp: 0 };
  const cart = parsed.items || [];

  const existing = cart.findIndex(item => item._id === product._id);
  if (existing !== -1) {
    cart[existing].quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  const now = Date.now();
  localStorage.setItem('merkato-cart', JSON.stringify({
    items: cart,
    timestamp: now
  }));
  // Mirror legacy key and update TTL metadata
  localStorage.setItem('cart', JSON.stringify(cart));
  const token = localStorage.getItem('token') || localStorage.getItem('merkato-token');
  const isAuthed = Boolean(token);
  localStorage.setItem('merkato-cart-ttl', JSON.stringify({ ts: now, maxAge: isAuthed ? 90 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 }));

  alert('🛒 Product added to cart!');
};

const submitReview = async (e) => {
  e.preventDefault();
  if (!token) return setMsg('Please log in to review.');
  try {
    await axios.post(`/api/reviews/${id}`, reviewForm, { headers });
    setMsg('Review submitted!');
    setReviewForm({ rating: '', comment: '' });
    const rRes = await axios.get(`/api/reviews/${id}`);
    setReviews(rRes.data);
  } catch (err) {
    setMsg('Failed to submit. You may have already reviewed.');
  }
};

  const submitOrder = async (e) => {
    e.preventDefault();
    if (!token) return setMsg('Please log in to place an order.');
    const selected = orderForm.paymentMethod;
    try {
      if (selected === 'stripe') {
        setMsg('Redirecting to Stripe...');
        const res = await axios.post('/api/stripe/create-checkout-session', {
          productId: product._id,
          quantity: orderForm.quantity
        }, { headers });
        return window.location.href = res.data.url;
      }
      if (selected === 'telebirr') {
        setMsg('Redirecting to Telebirr...');
        const res = await axios.post('/api/telebirr/pay', {
          productId: product._id,
          quantity: orderForm.quantity
        }, { headers });
        return window.location.href = res.data.url;
      }
      if (selected === 'chapa') {
        setMsg('Chapa integration coming soon...');
        return;
      }
      const total = product.price * orderForm.quantity;
      const order = {
        products: [{ product: product._id, quantity: orderForm.quantity }],
        total,
        currency: product.currency || 'USD',
        paymentMethod: selected,
        shippingAddress: orderForm.shippingAddress
      };
      await axios.post('/api/orders', order, { headers });
      setMsg('Order placed successfully!');
      setOrderForm({ quantity: 1, paymentMethod: 'cod', shippingAddress: '' });
      navigate('/checkout-success');
    } catch (err) {
      setMsg('Failed to place order.');
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto', fontFamily: 'Poppins, sans-serif' }}>
      {!product ? <p>Loading...</p> : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 30 }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            {product.image && (
              <img src={product.image} alt={product.name} style={{ width: '100%', borderRadius: 10, objectFit: 'cover', maxHeight: 400 }} />
            )}
            <p><strong>Category:</strong> {product.category}</p>
            <p><strong>Stock:</strong> {product.stock}</p>
            <p><strong>Language:</strong> {product.language?.toUpperCase()}</p>
          </div>

          <div style={{ flex: 1, minWidth: 300 }}>
            <h2>{product.name}</h2>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00B894' }}>{getDisplayPrice(product)}</p>

            <button data-testid="add-to-cart-btn" onClick={handleAddToCart} style={{ marginBottom: 20, backgroundColor: '#00B894', color: 'white', padding: 10, border: 'none', borderRadius: 6 }}>
              🛒 Add to Cart
            </button>

            <div style={{ padding: 15, background: '#f8f8f8', borderRadius: 8 }}>
              <h4>Buy Now</h4>
              <form onSubmit={submitOrder}>
                <label>Quantity</label>
                <input
                  type="number"
                  min="1"
                  max={product.stock}
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                  required
                  style={{ width: '100%', marginBottom: 10 }}
                />

                <label>Shipping Address</label>
                <textarea
                  rows={3}
                  value={orderForm.shippingAddress}
                  onChange={(e) => setOrderForm({ ...orderForm, shippingAddress: e.target.value })}
                  required
                  style={{ width: '100%', marginBottom: 10 }}
                />

                <label>Payment Method</label>
                <select
                  value={orderForm.paymentMethod}
                  onChange={(e) => setOrderForm({ ...orderForm, paymentMethod: e.target.value })}
                  style={{ width: '100%', marginBottom: 10 }}
                >
                  <option value="cod">Cash on Delivery</option>
                  <option value="stripe">Pay with Card (Stripe)</option>
                  <option value="telebirr">Pay with Telebirr</option>
                  <option value="chapa">Pay with Chapa</option>
                </select>

                <button type="submit" style={{ width: '100%', backgroundColor: '#0984e3', color: 'white', padding: 10, border: 'none', borderRadius: 6 }}>
                  Place Order
                </button>
              </form>
              {msg && <p style={{ marginTop: 10 }}>{msg}</p>}
            </div>
          </div>
        </div>
      )}

      {/* You May Like */}
      {recent.length > 0 && (
        <section style={{ marginTop: 50 }}>
          <h3>You May Like</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
            {recent.map(p => (
              <div key={p._id} style={{ background: '#fff', padding: 12, borderRadius: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <Link to={`/product/${p._id}`} style={{ textDecoration: 'none', color: '#333' }}>
                  {p.image && <img src={p.image} alt={p.name} style={{ height: 120, width: '100%', objectFit: 'cover', borderRadius: 6 }} />}
                  <h5 style={{ marginTop: 8 }}>{p.name}</h5>
                  <p style={{ fontWeight: 'bold', color: '#00B894' }}>{p.currency} {p.price}</p>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <hr style={{ margin: '40px 0' }} />

      <h3>Customer Reviews</h3>
      {reviews.length === 0 ? (
        <p>No reviews yet.</p>
      ) : (
        reviews.map((r) => (
          <div key={r._id} style={{ marginBottom: 10, padding: 10, background: '#f9f9f9', borderRadius: 6 }}>
            <strong>{r.user?.name || 'Anonymous'}:</strong><br />
            {'★'.repeat(r.rating)} ({r.rating}/5)
            <p>{r.comment}</p>
          </div>
        ))
      )}

      <h4>Write a Review</h4>
      <form onSubmit={submitReview}>
        <label>Rating (1–5)</label>
        <input
          type="number"
          name="rating"
          min="1"
          max="5"
          value={reviewForm.rating}
          onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })}
          required
        />

        <label>Comment</label>
        <textarea
          name="comment"
          value={reviewForm.comment}
          onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
          required
          rows={3}
        />

        <button type="submit">Submit Review</button>
      </form>
    </div>
  );
}

export default ProductDetail;
