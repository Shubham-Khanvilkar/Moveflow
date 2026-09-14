'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../lib/config';

const STATE_COLORS: Record<string, { bg: string; fg: string }> = {
  SCHEDULED: { bg: '#f3f4f6', fg: '#6b7280' }, DISPATCHED: { bg: '#dbeafe', fg: '#2563eb' },
  DRIVER_ACCEPTED: { bg: '#dbeafe', fg: '#2563eb' }, EN_ROUTE_TO_PICKUP: { bg: '#fef3c7', fg: '#d97706' },
  ARRIVED_AT_PICKUP: { bg: '#fef3c7', fg: '#d97706' }, BOARDING: { bg: '#ede9fe', fg: '#7c3aed' },
  IN_TRANSIT: { bg: '#dcfce7', fg: '#10b981' }, ARRIVED_AT_DROP: { bg: '#dcfce7', fg: '#10b981' },
  COMPLETED: { bg: '#dcfce7', fg: '#16a34a' }, CANCELLED: { bg: '#fee2e2', fg: '#dc2626' },
  NO_SHOW: { bg: '#fee2e2', fg: '#dc2626' }, BREAKDOWN_REPORTED: { bg: '#fef3c7', fg: '#d97706' },
  DELAYED: { bg: '#fef3c7', fg: '#d97706' },
};

const NEXT_ACTIONS: Record<string, { action: string; label: string; color: string }[]> = {
  SCHEDULED: [{ action: 'DISPATCH', label: '🚀 Dispatch', color: '#2563eb' }],
  DISPATCHED: [{ action: 'DRIVER_ACCEPT', label: '✅ Driver Accept', color: '#10b981' }, { action: 'DRIVER_DECLINE', label: '❌ Decline', color: '#ef4444' }],
  DRIVER_ACCEPTED: [{ action: 'DRIVER_EN_ROUTE', label: '🚗 En Route', color: '#2563eb' }],
  EN_ROUTE_TO_PICKUP: [{ action: 'ARRIVE_AT_PICKUP', label: '📍 Arrived', color: '#f59e0b' }],
  ARRIVED_AT_PICKUP: [{ action: 'START_BOARDING', label: '🎫 Boarding', color: '#8b5cf6' }, { action: 'MARK_NO_SHOW', label: '🚫 No Show', color: '#ef4444' }],
  BOARDING: [{ action: 'START_TRIP', label: '▶️ Start Trip', color: '#10b981' }],
  IN_TRANSIT: [{ action: 'ARRIVE_AT_DROP', label: '🏁 Arrive', color: '#10b981' }],
  ARRIVED_AT_DROP: [{ action: 'COMPLETE_TRIP', label: '✅ Complete', color: '#16a34a' }],
};

const STEPS = ['SCHEDULED', 'DISPATCHED', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'BOARDING', 'IN_TRANSIT', 'ARRIVED_AT_DROP', 'COMPLETED'];

export default function TripsPage({ token }: { token: string }) {
  const [trips, setTrips] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState<string | null>(null);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter ? `${API_URL}/api/trips?status=${filter}` : `${API_URL}/api/trips`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setTrips(data.data || []);
    } catch { setTrips([]); }
    setLoading(false);
  }, [token, filter]);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const handleTransition = async (tripId: string, action: string) => {
    setTransitioning(tripId);
    try {
      await fetch(`${API_URL}/api/trips/${tripId}/transition`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      loadTrips();
    } catch { /* ignored */ }
    setTransitioning(null);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>🗺️ Trip Lifecycle</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Track and manage trip status from scheduling to completion</p>
        </div>
        <button onClick={loadTrips} style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>🔄 Refresh</button>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f3f4f6', padding: 4, borderRadius: 12, overflowX: 'auto' }}>
        <button onClick={() => setFilter('')} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filter === '' ? 600 : 400, background: filter === '' ? 'white' : 'transparent', whiteSpace: 'nowrap' }}>ALL</button>
        {['SCHEDULED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: filter === s ? 600 : 400, background: filter === s ? 'white' : 'transparent', whiteSpace: 'nowrap' }}>{s.replace(/_/g, ' ')}</button>
        ))}
      </div>

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading trips...</div> : trips.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🚐</div>
          <div>No trips found. Dispatch a booking to create a trip.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {trips.map(trip => {
            const sc = STATE_COLORS[trip.status] || { bg: '#f3f4f6', fg: '#6b7280' };
            const actions = NEXT_ACTIONS[trip.status] || [];
            const stepIdx = STEPS.indexOf(trip.status);
            return (
              <div key={trip.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{trip.tripCode}</span>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.fg }}>{trip.status.replace(/_/g, ' ')}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#374151' }}>
                      🧑‍✈️ {trip.driver?.name || 'Unassigned'} · 🚗 {trip.vehicle?.registrationNo || 'Unassigned'} · 📅 {new Date(trip.date).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>📍 {trip.pickupAddress} → 🏁 {trip.dropAddress}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {actions.map(a => (
                      <button key={a.action} onClick={() => handleTransition(trip.id, a.action)} disabled={transitioning === trip.id}
                        style={{ padding: '8px 14px', background: a.color, color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: transitioning === trip.id ? 'wait' : 'pointer' }}>
                        {transitioning === trip.id ? '...' : a.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Progress Bar */}
                {stepIdx >= 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 8 }}>
                    {STEPS.map((step, i) => (
                      <React.Fragment key={step}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: 20, height: 20, borderRadius: '50%', background: i <= stepIdx ? '#10b981' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', fontWeight: 700 }}>
                            {i < stepIdx ? '✓' : i === stepIdx ? (i + 1) : ''}
                          </div>
                          <div style={{ fontSize: 8, color: i <= stepIdx ? '#10b981' : '#9ca3af', marginTop: 2, textAlign: 'center', maxWidth: 60 }}>{step.replace(/_/g, ' ').toLowerCase()}</div>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div style={{ height: 2, flex: 1, background: i < stepIdx ? '#10b981' : '#e5e7eb', marginBottom: 14 }} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
