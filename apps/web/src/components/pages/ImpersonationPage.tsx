'use client';
import { useState, useEffect } from 'react';

import { API_URL } from '../../lib/config';

export default function ImpersonationPage({ token }: { token: string }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);
  const [targetUserId, setTargetUserId] = useState('');
  const [reason, setReason] = useState('');
  const [starting, setStarting] = useState(false);
  const [activeSession, setActiveSession] = useState<any>(null);

  useEffect(() => {
    fetchSessions();
    fetchUsers();
  }, [token]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/platform/impersonation/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : data.sessions || []);
      const active = (Array.isArray(data) ? data : data.sessions || []).find((s: any) => s.status === 'ACTIVE');
      setActiveSession(active || null);
    } catch { setSessions([]); }
    setLoading(false);
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch { setUsers([]); }
  };

  const startImpersonation = async () => {
    if (!targetUserId || !reason) return;
    setStarting(true);
    try {
      await fetch(`${API_URL}/api/v1/platform/impersonation/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetUserId, reason }),
      });
      setShowStartModal(false);
      setTargetUserId('');
      setReason('');
      fetchSessions();
    } catch (err) {
      alert('Failed to start impersonation');
    }
    setStarting(false);
  };

  const endImpersonation = async (sessionId: string) => {
    if (!confirm('End impersonation session?')) return;
    try {
      await fetch(`${API_URL}/api/v1/platform/impersonation/${sessionId}/end`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setActiveSession(null);
      fetchSessions();
    } catch (err) {
      alert('Failed to end impersonation');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Impersonation</h1>
          <p style={{ color: '#6b7280' }}>Assume user context for support and debugging. All actions are audited.</p>
        </div>
        <button onClick={() => setShowStartModal(true)} disabled={!!activeSession}
          style={{ padding: '8px 16px', background: activeSession ? '#9ca3af' : '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: activeSession ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
          {activeSession ? 'Session Active' : 'Start Impersonation'}
        </button>
      </div>

      {activeSession && (
        <div style={{ background: '#fef2f2', border: '2px solid #dc2626', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: '#dc2626', fontWeight: 700, marginBottom: 4 }}>Active Impersonation Session</h3>
              <p style={{ color: '#991b1b', fontSize: 13 }}>You are currently impersonating a user. All actions are being recorded.</p>
              <p style={{ color: '#991b1b', fontSize: 12, marginTop: 4 }}>Expires: {activeSession.expiresAt ? new Date(activeSession.expiresAt).toLocaleString() : 'N/A'}</p>
            </div>
            <button onClick={() => endImpersonation(activeSession.id)}
              style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
              End Session
            </button>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: '#6b7280' }}>Loading...</p> : sessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>👤</div>
          <h3 style={{ color: '#374151', marginTop: 12 }}>No impersonation sessions</h3>
          <p style={{ color: '#6b7280' }}>Start an impersonation to assume a user&apos;s context.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Started</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Operator</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Target</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Reason</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Status</th>
                <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s: any, i: number) => (
                <tr key={s.id || i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>
                    {s.startedAt ? new Date(s.startedAt).toLocaleString() : '-'}
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 12 }}>
                    {s.operatorUserId?.slice(0, 8)}...
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 12 }}>
                    {s.targetUserId?.slice(0, 8)}...
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: 12 }}>
                    {s.reason || '-'}
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 6, background: s.status === 'ACTIVE' ? '#fef2f2' : '#f0fdf4', color: s.status === 'ACTIVE' ? '#dc2626' : '#16a34a', fontSize: 12, fontWeight: 600 }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>
                    {s.status === 'ACTIVE' && (
                      <button onClick={() => endImpersonation(s.id)}
                        style={{ padding: '4px 8px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
                        End
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showStartModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: 400, maxWidth: '90%' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Start Impersonation</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Target User</label>
              <select value={targetUserId} onChange={e => setTargetUserId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}>
                <option value="">Select user...</option>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Reason (required)</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Explain why impersonation is needed..."
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowStartModal(false)} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer', background: 'white' }}>Cancel</button>
              <button onClick={startImpersonation} disabled={starting || !targetUserId || !reason}
                style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: starting || !targetUserId || !reason ? 0.5 : 1 }}>
                {starting ? 'Starting...' : 'Start'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
