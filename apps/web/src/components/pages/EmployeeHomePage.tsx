'use client';
import React, { useState, useEffect } from 'react';
import Spinner from '../Spinner';
import { API_URL } from '../../lib/config';

export default function EmployeeHomePage({ token, user, onNavigate }: { token: string; user: any; onNavigate?: (id: string) => void }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_URL}/api/bookings?limit=5`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`${API_URL}/api/trips?limit=5`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`${API_URL}/api/transport-expenses/my`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`${API_URL}/api/notifications?limit=5`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([b, t, e, n]) => {
      setBookings(b.data || b.bookings || []);
      setTrips(t.data || t.trips || []);
      setExpenses(e.data || e.expenses || []);
      setNotifications(n.data || n.notifications || []);
    }).finally(() => setLoading(false));
  }, [token]);

  const activeBookings = bookings.filter((b: any) => b.status === 'CONFIRMED' || b.status === 'PENDING').length;
  const todayTrip = trips.find((t: any) => {
    const d = new Date(t.scheduledTime || t.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });
  const pendingExpenses = expenses.filter((e: any) => e.status === 'DRAFT' || e.status === 'SUBMITTED').length;
  const unreadNotifs = notifications.filter((n: any) => !n.read).length;

  if (loading) return <Spinner />;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Welcome, {user?.name || 'Employee'}</h2>
        <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Your personal transport dashboard</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'My Bookings', value: activeBookings, color: '#2563eb', icon: '📅' },
          { label: 'Today\'s Trip', value: todayTrip ? 'Scheduled' : 'None', color: todayTrip ? '#10b981' : '#9ca3af', icon: '🚐' },
          { label: 'Pending Expenses', value: pendingExpenses, color: '#f59e0b', icon: '💳' },
          { label: 'Notifications', value: unreadNotifs, color: '#8b5cf6', icon: '🔔' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${kpi.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{kpi.label}</span>
              <span style={{ fontSize: 20 }}>{kpi.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Book Transport', icon: '➕', color: '#2563eb', page: 'book' },
              { label: 'View My Trips', icon: '🗺️', color: '#10b981', page: 'my-trips' },
              { label: 'Submit Expense', icon: '💳', color: '#f59e0b', page: 'expenses' },
              { label: 'Notifications', icon: '🔔', color: '#8b5cf6', page: 'notifications' },
            ].map((action, i) => (
              <button key={i} onClick={() => onNavigate?.(action.page)} style={{ padding: '16px 12px', borderRadius: 10, border: `2px solid ${action.color}20`, background: `${action.color}08`, cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{action.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: action.color }}>{action.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Recent Activity</h3>
          {notifications.length === 0 && bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 13 }}>No recent activity</div>
          ) : (
            <>
              {bookings.slice(0, 3).map((b: any, i: number) => (
                <div key={`b-${i}`} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12, display: 'flex', gap: 8 }}>
                  <span>📅</span>
                  <span>Booking {b.status || ''} — {b.pickupAddress || b.route || 'Route'}</span>
                </div>
              ))}
              {notifications.slice(0, 3).map((n: any, i: number) => (
                <div key={`n-${i}`} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 12, display: 'flex', gap: 8 }}>
                  <span>🔔</span>
                  <span>{n.message || n.title || 'Notification'}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
