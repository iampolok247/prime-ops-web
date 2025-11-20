import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute() {
  const { user, ready } = useAuth();
  if (!ready) return <div className="p-6 text-royal">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
