'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../lib/config';

const TRIP_STATUSES_GUARD_RELEVANT = [
  'SCHEDULED', 'DISPATCHED', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_PICKUP',
  'ARRIVED_AT_PICKUP', 'BOARDING', 'IN_TRANSIT',
];

export default function GuardDashboard({ token, user, onNavigate }: { token: string; user: any; onNavigate?: (id: string) => void }) {
  const [kpi, setKpi] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [sosActive, setSosActive] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [kpiRes, tripsRes, sosRes] = await Promise.all([
        fetch(`${API_URL}/api/dashboard/kpi`, { headers }).then(r => r.ok ? r.json() : Promise.reject(new Error('KPI fetch failed'))),
        fetch(`${API_URL}/api/trips?limit=50`, { headers }).then(r => r.ok ? r.json() : Promise.reject(new Error('Trips fetch failed'))),
        fetch(`${API_URL}/api/safety/sos/active`, { headers }).then(r => r.ok ? r.json() : Promise.reject(new Error('SOS fetch failed'))),
      ]);

      setKpi(kpiRes.data || kpiRes);
      const allTrips = tripsRes.data || tripsRes.trips || [];
      setTrips(allTrips.filter((t: any) => TRIP_STATUSES_GUARD_RELEVANT.includes(t.status)));
      setSosActive(sosRes.data || sosRes.active || sosRes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const handleBoardingVerify = async (tripId: string) => {
    setActionLoading(`boarding-${tripId}`);
    try {
      await fetch(`${API_URL}/api/trips/${tripId}/transition`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'START_BOARDING' }),
      });
      await fetchDashboardData(true);
    } catch {
      setError('Failed to verify boarding');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartTrip = async (tripId: string) => {
    setActionLoading(`start-${tripId}`);
    try {
      await fetch(`${API_URL}/api/trips/${tripId}/transition`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'START_TRIP' }),
      });
      await fetchDashboardData(true);
    } catch {
      setError('Failed to start trip');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSosAcknowledge = async (sosId: string) => {
    setActionLoading(`sos-${sosId}`);
    try {
      await fetch(`${API_URL}/api/safety/sos/${sosId}/acknowledge`, {
        method: 'POST',
        headers,
      });
      await fetchDashboardData(true);
    } catch {
      setError('Failed to acknowledge SOS');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerSos = async () => {
    if (!window.confirm('Are you sure you want to raise a safety alert?')) return;
    setActionLoading('trigger-sos');
    try {
      await fetch(`${API_URL}/api/safety/sos/trigger`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'GUARD_RAISED', description: 'Safety alert raised by guard' }),
      });
      await fetchDashboardData(true);
    } catch {
      setError('Failed to raise safety alert');
    } finally {
      setActionLoading(null);
    }
  };

  const boardingPending = trips.filter((t: any) => ['DISPATCHED', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP'].includes(t.status));
  const boardingInProgress = trips.filter((t: any) => t.status === 'BOARDING');
  const inTransit = trips.filter((t: any) => t.status === 'IN_TRANSIT');

  if (loading) {
    return (
      <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Loading guard dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !kpi) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <p style={{ color: '#dc2626', fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Failed to load dashboard</p>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '0 0 16px' }}>{error}</p>
          <button onClick={() => fetchDashboardData()} style={{ padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#dc2626', fontSize: 13 }}>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Guard Operations</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Trip monitoring, boarding verification, safety alerts — {user?.name || 'Guard'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            style={{ padding: '6px 14px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.6 : 1 }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <div style={{ padding: '8px 16px', background: '#10b981', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 600 }}>
            On Duty
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Active Trips', value: trips.length, color: '#2563eb', icon: '🚐' },
          { label: 'Boarding Verified', value: boardingInProgress.length, color: '#10b981', icon: '✅' },
          { label: 'Pending Verification', value: boardingPending.length, color: '#f59e0b', icon: '⏳' },
          { label: 'Safety Alerts', value: sosActive.length, color: sosActive.length > 0 ? '#ef4444' : '#10b981', icon: '🚨' },
        ].map((item, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${item.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>{item.label}</span>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: item.color }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Boarding Verification Queue</h3>
          {trips.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 4px' }}>No active trips to monitor</p>
              <p style={{ color: '#d1d5db', fontSize: 12, margin: 0 }}>Trips will appear here when dispatched</p>
            </div>
          ) : (
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {trips.slice(0, 15).map((trip: any, i: number) => (
                <div key={trip.id || i} style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {trip.id?.slice(0, 8) || `Trip ${i + 1}`} — {trip.route?.name || trip.pickupAddress || 'Route'}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                        Driver: {trip.driver?.name || trip.driverId?.slice(0, 8) || 'Unassigned'}
                        {trip.vehicle && ` · Vehicle: ${trip.vehicle.plateNumber || trip.vehicle.id?.slice(0, 8) || ''}`}
                        {trip.date && ` · ${new Date(trip.date).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                        background: trip.status === 'IN_TRANSIT' ? '#dcfce7' : trip.status === 'BOARDING' ? '#dbeafe' : trip.status === 'ARRIVED_AT_PICKUP' ? '#fef3c7' : '#f3f4f6',
                        color: trip.status === 'IN_TRANSIT' ? '#16a34a' : trip.status === 'BOARDING' ? '#2563eb' : trip.status === 'ARRIVED_AT_PICKUP' ? '#d97706' : '#6b7280',
                      }}>
                        {trip.status?.replace(/_/g, ' ')}
                      </span>
                      {['ARRIVED_AT_PICKUP', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_PICKUP'].includes(trip.status) && (
                        <button
                          onClick={() => handleBoardingVerify(trip.id)}
                          disabled={actionLoading === `boarding-${trip.id}`}
                          style={{ padding: '5px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1 }}
                        >
                          {actionLoading === `boarding-${trip.id}` ? '...' : 'Verify'}
                        </button>
                      )}
                      {trip.status === 'BOARDING' && (
                        <button
                          onClick={() => handleStartTrip(trip.id)}
                          disabled={actionLoading === `start-${trip.id}`}
                          style={{ padding: '5px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1 }}
                        >
                          {actionLoading === `start-${trip.id}` ? '...' : 'Start'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Safety Watch</h3>
            {sosActive.length === 0 ? (
              <div style={{ padding: '16px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>✅</div>
                <p style={{ color: '#10b981', fontSize: 12, fontWeight: 600, margin: '0 0 4px' }}>All clear</p>
                <p style={{ color: '#9ca3af', fontSize: 11, margin: 0 }}>No active safety alerts</p>
              </div>
            ) : (
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {sosActive.map((alert: any, i: number) => (
                  <div key={alert.id || i} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>
                          🚨 {alert.driverName || alert.driverId || 'Driver'}
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                          {alert.message || 'Emergency'} · {alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString() : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => handleSosAcknowledge(alert.id)}
                        disabled={actionLoading === `sos-${alert.id}`}
                        style={{ padding: '4px 10px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 4, fontSize: 10, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading ? 0.6 : 1 }}
                      >
                        {actionLoading === `sos-${alert.id}` ? '...' : 'Ack'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Quick Actions</h3>
            <button
              onClick={handleTriggerSos}
              disabled={actionLoading === 'trigger-sos'}
              style={{ width: '100%', padding: '12px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading === 'trigger-sos' ? 0.6 : 1, marginBottom: 8 }}
            >
              {actionLoading === 'trigger-sos' ? 'Raising Alert...' : 'RAISE SAFETY ALERT'}
            </button>
            <button
              onClick={() => onNavigate?.('sos')}
              style={{ width: '100%', padding: '10px', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              View SOS History
            </button>
          </div>
        </div>
      </div>

      <div style={{ background: '#fef2f2', borderRadius: 12, padding: 20, border: '2px solid #fecaca' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: '#991b1b' }}>SOS Response Protocol</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { step: '1', label: 'Receive Alert', desc: 'SOS notification received' },
            { step: '2', label: 'Locate Driver', desc: 'Check GPS coordinates' },
            { step: '3', label: 'Contact Driver', desc: 'Call immediately' },
            { step: '4', label: 'Escalate', desc: 'Notify control room' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '12px', borderRadius: 8, background: 'white', border: '1px solid #e5e7eb', textAlign: 'center' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e5e7eb', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: 13, fontWeight: 700 }}>{s.step}</div>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
