'use client';
import { useState, useEffect } from 'react';

import { API_URL } from '../../lib/config';

export default function AccessSimulatorPage({ token }: { token: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchEndpoints();
  }, [token]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch { setUsers([]); }
  };

  const fetchEndpoints = async () => {
    setEndpoints([
      { method: 'GET', path: '/api/v1/bookings', module: 'booking', action: 'view' },
      { method: 'POST', path: '/api/v1/bookings', module: 'booking', action: 'create' },
      { method: 'PATCH', path: '/api/v1/bookings/:id', module: 'booking', action: 'edit' },
      { method: 'DELETE', path: '/api/v1/bookings/:id', module: 'booking', action: 'delete' },
      { method: 'GET', path: '/api/v1/vehicles', module: 'vehicle', action: 'view' },
      { method: 'POST', path: '/api/v1/vehicles', module: 'vehicle', action: 'create' },
      { method: 'GET', path: '/api/v1/drivers', module: 'driver', action: 'view' },
      { method: 'POST', path: '/api/v1/drivers', module: 'driver', action: 'create' },
      { method: 'GET', path: '/api/v1/trips', module: 'trip', action: 'view' },
      { method: 'GET', path: '/api/v1/routes', module: 'route', action: 'view' },
      { method: 'GET', path: '/api/v1/vendors', module: 'vendor', action: 'view' },
      { method: 'GET', path: '/api/v1/incidents', module: 'incident', action: 'view' },
      { method: 'POST', path: '/api/v1/incidents', module: 'incident', action: 'create' },
      { method: 'GET', path: '/api/v1/reports', module: 'report', action: 'view' },
      { method: 'POST', path: '/api/v1/reports/generate', module: 'report', action: 'export' },
      { method: 'GET', path: '/api/v1/billing', module: 'billing', action: 'view' },
      { method: 'GET', path: '/api/v1/gps/vehicles', module: 'tracking', action: 'view' },
      { method: 'GET', path: '/api/v1/gps/geofences', module: 'geofence', action: 'view' },
      { method: 'GET', path: '/api/v1/documents', module: 'document', action: 'view' },
      { method: 'POST', path: '/api/v1/documents', module: 'document', action: 'upload' },
      { method: 'GET', path: '/api/v1/passengers/trip/:id', module: 'booking', action: 'view' },
      { method: 'GET', path: '/api/v1/contacts', module: 'contact', action: 'view' },
      { method: 'GET', path: '/api/v1/vehicle-qr/active', module: 'vehicle', action: 'view' },
      { method: 'GET', path: '/api/dashboard/kpi', module: 'dashboard', action: 'view' },
      { method: 'GET', path: '/api/audit', module: 'audit', action: 'view' },
      { method: 'POST', path: '/api/v1/platform/impersonation/start', module: 'impersonation', action: 'start' },
    ]);
  };

  const simulateAccess = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    const user = users.find((u: any) => u.id === selectedUserId);
    setSelectedUser(user);

    const simResults = endpoints.map(ep => {
      const userPerms = user?.permissions || [];
      const hasPermission = userPerms.some((p: string) => {
        if (p === '*:*' || p === '*') return true;
        if (p === `${ep.module}:manage`) return true;
        if (p === `${ep.module}:*`) return true;
        if (p === `${ep.module}:${ep.action}`) return true;
        return false;
      });

      return {
        ...ep,
        allowed: hasPermission,
        matchingPermissions: userPerms.filter((p: string) => {
          if (p === '*:*' || p === '*') return true;
          if (p === `${ep.module}:manage`) return true;
          if (p === `${ep.module}:*`) return true;
          if (p === `${ep.module}:${ep.action}`) return true;
          return false;
        }),
      };
    });

    setResults(simResults);
    setLoading(false);
  };

  const allowed = results.filter(r => r.allowed).length;
  const denied = results.filter(r => !r.allowed).length;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Access Simulator</h1>
        <p style={{ color: '#6b7280' }}>Simulate API access for any user to verify RBAC permissions</p>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Select User</label>
          <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}>
            <option value="">Choose a user...</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name || u.email} ({u.role || 'No role'})</option>
            ))}
          </select>
        </div>
        <button onClick={simulateAccess} disabled={!selectedUserId || loading}
          style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: !selectedUserId || loading ? 0.5 : 1 }}>
          {loading ? 'Simulating...' : 'Simulate Access'}
        </button>
      </div>

      {selectedUser && (
        <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>User Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, fontSize: 13 }}>
            <div><span style={{ color: '#6b7280' }}>Name:</span> <strong>{selectedUser.name}</strong></div>
            <div><span style={{ color: '#6b7280' }}>Email:</span> <strong>{selectedUser.email}</strong></div>
            <div><span style={{ color: '#6b7280' }}>Role:</span> <strong>{selectedUser.role || 'N/A'}</strong></div>
            <div><span style={{ color: '#6b7280' }}>Permissions:</span> <strong>{(selectedUser.permissions || []).length}</strong></div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#16a34a' }}>{allowed}</div>
              <div style={{ fontSize: 12, color: '#15803d' }}>Allowed</div>
            </div>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#dc2626' }}>{denied}</div>
              <div style={{ fontSize: 12, color: '#b91c1c' }}>Denied</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Method</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Endpoint</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Module</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Action</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Access</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Matching Permission</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} style={{ background: r.allowed ? '#f0fdf4' : '#fef2f2' }}>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>
                      <span style={{ padding: '2px 6px', borderRadius: 4, background: r.method === 'GET' ? '#dbeafe' : r.method === 'POST' ? '#dcfce7' : r.method === 'PATCH' ? '#fef3c7' : '#fecaca', color: r.method === 'GET' ? '#1d4ed8' : r.method === 'POST' ? '#166534' : r.method === 'PATCH' ? '#92400e' : '#991b1b', fontSize: 11, fontWeight: 600 }}>
                        {r.method}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', fontFamily: 'monospace', fontSize: 12 }}>{r.path}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>{r.module}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>{r.action}</td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: r.allowed ? '#dcfce7' : '#fecaca', color: r.allowed ? '#166534' : '#991b1b', fontWeight: 600 }}>
                        {r.allowed ? 'ALLOWED' : 'DENIED'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb', fontSize: 11, color: '#6b7280' }}>
                      {r.matchingPermissions.join(', ') || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
