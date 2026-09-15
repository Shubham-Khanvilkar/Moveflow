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

interface SecurityEvent {
  id: string;
  eventCode: string;
  action: string;
  actorUserId: string | null;
  ipAddress: string | null;
  deviceInfo: string | null;
  result: string;
  riskLevel: string | null;
  oldValue: any;
  newValue: any;
  createdAt: string;
}

interface SecuritySummary {
  total: number;
  byRiskLevel: Record<string, number>;
  topIPs: { ipAddress: string; count: number }[];
  recent24h: number;
}

const RISK_LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  MEDIUM: { bg: '#fefce8', text: '#ca8a04', border: '#fef08a' },
  HIGH: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  CRITICAL: { bg: '#4c1d95', text: '#ffffff', border: '#7c3aed' },
};

const EVENT_LABELS: Record<string, string> = {
  FAILED_LOGIN_INVALID_CREDENTIALS: 'Wrong Password',
  FAILED_LOGIN_USER_NOT_FOUND: 'User Not Found',
  FAILED_LOGIN_ACCOUNT_LOCKED: 'Account Locked',
  BRUTE_FORCE_DETECTED: 'Brute Force',
  SUCCESSFUL_LOGIN: 'Login Success',
  PASSWORD_RESET_REQUESTED: 'Password Reset',
  SUSPICIOUS_ACTIVITY: 'Suspicious Activity',
};

export default function AccessPage({ token }: { token: string }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'roles' | 'matrix' | 'security-events'>('roles');
  const [search, setSearch] = useState('');

  // Security Events state
  const [secEvents, setSecEvents] = useState<SecurityEvent[]>([]);
  const [secLoading, setSecLoading] = useState(true);
  const [secSummary, setSecSummary] = useState<SecuritySummary | null>(null);
  const [secPage, setSecPage] = useState(1);
  const [secTotal, setSecTotal] = useState(0);
  const [secFilter, setSecFilter] = useState<{ riskLevel?: string; eventCode?: string }>({});

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 30000);
    Promise.all([
      fetch(`${API_URL}/api/platform/roles`, { headers, signal: c.signal }).then(r => r.json()),
      fetch(`${API_URL}/api/platform/users`, { headers, signal: c.signal }).then(r => r.json()),
    ]).then(([rolesRes, usersRes]) => {
      clearTimeout(t);
      setRoles(Array.isArray(rolesRes) ? rolesRes : rolesRes.data || []);
      setUsers(Array.isArray(usersRes) ? usersRes : usersRes.data?.data || usersRes.data || []);
    }).catch(() => { clearTimeout(t); }).finally(() => setLoading(false));
  }, [token]);

  const loadSecurityEvents = useCallback(async () => {
    setSecLoading(true);
    try {
      const params = new URLSearchParams({ page: String(secPage), limit: '20' });
      if (secFilter.riskLevel) params.set('riskLevel', secFilter.riskLevel);
      if (secFilter.eventCode) params.set('eventCode', secFilter.eventCode);

      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 30000);
      const [eventsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/platform/security/events?${params}`, { headers, signal: c.signal }).then(r => r.json()),
        fetch(`${API_URL}/api/platform/security/summary`, { headers, signal: c.signal }).then(r => r.json()),
      ]);
      clearTimeout(t);

      setSecEvents(eventsRes.data || []);
      setSecTotal(eventsRes.total || 0);
      setSecSummary(summaryRes);
    } catch {
      setSecEvents([]);
      setSecSummary(null);
    }
    setSecLoading(false);
  }, [token, secPage, secFilter]);

  useEffect(() => {
    if (tab === 'security-events') loadSecurityEvents();
  }, [tab, loadSecurityEvents]);

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
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>🔐 Access Control & Security</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Roles, permissions, user access, and security event monitoring</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'white', padding: 4, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {[
          { key: 'roles', label: '📋 Roles & Permissions' },
          { key: 'matrix', label: '📊 Permission Matrix' },
          { key: 'security-events', label: '🛡️ Security Events' },
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

          {/* Security Events Tab */}
          {tab === 'security-events' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Summary Cards */}
              {secSummary && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                  {[
                    { label: 'Total Events', value: secSummary.total, bg: '#f8fafc', border: '#e2e8f0' },
                    { label: 'Last 24h', value: secSummary.recent24h, bg: '#eff6ff', border: '#bfdbfe' },
                    { label: 'Critical', value: secSummary.byRiskLevel?.CRITICAL || 0, bg: '#4c1d95', border: '#7c3aed', textColor: '#fff' },
                    { label: 'High', value: secSummary.byRiskLevel?.HIGH || 0, bg: '#fef2f2', border: '#fecaca' },
                    { label: 'Medium', value: secSummary.byRiskLevel?.MEDIUM || 0, bg: '#fefce8', border: '#fef08a' },
                    { label: 'Low', value: secSummary.byRiskLevel?.LOW || 0, bg: '#f0fdf4', border: '#bbf7d0' },
                  ].map(card => (
                    <div key={card.label} style={{ background: card.bg, border: `1px solid ${card.border}`, borderRadius: 10, padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, color: card.textColor || '#6b7280', fontWeight: 500, marginBottom: 4 }}>{card.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: card.textColor || '#111827' }}>{card.value}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Top Offending IPs */}
              {secSummary && secSummary.topIPs.length > 0 && (
                <div style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px' }}>⚠️ Top Offending IPs (24h)</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {secSummary.topIPs.map(ip => (
                      <div key={ip.ipAddress} style={{ padding: '6px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 12 }}>
                        <span style={{ fontWeight: 600, color: '#dc2626' }}>{ip.ipAddress}</span>
                        <span style={{ marginLeft: 8, color: '#6b7280' }}>{ip.count} events</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filters */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <select value={secFilter.riskLevel || ''} onChange={e => { setSecFilter(f => ({ ...f, riskLevel: e.target.value || undefined })); setSecPage(1); }}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 12 }}>
                  <option value="">All Risk Levels</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
                <select value={secFilter.eventCode || ''} onChange={e => { setSecFilter(f => ({ ...f, eventCode: e.target.value || undefined })); setSecPage(1); }}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 12 }}>
                  <option value="">All Event Types</option>
                  <option value="FAILED_LOGIN_INVALID_CREDENTIALS">Wrong Password</option>
                  <option value="FAILED_LOGIN_USER_NOT_FOUND">User Not Found</option>
                  <option value="FAILED_LOGIN_ACCOUNT_LOCKED">Account Locked</option>
                  <option value="BRUTE_FORCE_DETECTED">Brute Force</option>
                  <option value="SUCCESSFUL_LOGIN">Successful Login</option>
                </select>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{secTotal} events total</span>
              </div>

              {/* Events Table */}
              <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                {secLoading ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading security events...</div>
                ) : secEvents.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                    <div style={{ fontSize: 36, marginBottom: 8 }}>🛡️</div>
                    <div style={{ fontSize: 14 }}>No security events recorded yet</div>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 11 }}>Time</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 11 }}>Event</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 11 }}>Risk</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 11 }}>IP Address</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 11 }}>Email</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 11 }}>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {secEvents.map(ev => {
                        const rc = RISK_LEVEL_COLORS[ev.riskLevel || 'LOW'] || RISK_LEVEL_COLORS.LOW;
                        const email = ev.oldValue?.email || '—';
                        const desc = ev.newValue?.description || '—';
                        const label = EVENT_LABELS[ev.eventCode] || ev.eventCode;
                        return (
                          <tr key={ev.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#6b7280' }}>
                              {new Date(ev.createdAt).toLocaleString()}
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 500 }}>{label}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: rc.bg, color: rc.text, border: `1px solid ${rc.border}` }}>
                                {ev.riskLevel || 'LOW'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11, color: '#374151' }}>{ev.ipAddress || '—'}</td>
                            <td style={{ padding: '10px 12px', color: '#374151' }}>{email}</td>
                            <td style={{ padding: '10px 12px', color: '#6b7280', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}

                {/* Pagination */}
                {secTotal > 20 && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'center', gap: 8 }}>
                    <button disabled={secPage <= 1} onClick={() => setSecPage(p => p - 1)}
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', cursor: secPage <= 1 ? 'not-allowed' : 'pointer', fontSize: 12, opacity: secPage <= 1 ? 0.5 : 1 }}>
                      Previous
                    </button>
                    <span style={{ padding: '6px 12px', fontSize: 12, color: '#6b7280' }}>
                      Page {secPage} of {Math.ceil(secTotal / 20)}
                    </span>
                    <button disabled={secPage >= Math.ceil(secTotal / 20)} onClick={() => setSecPage(p => p + 1)}
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: 'white', cursor: secPage >= Math.ceil(secTotal / 20) ? 'not-allowed' : 'pointer', fontSize: 12, opacity: secPage >= Math.ceil(secTotal / 20) ? 0.5 : 1 }}>
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
