'use client';
import React, { useState, useEffect, useCallback } from 'react';

import { apiGet, apiPost, apiRequest, ApiError } from '../../lib/api-client';

interface Owner {
  id: string;
  name: string;
  email: string;
  status: string;
  lastLoginAt: string | null;
  role: { name: string; displayName: string; hierarchyLevel: number } | null;
}

interface AuditEntry {
  id: string;
  action: string;
  createdAt: string;
  userId: string;
  newValue: string | null;
}

interface DashboardStats {
  employees: { total: number };
  drivers: { total: number; available: number };
  vehicles: { total: number };
  trips: { total: number; active: number; today: number };
  bookings: { total: number };
  vendors: { total: number };
  routes: { total: number };
  incidents: { total: number; open: number };
  users: { total: number };
  sites: { total: number };
}

const TIER_COLORS: Record<string, string> = {
  SAAS_OWNER: '#7c3aed',
  MOVEINSYNC_OWNER: '#2563eb',
};

export default function OwnerManagementPage({ token }: { token: string }) {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [auditFor, setAuditFor] = useState<Owner | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', tier: 'MOVEINSYNC_OWNER', password: '' });

  const fetchOwners = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<Owner[]>('/platform/owners');
      setOwners(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to connect to server');
    }
    setLoading(false);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiGet<DashboardStats>('/platform/dashboard/kpi');
      setStats(data);
    } catch {
      // Non-critical — don't block the page
    }
  }, []);

  useEffect(() => {
    fetchOwners();
    fetchStats();
  }, [fetchOwners, fetchStats]);

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      await apiPost('/platform/owners', form);
      setShowCreate(false);
      setForm({ name: '', email: '', phone: '', tier: 'MOVEINSYNC_OWNER', password: '' });
      fetchOwners();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create owner');
    }
    setSaving(false);
  };

  const handleStatus = async (owner: Owner, status: 'ACTIVE' | 'SUSPENDED') => {
    setError('');
    try {
      await apiRequest(`/platform/owners/${owner.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      fetchOwners();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update owner status');
    }
  };

  const openAudit = async (owner: Owner) => {
    setAuditFor(owner);
    setAudit([]);
    try {
      const data = await apiGet<AuditEntry[]>(`/platform/owners/${owner.id}/audit`);
      setAudit(Array.isArray(data) ? data : []);
    } catch { /* non-critical */ }
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0 }}>👑 Owner Management</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
        >
          {showCreate ? 'Cancel' : '+ Create Owner'}
        </button>
      </div>
      <p style={{ color: '#6b7280', marginBottom: 20 }}>
        Owner-tier identities per V13 §3: SAAS_OWNER governs everything; MOVEINSYNC_OWNER holds complete functional access below it.
      </p>

      {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>}

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Users', value: stats.users.total },
            { label: 'Drivers', value: stats.drivers.total },
            { label: 'Vehicles', value: stats.vehicles.total },
            { label: 'Active Trips', value: stats.trips.active },
            { label: 'Today Trips', value: stats.trips.today },
            { label: 'Bookings', value: stats.bookings.total },
            { label: 'Sites', value: stats.sites.total },
            { label: 'Incidents', value: stats.incidents.open },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>{s.value.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0, color: '#111827' }}>Create Owner Identity</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Owner Tier</label>
              <select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })} style={inputStyle}>
                <option value="MOVEINSYNC_OWNER">MOVEINSYNC_OWNER (business owner)</option>
                <option value="SAAS_OWNER">SAAS_OWNER (highest governance)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="Jane Owner" />
            </div>
            <div>
              <label style={labelStyle}>Email (verified)</label>
              <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} placeholder="owner@company.com" type="email" />
            </div>
            <div>
              <label style={labelStyle}>Mobile</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputStyle} placeholder="+91…" />
            </div>
            <div>
              <label style={labelStyle}>Temporary Password</label>
              <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={inputStyle} placeholder="min 8 characters" type="password" />
            </div>
          </div>
          <button onClick={handleCreate} disabled={saving || !form.name || !form.email || !form.password}
            style={{ marginTop: 16, background: '#7c3aed', color: 'white', border: 'none', padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: saving || !form.name || !form.email || !form.password ? 0.6 : 1 }}>
            {saving ? 'Creating…' : 'Create Owner'}
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6b7280' }}>Loading owners…</p>
      ) : owners.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>👑</div>
          <h3 style={{ color: '#374151', marginTop: 12 }}>No owner identities yet</h3>
          <p style={{ color: '#6b7280' }}>Create the first SAAS_OWNER or MOVEINSYNC_OWNER above.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {owners.map(o => (
            <div key={o.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, color: '#111827', fontSize: 16 }}>{o.name}</span>
                  <span style={{ background: TIER_COLORS[o.role?.name || ''] || '#6b7280', color: 'white', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12 }}>
                    {o.role?.name || 'UNKNOWN'}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
                    background: o.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                    color: o.status === 'ACTIVE' ? '#166534' : '#991b1b',
                  }}>{o.status}</span>
                </div>
                <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
                  {o.email} · hierarchy L{o.role?.hierarchyLevel ?? '—'} · last login {o.lastLoginAt ? new Date(o.lastLoginAt).toLocaleString() : 'never'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => openAudit(o)} style={btnSecondary}>Audit</button>
                {o.status === 'ACTIVE' ? (
                  <button onClick={() => handleStatus(o, 'SUSPENDED')} style={{ ...btnSecondary, color: '#b91c1c' }}>Suspend</button>
                ) : (
                  <button onClick={() => handleStatus(o, 'ACTIVE')} style={{ ...btnSecondary, color: '#166534' }}>Activate</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {auditFor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setAuditFor(null)}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: 640, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: '#111827' }}>Audit — {auditFor.name}</h3>
            {audit.length === 0 ? <p style={{ color: '#6b7280' }}>No audit events for this owner yet.</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ textAlign: 'left', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={thStyle}>When</th><th style={thStyle}>Action</th><th style={thStyle}>Details</th>
                </tr></thead>
                <tbody>
                  {audit.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={tdStyle}>{new Date(a.createdAt).toLocaleString()}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{a.action}</td>
                      <td style={{ ...tdStyle, color: '#6b7280', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.newValue || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button onClick={() => setAuditFor(null)} style={{ marginTop: 16, ...btnSecondary }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 };
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' };
const btnSecondary: React.CSSProperties = { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 };
const thStyle: React.CSSProperties = { padding: '8px 6px', fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '8px 6px', color: '#374151' };
