import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [assignedBatches, setAssignedBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check existing session on mount
  useEffect(() => {
    async function initAuth() {
      const token = localStorage.getItem('apex_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await api.getMe();
        if (res.success && res.data) {
          setUser(res.data.user);
          setAssignedBatches(res.data.assignedBatches || []);
        } else {
          setToken(null);
        }
      } catch (err) {
        console.warn('Session restoration failed:', err.message);
        setToken(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.login(email, password);
    if (res.success && res.data) {
      setToken(res.data.token);
      setUser(res.data.user);

      // Fetch batch assignment if teacher
      if (res.data.user.role === 'TEACHER') {
        try {
          const profile = await api.getMe();
          setAssignedBatches(profile.data.assignedBatches || []);
        } catch {
          // ignore
        }
      }

      return res.data.user;
    }
    throw new Error(res.error || 'Login failed');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAssignedBatches([]);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';

  return (
    <AuthContext.Provider
      value={{
        user,
        assignedBatches,
        loading,
        login,
        logout,
        isAdmin,
        isTeacher
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
