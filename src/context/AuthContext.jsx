// web/src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  // On app load, try to restore session
  useEffect(() => {
    let mounted = true;
    api.me()
      .then((data) => {
        if (!mounted) return;
        setUser(data?.user || null);
        setReady(true);
      })
      .catch(() => {
        if (!mounted) return;
        setReady(true);
      });
    return () => { mounted = false; };
  }, []);

  const login = async (email, password) => {
    const data = await api.login(email, password); // throws on error
    if (!data?.user) throw new Error('Invalid login response (no user)');
    // Store token in localStorage for cross-origin auth
    if (data.token) {
      localStorage.setItem('auth_token', data.token);
    }
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore logout errors
    }
    // Clear token from localStorage
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  const updateMe = async (payload) => {
    const data = await api.updateMe(payload);
    if (!data?.user) throw new Error('Invalid update response (no user)');
    setUser(data.user);
    return data.user;
  };

  return (
    <AuthCtx.Provider value={{ user, ready, login, logout, updateMe }}>
      {children}
    </AuthCtx.Provider>
  );
}
