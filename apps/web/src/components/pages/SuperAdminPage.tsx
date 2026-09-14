'use client';
import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../lib/config';
import SubscriptionsTab from '../admin/SubscriptionsTab';

interface PlatformStats {
  employees: { total: number };
  drivers: { total: number; available: number };
  vehicles: { total: number };
  trips: { total: number; active: number; today: number };
  bookings: { total: number };
  vendors: { total: number };
  routes: { total: number };
  incidents: { total: number; open: number };
  audit: { total: number };
  shifts: { total: number };
  sites: { total: number };
  users: { total: number };
  roles: { total: number };
  permissions: { total: number };
}

interface Company { id: string; name: string; code: string; status: string; city?: string; country?: string; createdAt: string; }
interface V8User { id: string; email: string; name: string; status: string; roles: string[]; companyId: string; }
interface V8Role { id: string; name: string; displayName?: string; securityDomain: string; hierarchyLevel: number; _count: { permissions: number; assignments: number }; }

export default function SuperAdminPage({ token }: { token: string }) {
  const [tab, setTab] = useState<'stats' | 'companies' | 'users' | 'roles' | 'simulator' | 'subscriptions'>('stats');
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<V8User[]>([]);
  const [roles, setRoles] = useState<V8Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateCompany, setShowCreateCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', code: '', legalName: '', contactEmail: '', contactPhone: '', country: 'India', city: '' });
  const [creatingCompany, setCreatingCompany] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);
  const [simUserId, setSimUserId] = useState('');
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/platform/dashboard/kpi`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Failed to load stats (${res.status})`);
      const d = await res.json();
      setStats(d.data ?? d);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Failed to load platform stats');
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    if (tab === 'stats') {
      fetchStats().finally(() => setLoading(false));
      return;
    }

    const endpoint = tab === 'companies' ? '/api/platform/companies' : tab === 'users' ? '/api/platform/users' : tab === 'roles' ? '/api/platform/roles' : null;
    if (!endpoint) { setLoading(false); return; }

    fetch(`${API_URL}${endpoint}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error(`Request failed (${r.status})`);
        return r.json();
      })
      .then(d => {
        if (tab === 'companies') setCompanies(d.data?.data || d.data || []);
        else if (tab === 'users') setUsers(d.data?.data || d.data || []);
        else if (tab === 'roles') setRoles(d.data || d || []);
        setError(null);
      })
      .catch((e: any) => setError(e.message || 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [tab, token, fetchStats]);

  const createCompany = async () => {
    setCreatingCompany(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/platform/companies`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(newCompany) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Create failed (${res.status})`);
      }
      const d = await res.json();
      if (d.success) {
        setShowCreateCompany(false);
        setCompanies([...companies, d.data]);
        setNewCompany({ name: '', code: '', legalName: '', contactEmail: '', contactPhone: '', country: 'India', city: '' });
      }
    } catch (e: any) {
      setError(e.message || 'Failed to create company');
    } finally {
      setCreatingCompany(false);
    }
  };

  const simulateAccess = async () => {
    if (!simUserId.trim()) { setSimError('Enter a User ID'); return; }
    setSimLoading(true);
    setSimError(null);
    setSimResult(null);
    try {
      const res = await fetch(`${API_URL}/api/platform/access-simulator/${encodeURIComponent(simUserId)}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Simulator failed (${res.status})`);
      }
      const d = await res.json();
      setSimResult(d.data ?? d);
    } catch (e: any) {
      setSimError(e.message || 'Failed to simulate access');
    } finally {
      setSimLoading(false);
    }
  };

  const tabs = [
    { key: 'stats', label: 'Stats', icon: '📊' },
    { key: 'companies', label: 'Companies', icon: '🏢' },
    { key: 'subscriptions', label: 'Subscriptions', icon: '💳' },
    { key: 'users', label: 'Users', icon: '👥' },
    { key: 'roles', label: 'Roles & Permissions', icon: '🔐' },
    { key: 'simulator', label: 'Access Simulator', icon: '🧪' },
  ];

  const statusColor = (s: string) => {
    if (s === 'ACTIVE') return { bg: '#dcfce7', fg: '#16a34a' };
    if (s === 'SUSPENDED' || s === 'INACTIVE') return { bg: '#fee2e2', fg: '#dc2626' };
    return { bg: '#fef3c7', fg: '#d97706' };
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>⚙️</div>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Platform Control Center</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Super Admin — Platform Administration</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f3f4f6', padding: 4, borderRadius: 12 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)} style={{ padding: '10px 16px', borderRadius: 8, border: 'none', background: tab === t.key ? 'white' : 'transparent', boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t.key ? 600 : 400, color: tab === t.key ? '#111827' : '#6b7280' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Error banner */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#991b1b' }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* Stats Tab */}
      {tab === 'stats' && !loading && stats && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Platform Overview</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Users', value: stats.users.total, color: '#6366f1' },
              { label: 'Employees', value: stats.employees.total, color: '#3b82f6' },
              { label: 'Drivers', value: stats.drivers.total, color: '#10b981', sub: `${stats.drivers.available} available` },
              { label: 'Vehicles', value: stats.vehicles.total, color: '#f59e0b' },
              { label: 'Trips (Total)', value: stats.trips.total, color: '#8b5cf6', sub: `${stats.trips.active} active` },
              { label: 'Trips (Today)', value: stats.trips.today, color: '#06b6d4' },
              { label: 'Bookings', value: stats.bookings.total, color: '#ec4899' },
              { label: 'Vendors', value: stats.vendors.total, color: '#f97316' },
              { label: 'Routes', value: stats.routes.total, color: '#14b8a6' },
              { label: 'Incidents', value: stats.incidents.total, color: '#ef4444', sub: `${stats.incidents.open} open` },
              { label: 'Sites', value: stats.sites.total, color: '#84cc16' },
              { label: 'Roles', value: stats.roles.total, color: '#a855f7' },
              { label: 'Permissions', value: stats.permissions.total, color: '#64748b' },
            ].map(card => (
              <div key={card.label} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{card.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: card.color }}>{card.value.toLocaleString()}</div>
                {card.sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{card.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for stats */}
      {tab === 'stats' && !loading && !stats && !error && (
        <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
          <p style={{ fontSize: 14 }}>No platform stats available.</p>
        </div>
      )}

      {/* Companies Tab */}
      {tab === 'companies' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>All Companies ({companies.length})</h3>
            <button onClick={() => setShowCreateCompany(true)} style={{ padding: '10px 20px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Create Company</button>
          </div>

          {showCreateCompany && (
            <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 16, border: '2px solid #6366f1' }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 16px' }}>Create Company — Super Admin Only</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { key: 'name', label: 'Legal Name *' }, { key: 'code', label: 'Company Code *' },
                  { key: 'legalName', label: 'Display Name' }, { key: 'contactEmail', label: 'Contact Email' },
                  { key: 'contactPhone', label: 'Contact Phone' }, { key: 'city', label: 'City' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4, display: 'block' }}>{f.label}</label>
                    <input value={(newCompany as any)[f.key]} onChange={e => setNewCompany({ ...newCompany, [f.key]: e.target.value })} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={createCompany} disabled={creatingCompany} style={{ padding: '10px 20px', background: creatingCompany ? '#a5b4fc' : '#10b981', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: creatingCompany ? 'not-allowed' : 'pointer' }}>
                  {creatingCompany ? 'Creating...' : 'Create Company'}
                </button>
                <button onClick={() => setShowCreateCompany(false)} style={{ padding: '10px 20px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}

          {companies.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280', background: 'white', borderRadius: 12 }}>
              <p style={{ fontSize: 14, margin: 0 }}>No companies found. Create one to get started.</p>
            </div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {companies.map(c => {
              const sc = statusColor(c.status);
              return (
                <div key={c.id} style={{ background: 'white', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{c.code} · {c.city || 'N/A'} · {c.country || 'India'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.fg }}>{c.status}</span>
                    <button style={{ padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Edit</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {tab === 'users' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Platform Users ({users.length})</h3>

          {users.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280', background: 'white', borderRadius: 12 }}>
              <p style={{ fontSize: 14, margin: 0 }}>No users found.</p>
            </div>
          )}

          <div style={{ display: 'grid', gap: 8 }}>
            {users.map(u => {
              const sc = statusColor(u.status);
              return (
                <div key={u.id} style={{ background: 'white', borderRadius: 12, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{u.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {(u.roles || []).map(r => (
                      <span key={r} style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#ede9fe', color: '#7c3aed' }}>{r}</span>
                    ))}
                    <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.fg }}>{u.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {tab === 'roles' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Role Catalogue ({roles.length} roles)</h3>

          {roles.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280', background: 'white', borderRadius: 12 }}>
              <p style={{ fontSize: 14, margin: 0 }}>No roles found.</p>
            </div>
          )}

          {['PLATFORM_INTERNAL', 'CUSTOMER_INTERNAL', 'VENDOR_EXTERNAL', 'DRIVER_EXTERNAL', 'GUARD_EXTERNAL'].map(domain => {
            const domainRoles = roles.filter(r => r.securityDomain === domain);
            if (domainRoles.length === 0) return null;
            return (
              <div key={domain} style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{domain.replace(/_/g, ' ')} ({domainRoles.length})</h4>
                <div style={{ display: 'grid', gap: 6 }}>
                  {domainRoles.map(r => (
                    <div key={r.id} style={{ background: 'white', borderRadius: 8, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                      <div>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{r.displayName || r.name}</span>
                        <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>L{r.hierarchyLevel}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#6b7280' }}>
                        <span>🔑 {r._count?.permissions || 0} perms</span>
                        <span>👤 {r._count?.assignments || 0} users</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Access Simulator Tab */}
      {tab === 'simulator' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px' }}>Access Simulator</h3>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 12px' }}>Enter a User ID to preview their effective access, roles, permissions, and scope.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={simUserId} onChange={e => setSimUserId(e.target.value)} onKeyDown={e => e.key === 'Enter' && simulateAccess()} placeholder="User ID (e.g. user_admin_001)" style={{ flex: 1, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }} />
              <button onClick={simulateAccess} disabled={simLoading} style={{ padding: '10px 20px', background: simLoading ? '#a5b4fc' : '#6366f1', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: simLoading ? 'not-allowed' : 'pointer' }}>
                {simLoading ? 'Simulating...' : 'Simulate'}
              </button>
            </div>
          </div>

          {simError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 13, color: '#991b1b' }}>{simError}</span>
            </div>
          )}

          {!simResult && !simLoading && !simError && (
            <div style={{ textAlign: 'center', padding: 40, color: '#6b7280', background: 'white', borderRadius: 12 }}>
              <p style={{ fontSize: 14, margin: 0 }}>Enter a User ID and click Simulate to see their effective access.</p>
            </div>
          )}

          {simResult && (
            <div style={{ background: 'white', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
                <div><div style={{ fontSize: 12, color: '#6b7280' }}>Name</div><div style={{ fontSize: 15, fontWeight: 600 }}>{simResult.name}</div></div>
                <div><div style={{ fontSize: 12, color: '#6b7280' }}>Email</div><div style={{ fontSize: 15, fontWeight: 600 }}>{simResult.email}</div></div>
                <div><div style={{ fontSize: 12, color: '#6b7280' }}>Security Domain</div><div style={{ fontSize: 15, fontWeight: 600, color: simResult.domain === 'PLATFORM_INTERNAL' ? '#7c3aed' : '#2563eb' }}>{simResult.domain}</div></div>
                <div><div style={{ fontSize: 12, color: '#6b7280' }}>Status</div><div style={{ fontSize: 15, fontWeight: 600 }}>{simResult.status}</div></div>
              </div>
              <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Assigned Roles ({(simResult.roles || []).length})</h4>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {(simResult.roles || []).map((r: any) => (
                  <span key={r.id} style={{ padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: r.securityDomain === 'PLATFORM_INTERNAL' ? '#ede9fe' : r.securityDomain === 'VENDOR_EXTERNAL' ? '#fef3c7' : r.securityDomain === 'DRIVER_EXTERNAL' ? '#ffedd5' : '#dbeafe', color: r.securityDomain === 'PLATFORM_INTERNAL' ? '#7c3aed' : r.securityDomain === 'VENDOR_EXTERNAL' ? '#d97706' : r.securityDomain === 'DRIVER_EXTERNAL' ? '#ea580c' : '#2563eb' }}>
                    {r.displayName || r.name} <span style={{ fontSize: 10, opacity: 0.7 }}>L{r.hierarchyLevel}</span>
                  </span>
                ))}
              </div>
              <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>Effective Permissions ({(simResult.effectivePermissions || []).length})</h4>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(simResult.effectivePermissions || []).map((p: any) => (
                  <span key={p.name} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>{p.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subscriptions Tab */}
      {tab === 'subscriptions' && (
        <SubscriptionsTab token={token} />
      )}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 8 }}>
          <div style={{ width: 20, height: 20, border: '3px solid #e5e7eb', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 13, color: '#6b7280' }}>Loading...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      )}
    </div>
  );
}
