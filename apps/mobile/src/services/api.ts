import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

interface UserData {
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

let storedToken: string | null = null;
let storedUser: UserData | null = null;

async function getStoredAuth(): Promise<{ token: string | null; user: UserData | null }> {
  try {
    if (!storedToken) {
      storedToken = await AsyncStorage.getItem('navira_access_token');
    }
    if (!storedUser) {
      const userStr = await AsyncStorage.getItem('navira_user');
      if (userStr) {
        storedUser = JSON.parse(userStr);
      }
    }
  } catch (e) {
    console.log('Error reading stored auth:', e);
  }
  return { token: storedToken, user: storedUser };
}

async function getStoredRefreshToken(): Promise<string> {
  return (await AsyncStorage.getItem('navira_refresh_token')) || '';
}

async function saveAuth(token: string, refreshToken: string, user: UserData): Promise<void> {
  storedToken = token;
  storedUser = user;
  await AsyncStorage.setItem('navira_access_token', token);
  await AsyncStorage.setItem('navira_refresh_token', refreshToken);
  await AsyncStorage.setItem('navira_user', JSON.stringify(user));
}

async function clearAuth(): Promise<void> {
  storedToken = null;
  storedUser = null;
  await AsyncStorage.removeItem('navira_access_token');
  await AsyncStorage.removeItem('navira_refresh_token');
  await AsyncStorage.removeItem('navira_user');
}

export { getStoredAuth, getStoredRefreshToken, saveAuth, clearAuth };
export type { AuthTokens, UserData };

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const { token } = await getStoredAuth();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
    const error = new Error(errorData.message || `HTTP ${response.status}`);
    (error as any).status = response.status;
    if (response.status === 401) await clearAuth();
    throw error;
  }

  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<{ token: string; user: UserData }> => {
    const response = await apiRequest<{
      access_token: string;
      refresh_token: string;
      user: any;
      company: any;
      role: string;
      roles: string[];
      permissions: Record<string, boolean>;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const userData: UserData = {
      id: response.user.id,
      email: response.user.email,
      name: response.user.name,
      roles: response.roles || [response.role],
      activeRole: response.role,
      company: response.company,
      permissions: response.permissions || {},
    };

    await saveAuth(response.access_token, response.refresh_token, userData);
    return { token: response.access_token, user: userData };
  },

  register: async (email: string, password: string, name: string, companyCode: string): Promise<{ token: string; user: UserData }> => {
    const response = await apiRequest<{
      access_token: string;
      refresh_token: string;
      user: any;
      company: any;
      role: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, companyCode }),
    });

    const userData: UserData = {
      id: response.user.id,
      email: response.user.email,
      name: response.user.name,
      roles: [response.role],
      activeRole: response.role,
      company: response.company,
      permissions: {},
    };

    await saveAuth(response.access_token, response.refresh_token, userData);
    return { token: response.access_token, user: userData };
  },

  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore logout errors
    }
    await clearAuth();
  },

  refresh: async (refreshToken: string): Promise<{ token: string; refreshToken: string }> => {
    const response = await apiRequest<{ access_token: string; refresh_token: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    return { token: response.access_token, refreshToken: response.refresh_token };
  },

  getProfile: async (): Promise<UserData> => {
    const response = await apiRequest<any>('/auth/me');
    return {
      id: response.id,
      email: response.email,
      name: response.name,
      roles: response.roles || [],
      activeRole: response.activeRole,
      company: response.company,
      permissions: response.permissions || {},
      navigation: response.navigation || [],
      scope: response.scope || {},
    };
  },

  getStoredAuth,
};

// Employees API
export const employeesApi = {
  list: (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest(`/employees?${query}`);
  },

  get: (id: string) => apiRequest(`/employees/${id}`),

  create: (data: any) => apiRequest('/employees', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: string, data: any) => apiRequest(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  delete: (id: string) => apiRequest(`/employees/${id}`, { method: 'DELETE' }),

  getSelfProfile: () => apiRequest('/employees/self/profile'),

  getSelfLocations: () => apiRequest('/employees/self/locations'),

  getTripHistory: (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/employees/self/trip-history?${query}`);
  },
};

// Bookings API
export const bookingsApi = {
  list: (params?: { status?: string; date?: string; limit?: number; page?: number }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest(`/trips/bookings?${query}`);
  },

  get: (id: string) => apiRequest(`/trips/bookings/${id}`),

  create: (data: {
    serviceType: string;
    date: string;
    pickupTime: string;
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropAddress: string;
    dropLatitude: number;
    dropLongitude: number;
    passengerCount?: number;
    notes?: string;
    vehicleType?: string;
  }) => apiRequest('/trips/bookings', { method: 'POST', body: JSON.stringify(data) }),

  approve: (id: string, approved: boolean, reason?: string) =>
    apiRequest(`/trips/bookings/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved, reason }),
    }),

  reject: (id: string, reason: string) =>
    apiRequest(`/trips/bookings/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved: false, reason }),
    }),

  cancel: (id: string, reason?: string) =>
    apiRequest(`/trips/bookings/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ approved: false, reason: reason || 'Cancelled by requester' }),
    }),
};

// Trips API
export const tripsApi = {
  list: (params?: { status?: string; date?: string; driverId?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return apiRequest(`/trips?${query}`);
  },

  get: (id: string) => apiRequest(`/trips/${id}`),

  getByCode: (code: string) => apiRequest(`/trips/by-code/${code}`),

  transition: (id: string, action: string, metadata?: any) =>
    apiRequest(`/trips/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ action, metadata }),
    }),

  start: (id: string) =>
    apiRequest(`/trips/${id}/transition`, { method: 'POST', body: JSON.stringify({ action: 'START_TRIP' }) }),

  complete: (id: string, metadata?: any) =>
    apiRequest(`/trips/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ action: 'COMPLETE_TRIP', metadata }),
    }),

  cancel: (id: string, reason?: string) =>
    apiRequest(`/trips/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify({ action: 'CANCEL', metadata: { reason } }),
    }),

  getDrivers: () => apiRequest('/trips/drivers/available', { method: 'POST' }),
  
  getVehicles: () => apiRequest('/trips/vehicles/available', { method: 'POST' }),

  dispatch: (bookingId: string, driverId: string, vehicleId: string) =>
    apiRequest(`/trips/dispatch/${bookingId}`, {
      method: 'POST',
      body: JSON.stringify({ driverId, vehicleId }),
    }),

  getPassengers: (tripId: string) => apiRequest(`/trips/${tripId}/passengers`),

  markBoarding: (tripId: string, passengerId: string, boarded: boolean) =>
    apiRequest(`/trips/${tripId}/passengers/${passengerId}/transition`, {
      method: 'POST',
      body: JSON.stringify({ action: boarded ? 'PICKED_UP' : 'NO_SHOW' }),
    }),

  markNoShow: (tripId: string, passengerId: string, evidence?: any) =>
    apiRequest(`/trips/${tripId}/passengers/${passengerId}/transition`, {
      method: 'POST',
      body: JSON.stringify({ action: 'NO_SHOW', ...(evidence || {}) }),
    }),

  getMyTrips: () => apiRequest('/trips/my'),
};

// GPS API
export const gpsApi = {
  recordLocation: (data: {
    latitude: number;
    longitude: number;
    speed?: number;
    heading?: number;
    tripId?: string;
    vehicleId: string;
  }) => apiRequest(`/trips/gps/${(data as any).vehicleId}`, { method: 'POST', body: JSON.stringify(data) }),

  getLocations: () => apiRequest('/v1/gps/vehicles'),

  getLocation: (vehicleId: string) => apiRequest(`/v1/gps/vehicles/${vehicleId}`),

  getTripRoute: (tripId: string) => apiRequest(`/v1/gps/trips/${tripId}/history`),
};

// Drivers API
export const driversApi = {
  list: () => apiRequest('/drivers'),
  
  get: (id: string) => apiRequest(`/drivers/${id}`),

  updateAvailability: (id: string, available: boolean) =>
    apiRequest(`/drivers/${id}/availability`, {
      method: 'PUT',
      body: JSON.stringify({ isAvailable: available }),
    }),

  getMyProfile: () => apiRequest('/drivers/my/profile'),
};

// Notifications API
export const notificationsApi = {
  list: () => apiRequest('/notifications'),
  
  getUnread: () => apiRequest('/notifications/unread-count'),

  markAsRead: (id: string) =>
    apiRequest(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllAsRead: () => apiRequest('/notifications/read-all', { method: 'PATCH' }),
};

// Dashboard API
export const dashboardApi = {
  getKpis: () => apiRequest('/dashboard/kpi'),
  
  getSummary: () => apiRequest('/dashboard/analytics/summary'),
};

// Vehicle QR API
export const qrApi = {
  scan: (qrCode: string) =>
    apiRequest('/vehicle-qr/scan', {
      method: 'POST',
      body: JSON.stringify({ qrCode }),
    }),

  generate: (vehicleId: string, shiftId?: string) =>
    apiRequest('/vehicle-qr/generate', {
      method: 'POST',
      body: JSON.stringify({ vehicleId, shiftId }),
    }),
};

// SOS API
export const sosApi = {
  trigger: (data: { type: string; latitude?: number; longitude?: number; message?: string }) =>
    apiRequest('/safety/sos/trigger', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getActive: () => apiRequest('/safety/sos/active'),
};

export default {
  auth: authApi,
  employees: employeesApi,
  bookings: bookingsApi,
  trips: tripsApi,
  gps: gpsApi,
  drivers: driversApi,
  notifications: notificationsApi,
  dashboard: dashboardApi,
  qr: qrApi,
  sos: sosApi,
  API_BASE_URL,
};
