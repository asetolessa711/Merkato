
import React from 'react';
import { Navigate } from 'react-router-dom';
import useUser from '../hooks/useUser';

const ProtectedRoute = ({ requiredRole, children }) => {
  const { user, loading } = useUser();

  if (loading) return <div>Loading...</div>;

  const roles = user?.roles || [];

  if (!user || (requiredRole && !roles.includes(requiredRole))) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
