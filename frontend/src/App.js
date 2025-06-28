import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, Outlet } from 'react-router-dom';
import axios from 'axios';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import CustomerLayout from './layouts/CustomerLayout';
import VendorLayout from './layouts/VendorLayout';
import AdminLayout from './components/AdminLayout';
import AuthLayout from './layouts/AuthLayout';

// Public Pages
import HomePage from './pages/HomePage';
import ShopPage from './pages/ShopPage';
import FavoritesPage from './pages/FavoritesPage';
import CheckoutSuccess from './pages/CheckoutSuccess';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductUpload from './pages/ProductUpload';
import EditProfile from './pages/EditProfile';
import CartPage from './pages/CartPage';
import SupportForm from './pages/SupportForm';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Customer Pages
import CustomerDashboard from './pages/CustomerDashboard';
import CustomerGuide from './pages/CustomerGuide';
import CustomerOrders from './pages/CustomerOrders';
import CustomerInbox from './pages/CustomerInbox';
import MyAddresses from './pages/MyAddresses';
import DirectChat from './pages/DirectChat';

// Vendor Pages
import VendorDashboard from './pages/VendorDashboard';
import VendorOnboarding from './pages/VendorOnboarding';
import VendorOrders from './pages/VendorOrders';
import VendorGuide from './pages/VendorGuide';
import VendorStore from './pages/VendorStore';
import VendorAnalytics from './pages/VendorAnalytics';
import VendorInvoices from './pages/VendorInvoices';
import VendorMarketing from './pages/VendorMarketing';
import VendorInbox from './pages/VendorInbox';
import VendorQuestions from './pages/VendorQuestions';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminDeliveryOptions from './pages/AdminDeliveryOptions';
import AdminExpenseManager from './pages/AdminExpenseManager';
import AdminSupportInbox from './pages/AdminSupportInbox';
import AdminFeedbackInbox from './pages/AdminFeedbackInbox';
import AdminOrders from './pages/AdminOrders';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminFlagManager from './pages/AdminFlagManager';
import AdminDiscountManager from './pages/AdminDiscountManager';
import VendorManagement from './pages/VendorManagement';
import InvoiceReport from './pages/InvoiceReport';

// Admin Components
import AdminPromoCodes from './components/admin/AdminPromoCodes';
import PromoManager from './components/admin/PromoManager';
import ReviewModeration from './components/admin/ReviewModeration';

// UI Components
import FeedbackPopup from './components/FeedbackPopup';
import FloatingPromoButton from './components/FloatingPromoButton';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ProtectedRoute = ({ user, children, requiredRole }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) return setLoading(false);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.valid) {
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth verification failed:', err);
        localStorage.removeItem('token');
        setLoading(false);
      }
    };
    verifyAuth();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />;
  return children;
};

const DirectChatWrapper = () => {
  const { userId } = useParams();
  return <DirectChat selectedUser={{ _id: userId }} />;
};

function App() {
  const [lang, setLang] = useState(() => localStorage.getItem('merkato-lang') || 'en');
  const [currency, setCurrency] = useState('USD');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFeedback, setShowFeedback] = useState(false);
  const rates = { USD: 1, ETB: 144, EUR: 0.91 };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => {
        const userData = res.data.user || res.data;
        setUser(userData);
      })
      .catch(err => {
        console.error('Auth error:', err);
        localStorage.removeItem('token');
        setUser(null);
      })
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setTimeout(() => window.location.href = '/', 100);
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route path="/" element={<PublicLayout user={user} onLogout={handleLogout} lang={lang}><HomePage /></PublicLayout>} />
        <Route path="/shop" element={<PublicLayout user={user} onLogout={handleLogout} lang={lang}><ShopPage /></PublicLayout>} />
        <Route path="/favorites" element={<PublicLayout user={user} onLogout={handleLogout} lang={lang}><FavoritesPage /></PublicLayout>} />
        <Route path="/checkout-success" element={<CheckoutSuccess />} />
        <Route path="/product/:id" element={<ProductDetail currency={currency} rates={rates} />} />

        {/* Auth */}
        <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
        <Route path="/register" element={<AuthLayout><RegisterPage /></AuthLayout>} />
        <Route path="/forgot-password" element={<AuthLayout><ForgotPasswordPage /></AuthLayout>} />
        <Route path="/reset-password" element={<AuthLayout><ResetPasswordPage /></AuthLayout>} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/upload" element={<ProductUpload />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/support" element={<SupportForm />} />

        {/* Customer */}
        <Route path="/dashboard" element={<Navigate to="/account" replace />} />
        <Route path="/account" element={
          <ProtectedRoute user={user} requiredRole="customer">
            <CustomerLayout user={user} onLogout={handleLogout} lang={lang} />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/account/dashboard" replace />} />
          <Route path="dashboard" element={<CustomerDashboard />} />
          <Route path="orders" element={<CustomerOrders />} />
          <Route path="guide" element={<CustomerGuide />} />
          <Route path="inbox" element={<CustomerInbox />} />
          <Route path="chat/:userId" element={<DirectChatWrapper />} />
          <Route path="addresses" element={<MyAddresses />} />
          <Route path="*" element={<Navigate to="/account/dashboard" replace />} />
        </Route>

        {/* Vendor */}
        <Route path="/vendor" element={
          <ProtectedRoute user={user} requiredRole="vendor">
            <VendorLayout user={user} onLogout={handleLogout} lang={lang} />
          </ProtectedRoute>
        }>
          <Route index element={<VendorDashboard />} />
          <Route path="onboarding" element={<VendorOnboarding />} />
          <Route path="orders" element={<VendorOrders />} />
          <Route path="guide" element={<VendorGuide />} />
          <Route path="analytics" element={<VendorAnalytics />} />
          <Route path="invoices" element={<VendorInvoices />} />
          <Route path="marketing" element={<VendorMarketing />} />
          <Route path="chat/:userId" element={<DirectChatWrapper />} />
          <Route path="inbox" element={<VendorInbox />} />
          <Route path="questions" element={<VendorQuestions />} />
          <Route path="*" element={<Navigate to="/vendor" replace />} />
        </Route>
        <Route path="/vendor/:id" element={<VendorStore />} />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute user={user} requiredRole="admin">
            <AdminLayout><Outlet /></AdminLayout>
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="promo-codes" element={<AdminPromoCodes />} />
          <Route path="promo-manager" element={<PromoManager />} />
          <Route path="vendors" element={<VendorManagement />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="expenses" element={<AdminExpenseManager />} />
          <Route path="feedback" element={<AdminFeedbackInbox />} />
          <Route path="support" element={<AdminSupportInbox />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="flags" element={<AdminFlagManager />} />
          <Route path="discount" element={<AdminDiscountManager />} />
          <Route path="review-moderation" element={<ReviewModeration />} />
          <Route path="delivery-options" element={<AdminDeliveryOptions />} />
          <Route path="invoices/report" element={<InvoiceReport />} />
        </Route>

        {/* 404 Fallback */}
        <Route path="*" element={
          <PublicLayout user={user} onLogout={handleLogout} lang={lang}>
            <h2>404 – Page Not Found</h2>
          </PublicLayout>
        } />
      </Routes>

      <FeedbackPopup visible={showFeedback} onClose={() => setShowFeedback(false)} lang={lang} />
      <FloatingPromoButton setShowFeedback={setShowFeedback} />
    </BrowserRouter>
  );
}

export default App;
