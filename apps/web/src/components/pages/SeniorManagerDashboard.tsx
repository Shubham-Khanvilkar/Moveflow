'use client';
import React, { useState, useEffect } from 'react';
import Spinner from '../Spinner';
import { API_URL } from '../../lib/config';

export default function SeniorManagerDashboard({ token, user, onNavigate }: { token: string; user: any; onNavigate?: (id: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_URL}/api/dashboard/kpi`, { headers }).then(r => r.json()).catch(() => ({})),
      fetch(`${API_URL}/api/bookings?status=PENDING&limit=8`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`${API_URL}/api/dashboard/trips?limit=5`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`${API_URL}/api/company-admin/users?limit=20`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([k, b, t, e]) => {
      setData(k.data || k);
      setBookings(b.data || b.bookings || []);
      setTrips(t.data || t.trips || []);
      setEmployees(e.data || e.users || []);
    }).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spinner />;

  const d = data || {};

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Senior Manager Workspace</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Multi-team overview, approvals, cross-site visibility — {user?.name || 'Senior Manager'}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Team Members', value: employees.length, color: '#2563eb', icon: '👤' },
          { label: 'Pending Approvals', value: bookings.length, color: '#ef4444', icon: '⏳' },
          { label: 'Active Trips', value: d.trips?.active ?? 0, color: '#10b981', icon: '🚐' },
          { label: 'Total Bookings', value: d.bookings?.total ?? 0, color: '#8b5cf6', icon: '📅' },
          { label: 'Total Drivers', value: d.drivers?.total ?? 0, color: '#f59e0b', icon: '🧑‍✈️' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${kpi.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>{kpi.label}</span>
              <span style={{ fontSize: 16 }}>{kpi.icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Approval Queue</h3>
          {bookings.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No pending approvals</div>
          ) : (
            bookings.slice(0, 6).map((b: any, i: number) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{b.employeeName || b.user?.name || `Booking ${b.id?.slice(0, 8)}`}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{b.type || 'Booking'} · {b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onNavigate?.('approvals')} style={{ padding: '4px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Approve</button>
                  <button onClick={() => onNavigate?.('approvals')} style={{ padding: '4px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Reject</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Team Activity</h3>
          {trips.length === 0 && bookings.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No recent activity</div>
          ) : (
            trips.slice(0, 6).map((t: any, i: number) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.driverName || t.driver?.name || `Trip ${t.id?.slice(0, 8)}`}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{t.route || t.pickupAddress || ''}</div>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: t.status === 'COMPLETED' ? '#dcfce7' : t.status === 'IN_TRANSIT' ? '#dbeafe' : '#fef3c7', color: t.status === 'COMPLETED' ? '#16a34a' : t.status === 'IN_TRANSIT' ? '#2563eb' : '#d97706' }}>{t.status?.replace(/_/g, ' ') || 'PENDING'}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Approve All Pending', 'View Team Reports', 'Export Team Data', 'Manage Team Members', 'View Trip History'].map((a, i) => (
            <button key={i} onClick={() => onNavigate?.(a.includes('Approve') ? 'approvals' : a.includes('Report') || a.includes('Export') ? 'reports' : a.includes('Team Members') ? 'employees' : 'trips')} style={{ padding: '10px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{a}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
