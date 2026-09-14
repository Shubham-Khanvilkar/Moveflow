'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../lib/api-client';

export default function ApprovalsPage({ token }: { token: string }) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filter, setFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<any>(`/trips/bookings?status=${encodeURIComponent(filter)}`);
      setBookings(data?.data || data || []);
    } catch (e: any) {
      setBookings([]);
      setError(e.message || 'Failed to load approval requests');
    }
    setLoading(false);
  }, [token, filter]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const handleDecision = async (bookingId: string, approved: boolean) => {
    setActionLoading(bookingId);
    try {
      await apiRequest(`/trips/bookings/${bookingId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approved }),
      });
      await loadBookings();
    } catch (e: any) {
      setError(e.message || `Failed to ${approved ? 'approve' : 'reject'} booking`);
    } finally { setActionLoading(null); }
  };

  const statusColors: Record<string, { bg: string; fg: string }> = {
    REQUESTED: { bg: '#dbeafe', fg: '#2563eb' }, PENDING_APPROVAL: { bg: '#fef3c7', fg: '#d97706' },
    APPROVED: { bg: '#dcfce7', fg: '#16a34a' }, REJECTED: { bg: '#fee2e2', fg: '#dc2626' },
    DISPATCHING: { bg: '#ede9fe', fg: '#7c3aed' }, ASSIGNED: { bg: '#dbeafe', fg: '#2563eb' },
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>✅ Booking Approvals</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Review and approve/reject transport booking requests</p>
        </div>
        <button onClick={loadBookings} style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>🔄 Refresh</button>
      </div>
      {error && <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 13 }}>{error}</div>}

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f3f4f6', padding: 4, borderRadius: 12 }}>
        {['REQUESTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DISPATCHING'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: filter === s ? 600 : 400,
              background: filter === s ? 'white' : 'transparent', color: filter === s ? '#111827' : '#6b7280',
              boxShadow: filter === s ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading bookings...</div> : bookings.length === 0 ? (
        <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
          <div>No bookings with status: {filter.replace(/_/g, ' ')}</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {bookings.map(b => {
            const sc = statusColors[b.status] || { bg: '#f3f4f6', fg: '#6b7280' };
            return (
              <div key={b.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${sc.fg}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700 }}>{b.bookingCode}</span>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.fg }}>{b.status.replace(/_/g, ' ')}</span>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, background: '#f3f4f6', color: '#6b7280' }}>{b.serviceType}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, fontSize: 13 }}>
                      <div><span style={{ color: '#6b7280' }}>Requester: </span><strong>{b.requester?.name || 'Unknown'}</strong></div>
                      <div><span style={{ color: '#6b7280' }}>Date: </span><strong>{new Date(b.date).toLocaleDateString()}</strong></div>
                      <div><span style={{ color: '#6b7280' }}>Pickup: </span><strong>{b.pickupAddress}</strong></div>
                      <div><span style={{ color: '#6b7280' }}>Drop: </span><strong>{b.dropAddress}</strong></div>
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 8 }}>
                      ⏰ Pickup: {new Date(b.pickupTime).toLocaleTimeString()} · 👥 {b.passengerCount} pax · Created: {new Date(b.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {(b.status === 'REQUESTED' || b.status === 'PENDING_APPROVAL') && (
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => handleDecision(b.id, true)} disabled={actionLoading === b.id}
                        style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: actionLoading === b.id ? 'wait' : 'pointer' }}>
                         {actionLoading === b.id ? 'Processing...' : '✓ Approve'}
                      </button>
                      <button onClick={() => handleDecision(b.id, false)} disabled={actionLoading === b.id}
                        style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: actionLoading === b.id ? 'wait' : 'pointer' }}>
                         {actionLoading === b.id ? 'Processing...' : '✗ Reject'}
                      </button>
                    </div>
                  )}
                  {b.status === 'APPROVED' && (
                    <div style={{ padding: '10px 20px', background: '#dcfce7', color: '#16a34a', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>✅ Ready for Dispatch</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
