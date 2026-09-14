'use client';
import React, { useState, useEffect } from 'react';
import Spinner from '../Spinner';
import { apiRequest, ApiError } from '../../lib/api-client';

interface DashboardSummary {
  employees: { total: number };
  vendors: { total: number };
  drivers: { total: number; available: number };
  vehicles: { total: number; available: number };
  routes: { total: number };
  nodalPoints: { total: number };
  shuttleRoutes: { total: number };
  bookings: { active: number };
  trips: { active: number };
  approvals: { pending: number };
  bans: { active: number };
  emergencies: { active: number };
}

export default function CoordinatorDashboard({ token, user, onNavigate }: { token: string; user: any; onNavigate?: (id: string) => void }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryData, tripsData, driversData, bookingsData] = await Promise.allSettled([
          apiRequest<DashboardSummary>('/dashboard/analytics/summary'),
          apiRequest<any>('/dashboard/trips?limit=10'),
          apiRequest<any>('/dashboard/drivers?limit=20'),
          apiRequest<any>('/bookings?status=PENDING&limit=5'),
        ]);

        if (cancelled) return;

        if (summaryData.status === 'fulfilled') {
          setSummary(summaryData.value);
        } else {
          console.error('Failed to fetch summary:', summaryData.reason);
        }

        const tripsResult = tripsData.status === 'fulfilled' ? tripsData.value : null;
        setTrips(tripsResult?.trips || tripsResult?.data || []);

        const driversResult = driversData.status === 'fulfilled' ? driversData.value : null;
        setDrivers(driversResult?.drivers || driversResult?.data || []);

        const bookingsResult = bookingsData.status === 'fulfilled' ? bookingsData.value : null;
        setBookings(bookingsResult?.bookings || bookingsResult?.data || []);

        const failures = [summaryData, tripsData, driversData, bookingsData].filter(r => r.status === 'rejected');
        if (failures.length === 4) {
          setError('Failed to load dashboard data. Please try again.');
        }
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof ApiError ? e.message : 'An unexpected error occurred';
          setError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#991b1b', margin: '0 0 8px' }}>Error Loading Dashboard</h3>
          <p style={{ fontSize: 13, color: '#b91c1c', margin: '0 0 16px' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const d: Partial<DashboardSummary> = summary || {};

  const activeTrips = trips.filter((t: any) => ['IN_TRANSIT', 'DISPATCHED', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_PICKUP'].includes(t.status));
  const availableDrivers = drivers.filter((dr: any) => dr.status === 'AVAILABLE' || dr.isAvailable);

  const isEmpty = !summary && trips.length === 0 && drivers.length === 0 && bookings.length === 0;

  if (isEmpty) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Dispatch Operations Center</h2>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Live dispatch management and driver coordination — {user?.name || 'Coordinator'}</p>
          </div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 48, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>No Dispatch Data Available</h3>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>There are no active bookings, trips, or drivers to display at this time.</p>
          <button
            onClick={() => onNavigate?.('dispatch')}
            style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            Go to Dispatch
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Dispatch Operations Center</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Live dispatch management and driver coordination — {user?.name || 'Coordinator'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Pending Approvals', value: d.approvals?.pending ?? bookings.length, color: '#ef4444', icon: '⏳' },
          { label: 'Available Drivers', value: d.drivers?.available ?? availableDrivers.length, color: '#10b981', icon: '🟢' },
          { label: 'Active Trips', value: d.trips?.active ?? activeTrips.length, color: '#2563eb', icon: '🚐' },
          { label: 'Total Drivers', value: d.drivers?.total ?? drivers.length, color: '#8b5cf6', icon: '👥' },
          { label: 'Active Bookings', value: d.bookings?.active ?? 0, color: '#f59e0b', icon: '📊' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${kpi.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>{kpi.label}</span>
              <span style={{ fontSize: 16 }}>{kpi.icon}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Pending Dispatch</h3>
          {bookings.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No pending bookings</div>
          ) : (
            bookings.slice(0, 6).map((b: any, i: number) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{b.employeeName || b.user?.name || `Booking ${b.id?.slice(0, 8)}`}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>📍 {b.pickupAddress || b.pickup || ''} · ⏰ {b.scheduledTime ? new Date(b.scheduledTime).toLocaleTimeString() : ''}</div>
                  </div>
                  <button onClick={() => onNavigate?.('dispatch')} style={{ padding: '5px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Dispatch</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Live Trips</h3>
          {activeTrips.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No active trips</div>
          ) : (
            activeTrips.slice(0, 6).map((t: any, i: number) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.driverName || t.driver?.name || `Trip ${t.id?.slice(0, 8)}`}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>🛣️ {t.route || t.pickupAddress || ''} · 👥 {t.passengerCount || 1}</div>
                  </div>
                  <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 600, background: t.status === 'IN_TRANSIT' ? '#dbeafe' : '#dcfce7', color: t.status === 'IN_TRANSIT' ? '#2563eb' : '#10b981' }}>{t.status?.replace(/_/g, ' ')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Driver Availability</h3>
          {drivers.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No driver data</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
              {drivers.slice(0, 8).map((dr: any, i: number) => {
                const isAvailable = dr.status === 'AVAILABLE' || dr.isAvailable;
                const isOnTrip = ['ON_TRIP', 'IN_TRANSIT', 'DISPATCHED'].includes(dr.status);
                const color = isAvailable ? '#10b981' : isOnTrip ? '#2563eb' : '#9ca3af';
                return (
                  <div key={i} style={{ padding: '12px 8px', borderRadius: 8, background: `${color}10`, border: `1px solid ${color}30`, textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{dr.firstName || dr.name || `Driver ${i + 1}`}</div>
                    <div style={{ fontSize: 10, color, fontWeight: 600 }}>{(dr.status || 'UNKNOWN').replace(/_/g, ' ')}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Dispatch Booking', route: 'dispatch', color: '#2563eb' },
              { label: 'View Live Trips', route: 'trips', color: '#10b981' },
              { label: 'Manage Drivers', route: 'drivers', color: '#8b5cf6' },
              { label: 'Handle Reassignments', route: 'reassignment', color: '#f59e0b' },
              { label: 'View Reports', route: 'reports', color: '#6b7280' },
            ].map((action, i) => (
              <button
                key={i}
                onClick={() => onNavigate?.(action.route)}
                style={{ padding: '10px 16px', background: `${action.color}10`, border: `1px solid ${action.color}30`, borderRadius: 8, fontSize: 13, fontWeight: 500, color: action.color, cursor: 'pointer', textAlign: 'left' }}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
