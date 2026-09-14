'use client';
import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../lib/config';

interface Role {
  id: string;
  name: string;
  displayName?: string;
  securityDomain: string;
  hierarchyLevel: number;
  permissions?: { id: string; name: string; resource: string; action: string }[];
}

interface UserWithRoles {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: { id: string; name: string; displayName?: string; securityDomain: string }[];
}

export default function AccessPage({ token }: { token: string }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'roles' | 'matrix'>('roles');
  const [search, setSearch] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/platform/roles`, { headers }).then(r => r.json()),
      fetch(`${API_URL}/api/platform/users`, { headers }).then(r => r.json()),
    ]).then(([rolesRes, usersRes]) => {
      setRoles(Array.isArray(rolesRes) ? rolesRes : rolesRes.data || []);
      setUsers(Array.isArray(usersRes) ? usersRes : usersRes.data?.data || usersRes.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const loadRoleDetails = useCallback(async (roleId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/platform/roles/${roleId}`, { headers });
      const data = await res.json();
      setSelectedRole(data.data || data);
    } catch {}
  }, [token]);

  const filteredRoles = roles.filter(r =>
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  const domainColors: Record<string, { bg: string; text: string }> = {
    NAVIRA_INTERNAL: { bg: '#ede9fe', text: '#7c3aed' },
    CUSTOMER_INTERNAL: { bg: '#dbeafe', text: '#2563eb' },
    VENDOR_EXTERNAL: { bg: '#fef3c7', text: '#d97706' },
    DRIVER_EXTERNAL: { bg: '#dcfce7', text: '#16a34a' },
    GUARD_EXTERNAL: { bg: '#fee2e2', text: '#dc2626' },
  };

  const resourceGroups = ['employee', 'booking', 'trip', 'driver', 'vehicle', 'report', 'billing', 'audit', 'safety', 'schedule', 'team', 'document', 'notification', 'geofence', 'vehicle_type', 'live_status', 'noshow'];
  const actions = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'import'];

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>🔐 Access Control</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Roles, permissions, and user access management</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'white', padding: 4, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {[
          { key: 'roles', label: '📋 Roles & Permissions' },
          { key: 'matrix', label: '📊 Permission Matrix' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.key ? 700 : 400,
              background: tab === t.key ? '#2563eb' : 'transparent', color: tab === t.key ? 'white' : '#6b7280', transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading access control...</div> : (
        <>
          {/* Roles Tab */}
          {tab === 'roles' && (
            <div style={{ display: 'grid', gridTemplateColumns: selectedRole ? '1fr 1.5fr' : '1fr', gap: 16 }}>
              {/* Roles List */}
              <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles..."
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
                <div style={{ maxHeight: 600, overflowY: 'auto' }}>
                  {filteredRoles.map(role => {
                    const dc = domainColors[role.securityDomain] || { bg: '#f3f4f6', text: '#374151' };
                    return (
                      <button key={role.id} onClick={() => { loadRoleDetails(role.id); }}
                        style={{ width: '100%', padding: '12px 16px', border: 'none', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                          background: selectedRole?.id === role.id ? '#eff6ff' : 'white',
                          borderLeft: selectedRole?.id === role.id ? '3px solid #2563eb' : '3px solid transparent' }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{role.displayName || role.name}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                          <span style={{ padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 600, background: dc.bg, color: dc.text }}>{role.securityDomain}</span>
                          <span style={{ fontSize: 10, color: '#9ca3af' }}>Level {role.hierarchyLevel}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Role Details */}
              {selectedRole ? (
                <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>{selectedRole.displayName || selectedRole.name}</h3>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 16px' }}>{selectedRole.securityDomain} · Hierarchy Level {selectedRole.hierarchyLevel}</p>
                  <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px' }}>Permissions ({selectedRole.permissions?.length || 0})</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(selectedRole.permissions || []).map(p => (
                      <span key={p.id || p.name} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', fontWeight: 500 }}>
                        {p.name}
                      </span>
                    ))}
                  </div>
                  {(!selectedRole.permissions || selectedRole.permissions.length === 0) && (
                    <div style={{ fontSize: 13, color: '#9ca3af', padding: 20, textAlign: 'center' }}>No permissions assigned to this role</div>
                  )}
                  <h4 style={{ fontSize: 13, fontWeight: 600, margin: '20px 0 8px' }}>Users with this role</h4>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {users.filter(u => u.roles?.some(r => r.name === selectedRole.name)).slice(0, 10).map(u => (
                      <div key={u.id} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span>
                          <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 8 }}>{u.email}</span>
                        </div>
                        <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: u.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2', color: u.status === 'ACTIVE' ? '#16a34a' : '#dc2626' }}>{u.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
                    <div style={{ fontSize: 16, fontWeight: 600 }}>Select a role to view details</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Permission Matrix Tab */}
          {tab === 'matrix' && (
            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'auto' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Permission Matrix</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left', background: '#f9fafb', position: 'sticky', left: 0, zIndex: 1 }}>Resource</th>
                    {actions.map(a => (
                      <th key={a} style={{ padding: '8px 12px', textAlign: 'center', background: '#f9fafb', textTransform: 'uppercase', fontSize: 10 }}>{a}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {resourceGroups.map(resource => (
                    <tr key={resource} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600, textTransform: 'capitalize', position: 'sticky', left: 0, background: 'white' }}>{resource.replace(/_/g, ' ')}</td>
                      {actions.map(action => {
                        const hasPermission = selectedRole?.permissions?.some(p =>
                          p.resource?.toLowerCase() === resource && p.action?.toLowerCase() === action
                        ) || false;
                        return (
                          <td key={action} style={{ padding: '8px 12px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', width: 20, height: 20, borderRadius: 4, lineHeight: '20px', fontSize: 12,
                              background: hasPermission ? '#dcfce7' : '#f3f4f6', color: hasPermission ? '#16a34a' : '#d1d5db' }}>
                              {hasPermission ? '✓' : '—'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: 12, fontSize: 11, color: '#6b7280' }}>
                Select a role from the Roles tab to see its permission matrix highlighted.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
