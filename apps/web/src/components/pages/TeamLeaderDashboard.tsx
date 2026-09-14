'use client';
import React, { useState, useEffect } from 'react';
import Spinner from '../Spinner';
import { API_URL } from '../../lib/config';

export default function TeamLeaderDashboard({ token, user, onNavigate }: { token: string; user: any; onNavigate?: (id: string) => void }) {
  const [data, setData] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_URL}/api/dashboard/kpi`, { headers }).then(r => r.json()).catch(() => ({})),
      fetch(`${API_URL}/api/bookings?status=PENDING&limit=5`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`${API_URL}/api/dashboard/trips?limit=10`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([k, b, t]) => {
      setData(k.data || k);
      setBookings(b.data || b.bookings || []);
      setTrips(t.data || t.trips || []);
    }).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spinner />;

  const d = data || {};
  const todayTrips = trips.filter((t: any) => {
    const d = new Date(t.scheduledTime || t.createdAt);
    return d.toDateString() === new Date().toDateString();
  });

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Team Leader Dashboard</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Daily approvals, team bookings, shift management — {user?.name || 'Team Leader'}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Pending Approvals', value: bookings.length, color: '#ef4444', icon: '⏳' },
          { label: 'Today\'s Trips', value: todayTrips.length, color: '#2563eb', icon: '🚐' },
          { label: 'Total Bookings', value: d.bookings?.total ?? 0, color: '#8b5cf6', icon: '📅' },
          { label: 'Available Drivers', value: d.drivers?.available ?? 0, color: '#10b981', icon: '🟢' },
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
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Today's Approvals</h3>
          {bookings.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No pending approvals</div>
          ) : (
            bookings.slice(0, 5).map((b: any, i: number) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{b.employeeName || b.user?.name || `Booking ${b.id?.slice(0, 8)}`}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{b.type || 'Booking'} · {b.scheduledTime ? new Date(b.scheduledTime).toLocaleTimeString() : ''}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onNavigate?.('approvals')} style={{ padding: '4px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Approve</button>
                  <button onClick={() => onNavigate?.('approvals')} style={{ padding: '4px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Reject</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Today's Trips</h3>
          {todayTrips.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No trips today</div>
          ) : (
            todayTrips.slice(0, 5).map((t: any, i: number) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{t.driverName || t.driver?.name || `Trip ${t.id?.slice(0, 8)}`}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{t.route || t.pickupAddress || ''}</div>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                  background: t.status === 'COMPLETED' ? '#dcfce7' : t.status === 'IN_TRANSIT' ? '#dbeafe' : t.status === 'DISPATCHED' ? '#fef3c7' : '#f3f4f6',
                  color: t.status === 'COMPLETED' ? '#16a34a' : t.status === 'IN_TRANSIT' ? '#2563eb' : t.status === 'DISPATCHED' ? '#d97706' : '#6b7280'
                }}>{t.status?.replace(/_/g, ' ') || 'PENDING'}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Book for Team', 'Approve All Pending', 'View Team Report', 'Manage Schedule'].map((a, i) => (
            <button key={i} onClick={() => onNavigate?.(a.includes('Book') ? 'book' : a.includes('Approve') ? 'approvals' : a.includes('Report') ? 'reports' : 'employee-scheduling')} style={{ padding: '10px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{a}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
