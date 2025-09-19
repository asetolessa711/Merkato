// @trust-ui security gating
import React from 'react';
import ProtectedRoute from '../ProtectedRoute';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

export default {
  title: 'Auth/ProtectedRoute',
  component: ProtectedRoute,
  parameters: { tags: ['@trust-ui', '@visual'] }
};

const Template = ({ user, requiredRole, loading }) => {
  const safeUser = user && user.roles ? user : (user ? { ...user, roles: user.roles || [] } : user);
  try { localStorage.setItem('user', JSON.stringify(safeUser)); localStorage.setItem('token', 't'); } catch(_) {}
  return (
    <MemoryRouter initialEntries={[ '/secure' ]}>
      <Routes>
        <Route path="/login" element={<div data-testid="login-redirect">Login Redirect</div>} />
        <Route path="/secure" element={<ProtectedRoute requiredRole={requiredRole} user={user} loading={loading}><div data-testid="secure-content">Secure Content</div></ProtectedRoute>} />
        <Route path="/vendor" element={<div data-testid="vendor-fallback">Vendor Fallback</div>} />
        <Route path="/admin/dashboard" element={<div data-testid="admin-fallback">Admin Fallback</div>} />
        <Route path="/account/dashboard" element={<div data-testid="customer-fallback">Customer Fallback</div>} />
      </Routes>
    </MemoryRouter>
  );
};

export const CustomerAllowed = () => <Template user={{ roles:['customer'] }} requiredRole="customer" />;
CustomerAllowed.storyName = 'Customer Allowed';
CustomerAllowed.parameters = { skipGlobalRouter: true };

export const VendorBlocked = () => <Template user={{ roles:['vendor'] }} requiredRole="customer" />;
VendorBlocked.parameters = { tags: ['@trust-ui', '@visual'], skipGlobalRouter: true };
VendorBlocked.storyName = 'Vendor Blocked -> Redirect';
