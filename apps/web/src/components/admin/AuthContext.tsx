'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { API_URL } from '../../lib/config';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';

// ─── Types ─────────────────────────────────────────────────
export interface Portal {
  portalId: string;
  route: string;
  title: string;
  icon: string;
  description: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
}

export interface DashboardDef {
  dashboardId: string;
  portal: string;
  roles: string[];
  requiredPermissions: string[];
  route: string;
  title: string;
  description: string;
  widgetIds: string[];
  defaultFilters: Record<string, any>;
}

export interface UserScope {
  sites: { id: string; name: string }[];
  lobs: { id: string; name: string }[];
  processes: { id: string; name: string }[];
  shifts: { id: string; name: string }[];
}

export interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

export interface DataVisibility {
  scope: string;
  dataClassification: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  employeeId?: string;
  status: string;
  transportEligibility?: string;
  role: string;
  activeRole: string;
  companyId: string;
  companyName: string;
  company?: { id: string; name: string; code: string };
  roles: string[];
  permissions: Record<string, boolean>;
  scope: UserScope;
  portals: Portal[];
  activePortal: Portal | null;
  navigation: NavigationItem[];
  dashboard: { id: string; title: string; route: string } | null;
  dataVisibility: DataVisibility;
}

interface AuthState {
  user: User | null;
  token: string | null;
  portals: Portal[];
  defaultPortal: Portal | null;
  portalDashboards: Record<string, DashboardDef[]>;
  scope: UserScope;
  loading: boolean;
  resolving: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  activePortal: Portal | null;
  setActivePortal: (p: Portal) => void;
  refreshMe: () => Promise<void>;
  navigation: NavigationItem[];
}

const AuthContext = createContext<AuthState>({
  user: null, token: null, portals: [], defaultPortal: null,
  portalDashboards: {}, scope: { sites: [], lobs: [], processes: [], shifts: [] },
  loading: true, resolving: false, login: async () => false, logout: () => {},
  activePortal: null, setActivePortal: () => {}, refreshMe: async () => {},
  navigation: [],
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [portals, setPortals] = useState<Portal[]>([]);
  const [defaultPortal, setDefaultPortal] = useState<Portal | null>(null);
  const [portalDashboards, setPortalDashboards] = useState<Record<string, DashboardDef[]>>({});
  const [scope, setScope] = useState<UserScope>({ sites: [], lobs: [], processes: [], shifts: [] });
  const [activePortal, setActivePortal] = useState<Portal | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [navigation, setNavigation] = useState<NavigationItem[]>([]);

  // Fetch full user context from /me endpoint
  const fetchMe = useCallback(async (accessToken: string) => {
    setResolving(true);
    let lastErr: any = null;
    for (let attempt = 0; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const res = await fetch(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) {
          throw new Error(`Failed to fetch user context: ${res.status}`);
        }
        const data = await res.json();
        const me = data.data || data;

        const fullUser: User = {
          id: me.id,
          email: me.email,
          name: me.name,
          phone: me.phone,
          employeeId: me.employeeId,
          status: me.status,
          transportEligibility: me.transportEligibility,
          role: me.activeRole || me.roles?.[0] || 'EMPLOYEE',
          activeRole: me.activeRole || me.roles?.[0] || 'EMPLOYEE',
          companyId: me.company?.id || '',
          companyName: me.company?.name || '',
          company: me.company,
          roles: me.roles || [],
          permissions: me.permissions || {},
          scope: me.scope || { sites: [], lobs: [], processes: [], shifts: [] },
          portals: me.portals || [],
          activePortal: me.activePortal || null,
          navigation: me.navigation || [],
          dashboard: me.dashboard || null,
          dataVisibility: me.dataVisibility || { scope: 'self', dataClassification: 'INTERNAL' },
        };

        setUser(fullUser);
        setPortals(me.portals || []);
        setDefaultPortal(me.activePortal || null);
        setPortalDashboards(me.portalDashboards || {});
        setScope(me.scope || { sites: [], lobs: [], processes: [], shifts: [] });
        setNavigation(me.navigation || []);
        if (me.activePortal) {
          setActivePortal(me.activePortal);
        }
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    if (lastErr) {
      console.error('Failed to fetch user context:', lastErr);
      // Don't clear user on fetch failure - keep stale data
    } finally {
      setResolving(false);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    if (token) {
      await fetchMe(token);
    }
  }, [token, fetchMe]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      let accessToken: string | null = null;

      // Try Supabase client-side auth first (fast, ~200ms)
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        if (supabase) {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) {
            console.warn('Supabase auth failed, falling back to API:', error.message);
          } else if (data.session?.access_token) {
            accessToken = data.session.access_token;
          }
        }
      }

      // Fallback to EC2 API login (slow, ~8-11s)
      if (!accessToken) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (!res.ok) {
          console.error('Login API error:', res.status, data);
          throw new Error(data.message || data.error || `Login failed (${res.status})`);
        }
        if (data.success && data.data) {
          accessToken = data.data.access_token;
        } else {
          console.error('Login unexpected response:', data);
          return false;
        }
      }

      setToken(accessToken);
      localStorage.setItem('token', accessToken);
      await fetchMe(accessToken);
      return true;
    } catch (err: any) {
      console.error('Login failed:', err?.message || err);
      throw err;
    }
  }, [fetchMe]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setPortals([]);
    setDefaultPortal(null);
    setPortalDashboards({});
    setScope({ sites: [], lobs: [], processes: [], shifts: [] });
    setActivePortal(null);
    setNavigation([]);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Sign out from Supabase too
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (supabase) supabase.auth.signOut();
    }
  }, []);

  // Restore session
  useEffect(() => {
    const restore = async () => {
      // Try Supabase session first
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            setToken(session.access_token);
            localStorage.setItem('token', session.access_token);
            await fetchMe(session.access_token);
            setLoading(false);
            return;
          }
        }
      }
      // Fallback to localStorage token
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        setToken(savedToken);
        await fetchMe(savedToken);
      }
      setLoading(false);
    };
    restore();
  }, [fetchMe]);

  return (
    <AuthContext.Provider value={{
      user, token, portals, defaultPortal, portalDashboards, scope,
      loading, resolving, login, logout, activePortal, setActivePortal, refreshMe,
      navigation,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
