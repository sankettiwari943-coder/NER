/**
 * Supabase Role-Based Authentication Context & Provider (SIH-26001 Aligned)
 * Strict Security Gate:
 * - Admin Role & Access restricted exclusively to: sankettiwari943@gmail.com
 * - Default State on initial load: user = null, isAdmin = false
 * - Default Role for all other users: 'citizen'
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabase, SupabaseUser, ADMIN_EMAIL } from '../lib/supabase';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUserToUser(sbUser: SupabaseUser | null): User | null {
  if (!sbUser || !sbUser.email) return null;
  const isAdm = sbUser.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();
  return {
    id: sbUser.id,
    email: sbUser.email,
    full_name: sbUser.full_name || (isAdm ? 'Sanket Tiwari (NDMA Authority)' : 'Citizen Field Scout'),
    role: isAdm ? 'ADMIN' : 'USER',
    organization: sbUser.organization || (isAdm ? 'National Disaster Management Authority (NDMA)' : 'Citizen Field Network'),
    phone: sbUser.phone,
    created_at: sbUser.created_at,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default state on first load must be strictly null / unauthenticated
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'citizen' | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const applyUserState = (u: User | null) => {
    if (u && u.email) {
      const isAdm = u.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim() && u.role === 'ADMIN';
      setUser(u);
      setRole(isAdm ? 'admin' : 'citizen');
      setIsAdmin(isAdm);
    } else {
      setUser(null);
      setRole(null);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    // Purge legacy mock keys from localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('ner_mock_user');
        localStorage.removeItem('demo_user');
        localStorage.removeItem('mock_admin_user');
        localStorage.removeItem('sb_mock_session');
      } catch {}
    }

    // 1. Check existing real persisted session
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user || null;
      if (sessionUser && sessionUser.email) {
        const u = mapSupabaseUserToUser(sessionUser);
        applyUserState(u);
        if (data.session?.access_token) {
          api.setToken(data.session.access_token);
        }
      } else {
        applyUserState(null);
        api.setToken(null);
      }
      setLoading(false);
    });

    // 2. Auth State Change Listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      const sessionUser = session?.user || null;
      if (sessionUser && sessionUser.email) {
        const u = mapSupabaseUserToUser(sessionUser);
        applyUserState(u);
        if (session?.access_token) {
          api.setToken(session.access_token);
        }
      } else {
        applyUserState(null);
        api.setToken(null);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await supabase.auth.signInWithPassword({ email, password: pass });
      if (res.error) {
        throw res.error;
      }
      const mapped = mapSupabaseUserToUser(res.data.user);
      applyUserState(mapped);
      if (res.data.session?.access_token) {
        api.setToken(res.data.session.access_token);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (payload: any) => {
    setError(null);
    setLoading(true);
    try {
      const res = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: {
            full_name: payload.full_name,
            role: payload.role || 'citizen',
            organization: payload.organization,
            phone: payload.phone,
          },
        },
      });
      if (res.error) {
        throw res.error;
      }
      const mapped = mapSupabaseUserToUser(res.data.user);
      applyUserState(mapped);
      if (res.data.session?.access_token) {
        api.setToken(res.data.session.access_token);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      api.setToken(null);
      applyUserState(null);
    } catch (err) {
      console.warn('Logout error:', err);
      applyUserState(null);
      api.setToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        loading,
        error,
        isAdmin,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
