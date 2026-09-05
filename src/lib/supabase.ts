/**
 * Supabase Client & Authentication Layer (SIH-26001 Aligned)
 * Environment: Vite + React + TypeScript + Tailwind CSS
 * Standard Supabase client interface backed by Supabase REST API with zero-install offline fallback.
 *
 * Target Credentials:
 * - Supabase URL: https://jizqmqwxnynijwnmmklk.supabase.co
 * - Supabase Anon Key: sb_publishable_6Njl6Lvmxyq2n7XTTN6Z5w_vi4B-iza
 * - Admin Email: sankettiwari943@gmail.com (Role: 'admin')
 * - Default User Role: 'citizen'
 */

export type UserRole = 'admin' | 'citizen' | 'ADMIN' | 'USER';

export interface SupabaseUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'citizen';
  organization?: string;
  phone?: string;
  created_at: string;
}

export interface SupabaseSession {
  user: SupabaseUser;
  access_token: string;
  expires_at: number;
}

export interface AuthResponse {
  data: {
    user: SupabaseUser | null;
    session: SupabaseSession | null;
  };
  error: Error | null;
}

export interface AuthStateChangeCallback {
  (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED' | 'INITIAL_SESSION', session: SupabaseSession | null): void;
}

const DEFAULT_SUPABASE_URL = 'https://jizqmqwxnynijwnmmklk.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_6Njl6Lvmxyq2n7XTTN6Z5w_vi4B-iza';

export const ADMIN_EMAIL = 'sankettiwari943@gmail.com';

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || DEFAULT_SUPABASE_ANON_KEY;

const SESSION_STORAGE_KEY = 'sb-jizqmqwxnynijwnmmklk-auth-token';

class SupabaseAuthClient {
  private url: string;
  private anonKey: string;
  private currentSession: SupabaseSession | null = null;
  private listeners: AuthStateChangeCallback[] = [];

  constructor(url: string, anonKey: string) {
    this.url = url.replace(/\/+$/, '');
    this.anonKey = anonKey;
    this.loadSession();
  }

  private loadSession(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        const parsed: SupabaseSession = JSON.parse(raw);
        // Purge mock or legacy demo tokens
        if (
          !parsed?.user?.email ||
          parsed.access_token?.includes('demo') ||
          parsed.access_token?.includes('local_token') ||
          parsed.user?.id === 'usr_admin_sanket' ||
          parsed.user?.id === 'usr_citizen_scout'
        ) {
          localStorage.removeItem(SESSION_STORAGE_KEY);
          this.currentSession = null;
          return;
        }

        parsed.user.role = this.determineRole(parsed.user.email);
        this.currentSession = parsed;
      }
    } catch {
      this.currentSession = null;
    }
  }

  private saveSession(session: SupabaseSession | null): void {
    this.currentSession = session;
    if (typeof window === 'undefined') return;
    try {
      if (session) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (err) {
      console.warn('Failed to save Supabase session:', err);
    }
  }

  private notify(event: 'SIGNED_IN' | 'SIGNED_OUT' | 'USER_UPDATED' | 'INITIAL_SESSION'): void {
    this.listeners.forEach(cb => {
      try {
        cb(event, this.currentSession);
      } catch (e) {
        console.error('Error in auth listener:', e);
      }
    });
  }

  /**
   * Strictly determines role: ONLY sankettiwari943@gmail.com is granted 'admin' role.
   * All other users are assigned 'citizen' role.
   */
  public determineRole(email?: string): 'admin' | 'citizen' {
    if (!email) return 'citizen';
    const em = email.toLowerCase().trim();
    if (em === ADMIN_EMAIL.toLowerCase()) {
      return 'admin';
    }
    return 'citizen';
  }

  public async getSession(): Promise<{ data: { session: SupabaseSession | null }; error: null }> {
    if (!this.currentSession) {
      this.loadSession();
    }
    return { data: { session: this.currentSession }, error: null };
  }

  public async getUser(): Promise<{ data: { user: SupabaseUser | null }; error: null }> {
    const { data } = await this.getSession();
    return { data: { user: data.session?.user || null }, error: null };
  }

  public onAuthStateChange(callback: AuthStateChangeCallback): { data: { subscription: { unsubscribe: () => void } } } {
    this.listeners.push(callback);
    // Initial emission
    setTimeout(() => callback('INITIAL_SESSION', this.currentSession), 0);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
          }
        }
      }
    };
  }

  /**
   * Sign in with Email and Password
   */
  public async signInWithPassword(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const { email, password } = credentials;
    const role = this.determineRole(email);

    if (this.url && this.anonKey) {
      try {
        const res = await fetch(`${this.url}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.anonKey,
          },
          body: JSON.stringify({ email, password }),
        });

        if (res.ok) {
          const json = await res.json();
          const user: SupabaseUser = {
            id: json.user?.id || `usr_${Date.now()}`,
            email: json.user?.email || email,
            full_name: json.user?.user_metadata?.full_name || (role === 'admin' ? 'Sanket Tiwari (NDMA Authority)' : email.split('@')[0]),
            role,
            organization: json.user?.user_metadata?.organization || (role === 'admin' ? 'National Disaster Management Authority (NDMA)' : 'Citizen Field Observer'),
            created_at: json.user?.created_at || new Date().toISOString(),
          };

          const session: SupabaseSession = {
            user,
            access_token: json.access_token || `token_${Date.now()}`,
            expires_at: Date.now() + (json.expires_in || 3600) * 1000,
          };

          this.saveSession(session);
          this.notify('SIGNED_IN');
          return { data: { user, session }, error: null };
        } else {
          const errJson = await res.json().catch(() => ({}));
          const errMsg = errJson.error_description || errJson.msg || errJson.message || 'Invalid email or password';
          return { data: { user: null, session: null }, error: new Error(errMsg) };
        }
      } catch (fetchErr: any) {
        return { data: { user: null, session: null }, error: new Error(fetchErr.message || 'Unable to connect to Supabase auth server') };
      }
    }

    return { data: { user: null, session: null }, error: new Error('Supabase authentication configuration missing') };
  }

  /**
   * Sign up a new user (Default Role: 'citizen')
   */
  public async signUp(params: {
    email: string;
    password: string;
    options?: {
      data?: {
        full_name?: string;
        role?: string;
        organization?: string;
        phone?: string;
      };
    };
  }): Promise<AuthResponse> {
    const { email, password, options } = params;
    const role = this.determineRole(email);
    const fullName = options?.data?.full_name || (role === 'admin' ? 'Sanket Tiwari (NDMA Authority)' : email.split('@')[0]);

    if (this.url && this.anonKey) {
      try {
        const res = await fetch(`${this.url}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.anonKey,
          },
          body: JSON.stringify({
            email,
            password,
            data: {
              full_name: fullName,
              role,
              organization: options?.data?.organization,
              phone: options?.data?.phone,
            },
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const user: SupabaseUser = {
            id: json.user?.id || `usr_${Date.now()}`,
            email: json.user?.email || email,
            full_name: fullName,
            role,
            organization: options?.data?.organization || (role === 'admin' ? 'National Disaster Management Authority (NDMA)' : 'Citizen Field Watch'),
            created_at: json.user?.created_at || new Date().toISOString(),
          };

          const session: SupabaseSession = {
            user,
            access_token: json.access_token || `token_${Date.now()}`,
            expires_at: Date.now() + (json.expires_in || 3600) * 1000,
          };

          this.saveSession(session);
          this.notify('SIGNED_IN');
          return { data: { user, session }, error: null };
        } else {
          const errJson = await res.json().catch(() => ({}));
          const errMsg = errJson.error_description || errJson.msg || errJson.message || 'Registration failed';
          return { data: { user: null, session: null }, error: new Error(errMsg) };
        }
      } catch (err: any) {
        return { data: { user: null, session: null }, error: new Error(err.message || 'Unable to connect to Supabase auth server') };
      }
    }

    return { data: { user: null, session: null }, error: new Error('Supabase configuration missing') };
  }

  /**
   * Sign out
   */
  public async signOut(): Promise<{ error: null }> {
    if (this.url && this.anonKey && this.currentSession?.access_token) {
      try {
        await fetch(`${this.url}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.anonKey,
            'Authorization': `Bearer ${this.currentSession.access_token}`,
          },
        });
      } catch {
        // Fall through to local cleanup
      }
    }
    this.saveSession(null);
    this.notify('SIGNED_OUT');
    return { error: null };
  }
}

// Client-side local in-memory & localStorage table cache fallback
const LOCAL_TABLE_STORAGE_KEY_PREFIX = 'sb_local_table_';

function getLocalTable(tableName: string): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_TABLE_STORAGE_KEY_PREFIX}${tableName}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTable(tableName: string, rows: any[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${LOCAL_TABLE_STORAGE_KEY_PREFIX}${tableName}`, JSON.stringify(rows));
  } catch {}
}

export class SupabaseClient {
  public auth: SupabaseAuthClient;
  public url: string;
  public anonKey: string;

  constructor(url: string, anonKey: string) {
    this.url = url;
    this.anonKey = anonKey;
    this.auth = new SupabaseAuthClient(url, anonKey);
  }

  public from(tableName: string) {
    const baseUrl = `${this.url.replace(/\/+$/, '')}/rest/v1/${tableName}`;
    const key = this.anonKey;

    const executeFetch = async (queryUrl: string, options: RequestInit = {}): Promise<{ data: any; error: any }> => {
      try {
        const token = this.auth.getUser() ? (this.auth as any).currentSession?.access_token || key : key;
        const res = await fetch(queryUrl, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${token}`,
            ...(options.headers || {})
          }
        });
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            return { data, error: null };
          }
          return { data: null, error: null };
        }
      } catch (err) {
        console.warn(`Supabase query on ${tableName} failed, falling back to local store:`, err);
      }
      return { data: null, error: null };
    };

    return {
      select: (columns: string = '*') => {
        let filters: Array<{ col: string; val: any }> = [];
        let orFilter: string | null = null;
        let isSingle = false;

        const runQuery = async () => {
          let queryUrl = `${baseUrl}?select=${columns}`;
          for (const f of filters) {
            queryUrl += `&${f.col}=eq.${encodeURIComponent(f.val)}`;
          }
          if (orFilter) {
            queryUrl += `&or=(${encodeURIComponent(orFilter)})`;
          }

          const remote = await executeFetch(queryUrl);
          if (remote.data && Array.isArray(remote.data)) {
            if (isSingle) {
              return { data: remote.data[0] || null, error: null };
            }
            return { data: remote.data, error: null };
          }

          // Local storage fallback
          let localRows = getLocalTable(tableName);
          for (const f of filters) {
            localRows = localRows.filter((r: any) => String(r[f.col]) === String(f.val));
          }
          if (isSingle) {
            return { data: localRows[0] || null, error: null };
          }
          return { data: localRows, error: null };
        };

        const builder: any = {
          eq: (col: string, val: any) => {
            filters.push({ col, val });
            return builder;
          },
          or: (expr: string) => {
            orFilter = expr;
            return builder;
          },
          order: (_col: string, _opts?: any) => {
            return builder;
          },
          single: async () => {
            isSingle = true;
            return await runQuery();
          },
          then: (onfulfilled?: any, onrejected?: any) => {
            return runQuery().then(onfulfilled, onrejected);
          }
        };

        return builder;
      },

      insert: async (records: any | any[]) => {
        const arr = Array.isArray(records) ? records : [records];
        // Save to local cache
        const localRows = getLocalTable(tableName);
        saveLocalTable(tableName, [...arr, ...localRows]);

        const remote = await executeFetch(baseUrl, {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify(records)
        });

        if (remote.data) {
          return { data: remote.data, error: null };
        }
        return { data: records, error: null };
      },

      upsert: async (records: any | any[], _options?: any) => {
        const arr = Array.isArray(records) ? records : [records];
        // Update local table
        let localRows = getLocalTable(tableName);
        for (const item of arr) {
          const idx = localRows.findIndex((r: any) => r.id === item.id);
          if (idx >= 0) {
            localRows[idx] = { ...localRows[idx], ...item };
          } else {
            localRows = [item, ...localRows];
          }
        }
        saveLocalTable(tableName, localRows);

        const remote = await executeFetch(baseUrl, {
          method: 'POST',
          headers: {
            'Prefer': 'resolution=merge-duplicates,return=representation'
          },
          body: JSON.stringify(records)
        });

        if (remote.data) {
          return { data: remote.data, error: null };
        }
        return { data: records, error: null };
      },

      update: (updates: any) => ({
        eq: async (column: string, value: any) => {
          // Update local table
          let localRows = getLocalTable(tableName);
          localRows = localRows.map((r: any) => (String(r[column]) === String(value) ? { ...r, ...updates } : r));
          saveLocalTable(tableName, localRows);

          const queryUrl = `${baseUrl}?${column}=eq.${encodeURIComponent(value)}`;
          const remote = await executeFetch(queryUrl, {
            method: 'PATCH',
            headers: { 'Prefer': 'return=representation' },
            body: JSON.stringify(updates)
          });
          if (remote.data) {
            return { data: remote.data, error: null };
          }
          return { data: updates, error: null };
        }
      })
    };
  }
}

export function createClient(url: string, anonKey: string): SupabaseClient {
  return new SupabaseClient(url, anonKey);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

