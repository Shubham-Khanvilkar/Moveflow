'use client';
import { useState, useEffect } from 'react';

import { API_URL } from '../../lib/config';

export default function NavigationPage({ token }: { token: string }) {
  const [trips, setTrips] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/trips?status=IN_TRANSIT,EN_ROUTE_TO_PICKUP,ARRIVED_AT_PICKUP,BOARDING`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : d.data || [];
      setTrips(list);
      if (list.length > 0) setActive(list[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={{ padding: 24, color: '#6b7280' }}>Loading navigation...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>🗺️ Route Navigation</h1>
      <p style={{ color: '#6b7280', marginBottom: 20 }}>Live trip navigation and ETA</p>
      {!active ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>🗺️</div>
          <h3 style={{ color: '#374151', marginTop: 12 }}>No active trip</h3>
          <p style={{ color: '#6b7280' }}>Accept a trip to see navigation.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Current Trip</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Trip Code</span><span style={{ fontWeight: 600 }}>{active.tripCode || active.code || active.id?.slice(0,8)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Status</span><span style={{ padding: '2px 10px', borderRadius: 12, background: '#dbeafe', color: '#2563eb', fontWeight: 600, fontSize: 13 }}>{active.status}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Passengers</span><span style={{ fontWeight: 600 }}>{active.passengerCount || active._count?.passengers || 0}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Scheduled</span><span style={{ fontWeight: 600 }}>{active.scheduledTime || active.date || '-'}</span></div>
            </div>
          </div>
          <div style={{ background: '#1e293b', borderRadius: 12, padding: 20, color: 'white', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📍</div>
              <p style={{ color: '#94a3b8' }}>Map view — integrate Google Maps SDK</p>
              <p style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>Current location: GPS tracking active</p>
            </div>
          </div>
        </div>
      )}
      {trips.length > 1 && (
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Other Active Trips ({trips.length})</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {trips.map((t: any, i: number) => (
              <button key={t.id || i} onClick={() => setActive(t)}
                style={{ padding: '8px 14px', borderRadius: 8, border: active?.id === t.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                  background: active?.id === t.id ? '#eff6ff' : 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {t.tripCode || t.code || `Trip ${i+1}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
