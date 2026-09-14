'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../lib/config';

const headers = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

interface SLAPenalty {
  id: string;
  vendorId: string;
  period: string;
  slaMetric: string;
  targetValue: number;
  actualValue: number;
  penaltyAmount: number;
  notes?: string;
  status: string;
  createdAt: string;
  appliedAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const METRIC_OPTIONS = [
  { value: 'ON_TIME_PICKUP', label: 'On-Time Pickup %' },
  { value: 'VEHICLE_AVAILABILITY', label: 'Vehicle Availability %' },
  { value: 'DRIVER_COMPLIANCE', label: 'Driver Compliance %' },
  { value: 'CLEANLINESS_SCORE', label: 'Cleanliness Score' },
  { value: 'CUSTOMER_RATING', label: 'Customer Rating' },
];

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  PENDING: { bg: '#fef3c7', fg: '#d97706' },
  APPLIED: { bg: '#dcfce7', fg: '#16a34a' },
  DISPUTED: { bg: '#fee2e2', fg: '#dc2626' },
};

export default function VendorSLAPenaltiesPage({ token }: { token: string }) {
  const [penalties, setPenalties] = useState<SLAPenalty[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filterMetric, setFilterMetric] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    vendorId: '',
    period: '',
    slaMetric: 'ON_TIME_PICKUP',
    targetValue: '',
    actualValue: '',
    notes: '',
  });

  const loadPenalties = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (filterMetric) params.set('slaMetric', filterMetric);
      const res = await fetch(`${API_URL}/api/finance/sla/penalties?${params}`, { headers: headers(token) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || body.error || 'Failed to load penalties');
      setPenalties(body.data?.data || body.data || []);
      setPagination(body.data?.pagination || { page, limit: 20, total: 0, totalPages: 0 });
    } catch (e: any) {
      setError(e.message || 'Failed to load penalties');
    } finally {
      setLoading(false);
    }
  }, [token, filterMetric]);

  useEffect(() => { loadPenalties(1); }, [loadPenalties]);

  const handleApprove = async (penaltyId: string) => {
    setActionLoading(penaltyId);
    setMsg('');
    try {
      const res = await fetch(`${API_URL}/api/finance/sla/penalty/${penaltyId}/approve`, {
        method: 'POST',
        headers: headers(token),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || 'Failed to approve');
      }
      setMsg('Penalty approved and applied');
      loadPenalties(pagination.page);
    } catch (e: any) {
      setMsg(e.message || 'Failed to approve penalty');
    }
    setActionLoading(null);
  };

  const handleCreate = async () => {
    if (!createForm.vendorId || !createForm.period || !createForm.targetValue || !createForm.actualValue) return;
    setActionLoading('create');
    setMsg('');
    try {
      const res = await fetch(`${API_URL}/api/finance/sla/penalty`, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({
          vendorId: createForm.vendorId,
          period: createForm.period,
          slaMetric: createForm.slaMetric,
          targetValue: parseFloat(createForm.targetValue),
          actualValue: parseFloat(createForm.actualValue),
          notes: createForm.notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || 'Failed to create');
      }
      setMsg('Penalty created successfully');
      setShowCreate(false);
      setCreateForm({ vendorId: '', period: '', slaMetric: 'ON_TIME_PICKUP', targetValue: '', actualValue: '', notes: '' });
      loadPenalties(1);
    } catch (e: any) {
      setMsg(e.message || 'Failed to create penalty');
    }
    setActionLoading(null);
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Vendor SLA Penalties</h2>
        <button
          onClick={() => { setShowCreate(true); setCreateForm({ vendorId: '', period: '', slaMetric: 'ON_TIME_PICKUP', targetValue: '', actualValue: '', notes: '' }); }}
          style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + New Penalty
        </button>
      </div>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Track and manage vendor SLA violations and penalty deductions</p>

      {error && (
        <div style={{ padding: '10px 16px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>
      )}
      {msg && (
        <div style={{ padding: '10px 16px', background: msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error') ? '#fef2f2' : '#f0fdf4', color: msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error') ? '#dc2626' : '#15803d', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{msg}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>Total Penalties</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb' }}>{pagination.total}</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>Pending Approval</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>{penalties.filter(p => p.status === 'PENDING').length}</div>
        </div>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>Total Penalty Amount</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626' }}>₹{penalties.reduce((sum, p) => sum + p.penaltyAmount, 0).toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select value={filterMetric} onChange={(e) => setFilterMetric(e.target.value)}
          style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}>
          <option value="">All Metrics</option>
          {METRIC_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {showCreate && (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Create SLA Penalty</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Vendor ID *</label>
              <input value={createForm.vendorId} onChange={e => setCreateForm({ ...createForm, vendorId: e.target.value })}
                placeholder="Vendor ID" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Period (YYYY-MM) *</label>
              <input value={createForm.period} onChange={e => setCreateForm({ ...createForm, period: e.target.value })}
                placeholder="2024-01" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>SLA Metric *</label>
              <select value={createForm.slaMetric} onChange={e => setCreateForm({ ...createForm, slaMetric: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: 'white', boxSizing: 'border-box' }}>
                {METRIC_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Target Value *</label>
              <input type="number" value={createForm.targetValue} onChange={e => setCreateForm({ ...createForm, targetValue: e.target.value })}
                placeholder="95" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Actual Value *</label>
              <input type="number" value={createForm.actualValue} onChange={e => setCreateForm({ ...createForm, actualValue: e.target.value })}
                placeholder="82" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Notes</label>
              <input value={createForm.notes} onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="Optional notes" style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={handleCreate} disabled={actionLoading === 'create' || !createForm.vendorId || !createForm.period}
              style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {actionLoading === 'create' ? 'Creating...' : 'Create Penalty'}
            </button>
            <button onClick={() => setShowCreate(false)} style={{ padding: '10px 24px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>
      ) : penalties.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>📋</div>
          <h3 style={{ color: '#374151', marginTop: 12 }}>No SLA penalties</h3>
          <p style={{ color: '#6b7280' }}>Penalties will appear here once recorded.</p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Vendor ID', 'Period', 'Metric', 'Target', 'Actual', 'Penalty', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {penalties.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{p.vendorId.slice(0, 8)}...</td>
                  <td style={{ padding: '12px 16px' }}>{p.period}</td>
                  <td style={{ padding: '12px 16px' }}>{p.slaMetric.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '12px 16px' }}>{p.targetValue}%</td>
                  <td style={{ padding: '12px 16px', color: p.actualValue < p.targetValue ? '#dc2626' : '#16a34a' }}>{p.actualValue}%</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#dc2626' }}>₹{p.penaltyAmount.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: STATUS_COLORS[p.status]?.bg || '#f3f4f6', color: STATUS_COLORS[p.status]?.fg || '#6b7280' }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {p.status === 'PENDING' && (
                      <button onClick={() => handleApprove(p.id)} disabled={actionLoading === p.id}
                        style={{ padding: '4px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                        {actionLoading === p.id ? '...' : 'Approve'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
              <button disabled={pagination.page <= 1} onClick={() => loadPenalties(pagination.page - 1)}
                style={{ padding: '6px 12px', background: pagination.page <= 1 ? '#f3f4f6' : '#2563eb', color: pagination.page <= 1 ? '#9ca3af' : 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: pagination.page <= 1 ? 'default' : 'pointer' }}>
                Prev
              </button>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
              <button disabled={pagination.page >= pagination.totalPages} onClick={() => loadPenalties(pagination.page + 1)}
                style={{ padding: '6px 12px', background: pagination.page >= pagination.totalPages ? '#f3f4f6' : '#2563eb', color: pagination.page >= pagination.totalPages ? '#9ca3af' : 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: pagination.page >= pagination.totalPages ? 'default' : 'pointer' }}>
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
