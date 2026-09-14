'use client';
import { useState, useEffect } from 'react';

import { API_URL } from '../../lib/config';

export default function NotificationsPage({ token }: { token: string }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(`Failed to fetch notifications (${res.status})`);
      const d = await res.json();
      setNotifications(Array.isArray(d) ? d : d.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch {
      // silently fail - notification stays unread
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.read;
    return (n.category || n.type || '').toLowerCase() === filter;
  });

  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      OPERATIONS: '🚐', SAFETY: '🚨', COMPLIANCE: '📋', BILLING: '💰',
      SYSTEM: '⚙️', REPORTS: '📊', TRIP: '🗺️', BOOKING: '📅'
    };
    return icons[type] || '🔔';
  };

  const getSeverity = (sev: string) => {
    const colors: Record<string, string> = {
      HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#3b82f6', INFO: '#6b7280'
    };
    return colors[sev] || '#6b7280';
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827' }}>🔔 Notifications</h1>
          <p style={{ color: '#6b7280', marginTop: 4 }}>Stay updated on transport operations</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'unread', 'safety', 'operations', 'billing'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '6px 14px', borderRadius: 8, border: filter === f ? '2px solid #2563eb' : '1px solid #e5e7eb',
                background: filter === f ? '#eff6ff' : 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>
              {f}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Loading notifications...</div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 40, background: '#fef2f2', borderRadius: 12, border: '1px solid #fecaca' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h3 style={{ color: '#991b1b', marginBottom: 8 }}>Error loading notifications</h3>
          <p style={{ color: '#dc2626', marginBottom: 16 }}>{error}</p>
          <button onClick={fetchNotifications}
            style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            Retry
          </button>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔔</div>
          <h3 style={{ color: '#374151', marginBottom: 8 }}>No notifications yet</h3>
          <p style={{ color: '#6b7280' }}>You&apos;ll see alerts for trips, safety, compliance and billing here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredNotifications.map((n: any, i: number) => (
            <div key={n.id || i}
              onClick={() => !n.read && markAsRead(n.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
              background: n.read ? 'white' : '#eff6ff', border: '1px solid #e5e7eb', borderRadius: 10, cursor: 'pointer',
              transition: 'background 0.15s' }}>
              <span style={{ fontSize: 24 }}>{getIcon(n.category || n.type || 'INFO')}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{n.title || n.message}</div>
                <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{n.message}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}</span>
                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: getSeverity(n.severity || 'INFO') + '20',
                  color: getSeverity(n.severity || 'INFO'), fontWeight: 600 }}>{n.severity || 'INFO'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
