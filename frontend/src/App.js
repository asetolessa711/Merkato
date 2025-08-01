import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from './components/Navbar'; // ✅ Keep this active

// Hooks
import useUser from './hooks/useUser';

// Layouts
import PublicLayout from './layouts/PublicLayout';
import CustomerLayout from './layouts/CustomerLayout';
import VendorLayout from './layouts/VendorLayout';
import AdminLayout from './components/AdminLayout';
import AuthLayout from './layouts/AuthLayout';

// Pages & Components
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

import CustomerDashboard from './pages/CustomerDashboard';
import CustomerGuide from './pages/CustomerGuide';
import CustomerOrders from './pages/CustomerOrders';
import CustomerInbox from './pages/CustomerInbox';
import MyAddresses from './pages/MyAddresses';
import DirectChat from './pages/DirectChat';

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

import AdminPromoCodes from './components/admin/AdminPromoCodes';
import PromoManager from './components/admin/PromoManager';
import ReviewModeration from './components/admin/ReviewModeration';

import FeedbackPopup from './components/FeedbackPopup';
import FloatingPromoButton from './components/FloatingPromoButton';
import ProtectedRoute from './components/ProtectedRoute';

const DirectChatWrapper = () => {
  const { userId } = useParams();
  return <DirectChat selectedUser={{ _id: userId }} />;
};

function App() {
  const { user, loading, clearUser } = useUser();
  const [lang, setLang] = useState(() => localStorage.getItem('merkato-lang') || 'en');
  const [currency, setCurrency] = useState('USD');
  const [showFeedback, setShowFeedback] = useState(false);

  const handleLogout = () => {
    clearUser();
    window.location.href = '/';
  };

  const handleLangChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem('merkato-lang', newLang);
  };

  const rates = { USD: 1, ETB: 144, EUR: 0.91 };

  return (
    <BrowserRouter>
      <>
        <Routes>
          {/* Public Pages */}
          <Route path="/" element={
            <PublicLayout user={user} onLogout={handleLogout} lang={lang} onLangChange={handleLangChange} />
          }>
            <Route index element={<HomePage />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="checkout-success" element={<CheckoutSuccess />} />
            <Route path="product/:id" element={<ProductDetail currency={currency} rates={rates} />} />
            <Route path="support" element={<SupportForm />} />
            <Route path="*" element={<h2>404 – Page Not Found</h2>} />
          </Route>

          {/* Authentication */}
          <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
          <Route path="/register" element={<AuthLayout><RegisterPage /></AuthLayout>} />
          <Route path="/forgot-password" element={<AuthLayout><ForgotPasswordPage /></AuthLayout>} />
          <Route path="/reset-password" element={<AuthLayout><ResetPasswordPage /></AuthLayout>} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/upload" element={<ProductUpload />} />
          <Route path="/cart" element={<CartPage />} />

          {/* Customer Area */}
          <Route path="/dashboard" element={<Navigate to="/account" replace />} />
          <Route path="/account" element={
            <ProtectedRoute user={user} loading={loading} requiredRole="customer">
              <CustomerLayout user={user} onLogout={handleLogout} lang={lang} onLangChange={handleLangChange} />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/account/dashboard" replace />} />
            <Route path="dashboard" element={<CustomerDashboard />} />
            <Route path="orders" element={<CustomerOrders />} />
            <Route path="guide" element={<CustomerGuide />} />
            <Route path="inbox" element={<CustomerInbox />} />
            <Route path="chat/:userId" element={<DirectChatWrapper />} />
            <Route path="addresses" element={<MyAddresses />} />
          </Route>

          {/* Vendor Area */}
          <Route path="/vendor" element={
            <ProtectedRoute user={user} loading={loading} requiredRole="vendor">
              <VendorLayout user={user} onLogout={handleLogout} lang={lang} onLangChange={handleLangChange} />
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
          </Route>
          <Route path="/vendor/:id" element={<VendorStore />} />

          {/* Admin Area */}
          <Route path="/admin" element={
            <ProtectedRoute user={user} loading={loading} requiredRole="admin">
              <AdminLayout user={user} />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
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
        </Routes>

        <FeedbackPopup visible={showFeedback} onClose={() => setShowFeedback(false)} lang={lang} />
        <FloatingPromoButton setShowFeedback={setShowFeedback} />
      </>
    </BrowserRouter>
  );
}

export default App;