'use client';
import { useState, useEffect } from 'react';
import { API_URL } from '../../lib/config';

export default function PerformancePage({ token }: { token: string }) {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/dashboards/analytics/driver-performance?days=30`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setDrivers(d.data?.drivers || d.drivers || d.data || []))
      .catch(() => setError('Failed to load data')).finally(() => setLoading(false));
  }, [token]);

  const avgRating = drivers.length > 0 ? (drivers.reduce((s: number, d: any) => s + (d.rating || 0), 0) / drivers.length).toFixed(1) : '—';
  const avgTrips = drivers.length > 0 ? Math.round(drivers.reduce((s: number, d: any) => s + (d.totalTrips || d.trips || 0), 0) / drivers.length) : 0;

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Vendor Performance</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Track driver/vendor SLA, compliance and trip metrics</p>

      {error && <div style={{ padding: '10px 16px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Drivers', value: drivers.length, color: '#2563eb' },
          { label: 'Avg Rating', value: avgRating, color: '#f59e0b' },
          { label: 'Avg Trips/Driver', value: avgTrips, color: '#10b981' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: `${kpi.color}08`, border: `1px solid ${kpi.color}20`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {loading ? <p style={{ color: '#6b7280' }}>Loading...</p> : drivers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>📈</div>
          <h3 style={{ color: '#374151', marginTop: 12 }}>No performance data</h3>
          <p style={{ color: '#6b7280' }}>Driver performance data will appear here once trips are completed.</p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Driver', 'Trips', 'Rating', 'On-Time %', 'Compliance'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drivers.map((d: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{d.firstName || d.name || `Driver ${i + 1}`}</td>
                  <td style={{ padding: '12px 16px' }}>{d.totalTrips || d.trips || 0}</td>
                  <td style={{ padding: '12px 16px' }}>⭐ {d.rating?.toFixed(1) || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>{d.onTimePercentage || d.onTime || '—'}%</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: d.compliance === 'HIGH' || (d.complianceScore || 0) >= 80 ? '#dcfce7' : '#fef3c7', color: d.compliance === 'HIGH' || (d.complianceScore || 0) >= 80 ? '#16a34a' : '#d97706' }}>{d.compliance || d.complianceScore || '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
