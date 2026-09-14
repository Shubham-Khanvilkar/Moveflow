import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, getStoredAuth, getStoredRefreshToken, saveAuth, clearAuth } from '../services/api';

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  activeRole: string;
  company: { id: string; name: string; code: string } | null;
  permissions: Record<string, boolean>;
  navigation?: any[];
  scope?: any;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string, companyCode: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchRole: (role: string) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  switchRole: () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const { token: storedToken, user: storedUser } = await getStoredAuth();
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        
        try {
          const freshProfile = await authApi.getProfile();
          const updatedUser: User = {
            id: freshProfile.id,
            email: freshProfile.email,
            name: freshProfile.name,
            roles: freshProfile.roles || [],
            activeRole: freshProfile.activeRole,
            company: freshProfile.company,
            permissions: freshProfile.permissions || {},
            navigation: freshProfile.navigation || [],
            scope: freshProfile.scope || {},
          };
          setUser(updatedUser);
           await saveAuth(storedToken, await getStoredRefreshToken(), updatedUser);
         } catch (e) {
          if ((e as any)?.status === 401) {
            await clearAuth();
            setToken(null);
            setUser(null);
          }
        }
      }
    } catch (error) {
      console.log('Auth state check failed:', error);
    }
    setIsLoading(false);
  };

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
       const result = await authApi.login(email, password);
      setToken(result.token);
      setUser(result.user);
      return { success: true };
    } catch (error: any) {
      console.error('Login failed:', error);
      return { success: false, error: error.message || 'Login failed. Please check your credentials.' };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, companyCode: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await authApi.register(email, password, name, companyCode);
      setToken(result.token);
      setUser(result.user);
      return { success: true };
    } catch (error: any) {
      console.error('Registration failed:', error);
      return { success: false, error: error.message || 'Registration failed. Please try again.' };
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setToken(null);
    await clearAuth();
  }, []);

  const switchRole = useCallback((role: string) => {
    if (user) {
      setUser({ ...user, activeRole: role });
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await authApi.getProfile();
      const updatedUser: User = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        roles: profile.roles || [],
        activeRole: profile.activeRole,
        company: profile.company,
        permissions: profile.permissions || {},
        navigation: profile.navigation || [],
        scope: profile.scope || {},
      };
      setUser(updatedUser);
    } catch (error) {
      console.error('Profile refresh failed:', error);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        switchRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
