'use client';
import React, { useState, useEffect } from 'react';

import { API_URL } from '../../lib/config';

export default function RoutesPage({ token }: { token: string }) {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/dashboard/routes`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setRoutes(d.data?.routes || d.data || []))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>🛣️ Route Management</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{routes.length} configured routes</p>
        </div>
        <button onClick={() => alert('Route creation coming soon')} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ New Route</button>
      </div>

      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div> : routes.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🛣️</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>No routes configured</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Create routes for shuttle and nodal transport</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Route Name', 'Origin', 'Destination', 'Stops', 'Distance', 'Est. Time', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {routes.map((r: any) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.name || r.id?.slice(0, 12)}</td>
                  <td style={{ padding: '12px 16px' }}>{r.origin || r.startLocation || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>{r.destination || r.endLocation || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>{r.stopCount || r.stops?.length || 0}</td>
                  <td style={{ padding: '12px 16px' }}>{r.distance ? `${r.distance} km` : '-'}</td>
                  <td style={{ padding: '12px 16px' }}>{r.estimatedTime || r.duration || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: r.status === 'ACTIVE' ? '#f0fdf4' : r.status === 'INACTIVE' ? '#fef3c7' : '#f3f4f6', color: r.status === 'ACTIVE' ? '#15803d' : r.status === 'INACTIVE' ? '#d97706' : '#6b7280' }}>{r.status || 'ACTIVE'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
