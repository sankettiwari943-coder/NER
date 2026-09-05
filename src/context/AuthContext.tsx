/**
 * Supabase Role-Based Authentication Context & Provider (SIH-26001 Aligned)
 * Backed by Supabase with persistent localStorage session and full offline mock fallback.
 * Roles:
 * - 'admin' (NDMA/DDMA Official): Full command, CAP alert broadcasting, Human Verification Gate
 * - 'user' (Citizen / Field Officer): Hazard reporting, personal submissions history, alert monitoring
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { supabaseAuth, SupabaseUser, UserRole } from '../lib/supabase';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
  fastLogin: (role: 'admin' | 'user' | 'ADMIN' | 'USER') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUserToUser(sbUser: SupabaseUser | null): User | null {
  if (!sbUser) return null;
  const rawRole = sbUser.role || 'user';
  const isAdm = rawRole.toLowerCase() === 'admin';
  return {
    id: sbUser.id,
    email: sbUser.email,
    full_name: sbUser.full_name,
    role: isAdm ? 'ADMIN' : 'USER',
    organization: sbUser.organization || (isAdm ? 'DDMA / NDMA' : 'Citizen Field Network'),
    created_at: sbUser.created_at,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const session = supabaseAuth.getSession();
    return mapSupabaseUserToUser(session?.user || null);
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen to Supabase / Auth changes
    const unsubscribe = supabaseAuth.onAuthStateChange((session) => {
      const mapped = mapSupabaseUserToUser(session?.user || null);
      setUser(mapped);
      if (session?.access_token) {
        api.setToken(session.access_token);
      } else {
        api.setToken(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string) => {
    setError(null);
    setLoading(true);
    try {
      const session = await supabaseAuth.signInWithPassword(email, pass);
      const mapped = mapSupabaseUserToUser(session.user);
      setUser(mapped);
      api.setToken(session.access_token);
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
      const session = await supabaseAuth.signUp(payload);
      const mapped = mapSupabaseUserToUser(session.user);
      setUser(mapped);
      api.setToken(session.access_token);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabaseAuth.signOut();
      api.setToken(null);
      setUser(null);
    } catch (err) {
      console.warn('Logout error:', err);
      setUser(null);
      api.setToken(null);
    }
  };

  const fastLogin = async (role: 'admin' | 'user' | 'ADMIN' | 'USER') => {
    setError(null);
    setLoading(true);
    try {
      const normalizedRole = role.toLowerCase() === 'admin' ? 'admin' : 'user';
      const session = await supabaseAuth.signInAsRole(normalizedRole);
      const mapped = mapSupabaseUserToUser(session.user);
      setUser(mapped);
      api.setToken(session.access_token);
    } catch (err: any) {
      setError(err.message || 'Fast login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN' || (user as any)?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAdmin,
        login,
        signup,
        logout,
        fastLogin,
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
