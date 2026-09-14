'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest, ApiError } from '../../lib/api-client';

interface DriverProfile {
  id: string;
  driverCode: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  licenseNo?: string;
  licenseExpiry?: string;
  status: string;
  availabilityStatus: string;
  verificationStatus?: string;
  vendorId?: string;
  user?: { id: string; name: string; email: string; phone?: string };
}

interface DashboardSummary {
  drivers?: { total: number; available: number };
  vehicles?: { total: number; available: number };
  trips?: { active: number };
  bookings?: { active: number };
  routes?: { total: number };
}

interface Trip {
  id: string;
  status: string;
  origin?: string;
  destination?: string;
  createdAt?: string;
  scheduledTime?: string;
  passengers?: any[];
}

export default function DriverHomePage({ token, user, onNavigate }: { token: string; user: any; onNavigate?: (id: string) => void }) {
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  const isOnline = driverProfile?.availabilityStatus === 'AVAILABLE' || driverProfile?.availabilityStatus === 'ON_TRIP';

  const fetchDriverData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [summaryData, profileData] = await Promise.allSettled([
        apiRequest<DashboardSummary>('/dashboard/analytics/summary'),
        apiRequest<DriverProfile>('/auth/me').then(async (me) => {
          const companyId = (me as any)?.company?.id;
          if (companyId && me?.id) {
            try {
              return await apiRequest<DriverProfile>(`/dashboard/drivers?search=${me.id}`);
            } catch {
              return me as unknown as DriverProfile;
            }
          }
          return me as unknown as DriverProfile;
        }),
      ]);

      if (summaryData.status === 'fulfilled') {
        setSummary(summaryData.value);
      }

      if (profileData.status === 'fulfilled') {
        const profile = profileData.value as any;
        setDriverProfile({
          id: profile?.id || profile?.driverProfile?.id || user?.id,
          driverCode: profile?.driverCode || profile?.driverProfile?.driverCode || '',
          firstName: profile?.firstName || profile?.name?.split(' ')[0] || user?.name?.split(' ')[0] || '',
          lastName: profile?.lastName || profile?.name?.split(' ').slice(1).join(' ') || user?.name?.split(' ').slice(1).join(' ') || '',
          phone: profile?.phone || user?.phone || '',
          email: profile?.email || user?.email || '',
          licenseNo: profile?.licenseNo || profile?.driverProfile?.licenseNo || '',
          licenseExpiry: profile?.licenseExpiry || profile?.driverProfile?.licenseExpiry || '',
          status: profile?.status || profile?.driverProfile?.status || 'ACTIVE',
          availabilityStatus: profile?.availabilityStatus || profile?.driverProfile?.availabilityStatus || 'OFF_DUTY',
          verificationStatus: profile?.verificationStatus || profile?.driverProfile?.verificationStatus || '',
          vendorId: profile?.vendorId || profile?.driverProfile?.vendorId || '',
          user: profile?.user || { id: user?.id, name: user?.name, email: user?.email, phone: user?.phone },
        });
      } else if (profileData.status === 'rejected') {
        setDriverProfile({
          id: user?.id,
          driverCode: '',
          firstName: user?.name?.split(' ')[0] || '',
          lastName: user?.name?.split(' ').slice(1).join(' ') || '',
          phone: user?.phone || '',
          email: user?.email || '',
          licenseNo: '',
          licenseExpiry: '',
          status: 'ACTIVE',
          availabilityStatus: 'OFF_DUTY',
          verificationStatus: '',
          user: { id: user?.id, name: user?.name, email: user?.email, phone: user?.phone },
        });
      }

      try {
        const tripsData = await apiRequest<{ data: Trip[]; pagination?: any }>('/trips?limit=10');
        setTrips(Array.isArray(tripsData?.data) ? tripsData.data : Array.isArray(tripsData) ? tripsData : []);
      } catch {
        setTrips([]);
      }
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : 'Failed to load dashboard data';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDriverData();
  }, [fetchDriverData]);

  const toggleAvailability = async () => {
    if (!driverProfile?.id || isToggling) return;

    try {
      setIsToggling(true);
      const newStatus = !isOnline;
      await apiRequest(`/drivers/${driverProfile.id}/availability`, {
        method: 'POST',
        body: JSON.stringify({ available: newStatus }),
      });
      setDriverProfile(prev => prev ? {
        ...prev,
        availabilityStatus: newStatus ? 'AVAILABLE' : 'OFF_DUTY',
      } : prev);
    } catch (err: any) {
      const message = err instanceof ApiError ? err.message : 'Failed to update availability';
      alert(message);
    } finally {
      setIsToggling(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 24, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⏳</div>
          <div style={{ fontSize: 14, color: '#6b7280' }}>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>{error}</div>
          <button onClick={fetchDriverData} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const todayTrips = trips.filter(t => {
    const today = new Date().toDateString();
    return t.createdAt && new Date(t.createdAt).toDateString() === today;
  });

  const upcomingTrips = trips.filter(t => ['SCHEDULED', 'DISPATCHED', 'DRIVER_ACCEPTED'].includes(t.status)).slice(0, 5);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Driver Dashboard</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Welcome, {driverProfile?.firstName || user?.name || 'Driver'} — Your trips and operational tools</p>
      </div>

      {/* Driver Profile Card */}
      <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{driverProfile?.firstName} {driverProfile?.lastName}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Code: {driverProfile?.driverCode || 'N/A'}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>Phone: {driverProfile?.phone || 'N/A'}</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>License: {driverProfile?.licenseNo || 'N/A'}</div>
            {driverProfile?.licenseExpiry && (
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                License Expiry: {new Date(driverProfile.licenseExpiry).toLocaleDateString()}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              background: driverProfile?.status === 'ACTIVE' ? '#dcfce7' : '#fef2f2',
              color: driverProfile?.status === 'ACTIVE' ? '#166534' : '#991b1b',
            }}>
              {driverProfile?.status?.replace(/_/g, ' ') || 'Unknown'}
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div style={{
        background: isOnline ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #6b7280, #9ca3af)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Current Status</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{isOnline ? 'Available for Trips' : 'Offline'}</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
            {driverProfile?.availabilityStatus?.replace(/_/g, ' ') || 'Unknown'}
          </div>
        </div>
        <button
          onClick={toggleAvailability}
          disabled={isToggling}
          style={{
            padding: '10px 20px',
            background: isToggling ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 8,
            color: 'white',
            fontSize: 13,
            fontWeight: 600,
            cursor: isToggling ? 'not-allowed' : 'pointer',
            opacity: isToggling ? 0.6 : 1,
          }}
        >
          {isToggling ? 'Updating...' : isOnline ? 'Go Offline' : 'Go Online'}
        </button>
      </div>

      {/* Driver KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: "Today's Trips", value: todayTrips.length, color: '#2563eb', icon: '🚐' },
          { label: 'Completed', value: todayTrips.filter(t => t.status === 'COMPLETED').length, color: '#10b981', icon: '✅' },
          { label: 'In Progress', value: todayTrips.filter(t => ['IN_TRANSIT', 'STARTED', 'BOARDING'].includes(t.status)).length, color: '#f59e0b', icon: '🔄' },
          { label: 'Pending Pickups', value: todayTrips.filter(t => ['DRIVER_EN_ROUTE', 'ARRIVED'].includes(t.status)).length, color: '#8b5cf6', icon: '📍' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{kpi.label}</span>
              <span style={{ fontSize: 18 }}>{kpi.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Operational Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Navigate to Pickup', desc: 'Open in maps', color: '#2563eb', icon: '🧭', action: 'navigation' },
          { label: 'Vehicle Inspection', desc: 'Pre-trip safety check', color: '#10b981', icon: '🔍', action: 'vehicle-check' },
          { label: 'Call Employee', desc: 'Contact passenger', color: '#f59e0b', icon: '📞', action: 'passengers' },
          { label: 'Mark Boarding', desc: 'OTP/QR verification', color: '#8b5cf6', icon: '🎫', action: 'boarding' },
          { label: 'Report No-Show', desc: 'Passenger not present', color: '#ef4444', icon: '🚫', action: 'no-show' },
          { label: 'Vehicle Breakdown', desc: 'Report breakdown', color: '#dc2626', icon: '🔧', action: 'breakdown' },
        ].map((action, i) => (
          <button
            key={i}
            onClick={() => onNavigate?.(action.action)}
            style={{
              padding: '16px',
              borderRadius: 12,
              border: `2px solid ${action.color}30`,
              background: 'white',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>{action.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: action.color }}>{action.label}</span>
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginLeft: 30 }}>{action.desc}</div>
          </button>
        ))}
      </div>

      {/* SOS Button */}
      <div style={{ background: '#fef2f2', borderRadius: 12, padding: 20, textAlign: 'center', border: '2px solid #fecaca', marginBottom: 20 }}>
        <button
          onClick={() => onNavigate?.('sos')}
          style={{
            padding: '14px 40px',
            background: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(220,38,38,0.3)',
          }}
        >
          SOS — EMERGENCY ALERT
        </button>
        <div style={{ fontSize: 11, color: '#991b1b', marginTop: 8 }}>Press only in emergency. Alert will be sent to control room and nearest supervisor.</div>
      </div>

      {/* Upcoming Trips */}
      {upcomingTrips.length > 0 && (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Upcoming Trips</h3>
          </div>
          {upcomingTrips.map(trip => (
            <div key={trip.id} style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{trip.origin || 'Pickup'} → {trip.destination || 'Drop'}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  Trip: {trip.id?.slice(0, 12)} • {trip.status?.replace(/_/g, ' ')}
                  {trip.scheduledTime && ` • ${new Date(trip.scheduledTime).toLocaleTimeString()}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onNavigate?.('navigation')} style={{ padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Navigate</button>
                <button onClick={() => onNavigate?.('trips')} style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Details</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Today's Trip List */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Today's Trips</h3>
        </div>
        {todayTrips.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🚐</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>No trips assigned for today</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>New trip assignments will appear here</div>
          </div>
        ) : (
          todayTrips.map(trip => (
            <div key={trip.id} style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{trip.origin || 'Pickup'} → {trip.destination || 'Drop'}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Trip: {trip.id?.slice(0, 12)} • {trip.status?.replace(/_/g, ' ')}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onNavigate?.('navigation')} style={{ padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Navigate</button>
                <button onClick={() => onNavigate?.('trips')} style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Details</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
