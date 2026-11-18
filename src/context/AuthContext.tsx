import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, getStoredToken, setStoredToken } from '../lib/api';
import { AuthUser } from '../types/erp';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const data = await apiFetch<{ user: AuthUser }>('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
      setStoredToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getStoredToken()) {
      refreshUser();
    } else {
      // Also attempt cookie-based session check once
      refreshUser();
    }
  }, [refreshUser]);

  const login = async (email: string, password: string, rememberMe: boolean) => {
    const data = await apiFetch<{ user: AuthUser; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, rememberMe }),
    });
    setStoredToken(data.token, rememberMe);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore network errors on logout
    }
    setStoredToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
