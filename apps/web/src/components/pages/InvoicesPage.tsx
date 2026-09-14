'use client';
import { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../lib/config';

const headers = (token: string) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

interface Invoice {
  id: string;
  vendorInvoiceId: string;
  invoiceAmount: number;
  tripId?: string | null;
  tripAmount?: number | null;
  dispatchAmount?: number | null;
  kmDiscrepancy?: number | null;
  amountDiscrepancy?: number | null;
  status: string;
  resolution?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function InvoicesPage({ token }: { token: string }) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<{ pending: number; resolved: number; discrepancy: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ vendorInvoiceId: '', invoiceAmount: '', tripId: '', tripAmount: '', dispatchAmount: '' });

  const loadInvoices = useCallback(async (page = 1, status?: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status) params.set('status', status);
      const res = await fetch(`${API_URL}/api/billing/invoices?${params}`, { headers: headers(token) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || body.error || 'Failed to load invoices');
      setInvoices(body.data?.invoices || body.data?.data || body.data || []);
      setPagination(body.data?.pagination || { page, limit: 20, total: 0, totalPages: 0 });
    } catch (e: any) {
      setError(e.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/invoice/reconciliation/summary`, { headers: headers(token) });
      const body = await res.json();
      setSummary(body.data || body);
    } catch { /* summary is non-critical */ }
  }, [token]);

  useEffect(() => {
    loadInvoices(1, statusFilter || undefined);
    loadSummary();
  }, [loadInvoices, loadSummary, statusFilter]);

  const handleApprove = async (invoiceId: string) => {
    setActionLoading(invoiceId);
    setMsg('');
    try {
      const res = await fetch(`${API_URL}/api/invoice/${invoiceId}/approve`, {
        method: 'POST',
        headers: headers(token),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || 'Failed to approve');
      }
      setMsg('Invoice approved successfully');
      loadInvoices(pagination.page, statusFilter || undefined);
      loadSummary();
    } catch (e: any) {
      setMsg(e.message || 'Failed to approve invoice');
    }
    setActionLoading(null);
  };

  const handleAutoMatch = async (invoiceId: string) => {
    setActionLoading(invoiceId);
    setMsg('');
    try {
      const res = await fetch(`${API_URL}/api/invoice/${invoiceId}/auto-match`, {
        method: 'POST',
        headers: headers(token),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || 'Auto-match failed');
      }
      const data = await res.json();
      setMsg(`Auto-matched ${data.matched || 0} trip(s)`);
      loadInvoices(pagination.page, statusFilter || undefined);
      loadSummary();
    } catch (e: any) {
      setMsg(e.message || 'Failed to auto-match');
    }
    setActionLoading(null);
  };

  const handleCreate = async () => {
    if (!createForm.vendorInvoiceId || !createForm.invoiceAmount) return;
    setActionLoading('create');
    setMsg('');
    try {
      const res = await fetch(`${API_URL}/api/invoice`, {
        method: 'POST',
        headers: headers(token),
        body: JSON.stringify({
          vendorInvoiceId: createForm.vendorInvoiceId,
          invoiceAmount: parseFloat(createForm.invoiceAmount),
          ...(createForm.tripId ? { tripId: createForm.tripId } : {}),
          ...(createForm.tripAmount ? { tripAmount: parseFloat(createForm.tripAmount) } : {}),
          ...(createForm.dispatchAmount ? { dispatchAmount: parseFloat(createForm.dispatchAmount) } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || 'Failed to create');
      }
      setMsg('Invoice created');
      setShowCreate(false);
      setCreateForm({ vendorInvoiceId: '', invoiceAmount: '', tripId: '', tripAmount: '', dispatchAmount: '' });
      loadInvoices(1, statusFilter || undefined);
      loadSummary();
    } catch (e: any) {
      setMsg(e.message || 'Failed to create invoice');
    }
    setActionLoading(null);
  };

  const statusStyle = (s: string) => {
    const map: Record<string, { bg: string; fg: string }> = {
      PENDING: { bg: '#fef3c7', fg: '#d97706' },
      MATCHED: { bg: '#dbeafe', fg: '#2563eb' },
      RESOLVED: { bg: '#dcfce7', fg: '#16a34a' },
      DISCREPANCY: { bg: '#fee2e2', fg: '#dc2626' },
    };
    const c = map[s] || { bg: '#f3f4f6', fg: '#6b7280' };
    return { background: c.bg, color: c.fg };
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Vendor Invoices</h2>
        <button
          onClick={() => { setShowCreate(true); setCreateForm({ vendorInvoiceId: '', invoiceAmount: '', tripId: '', tripAmount: '', dispatchAmount: '' }); }}
          style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          + New Invoice
        </button>
      </div>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Manage vendor invoice submissions and payments</p>

      {error && (
        <div style={{ padding: '10px 16px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {error}
        </div>
      )}
      {msg && (
        <div style={{ padding: '10px 16px', background: msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error') ? '#fef2f2' : '#f0fdf4', color: msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error') ? '#dc2626' : '#15803d', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Invoices', value: summary?.total ?? invoices.length, color: '#2563eb' },
          { label: 'Pending', value: summary?.pending ?? invoices.filter(i => i.status === 'PENDING').length, color: '#f59e0b' },
          { label: 'Resolved', value: summary?.resolved ?? invoices.filter(i => i.status === 'RESOLVED').length, color: '#10b981' },
          { label: 'Discrepancies', value: summary?.discrepancy ?? invoices.filter(i => i.status === 'DISCREPANCY').length, color: '#dc2626' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: `${kpi.color}08`, border: `1px solid ${kpi.color}20`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['', 'PENDING', 'MATCHED', 'RESOLVED', 'DISCREPANCY'].map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); }}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid', borderColor: statusFilter === s ? '#2563eb' : '#e5e7eb',
              background: statusFilter === s ? '#2563eb' : 'white', color: statusFilter === s ? 'white' : '#374151',
            }}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {showCreate && (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Create Invoice</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            {[
              { key: 'vendorInvoiceId', label: 'Vendor Invoice ID', required: true },
              { key: 'invoiceAmount', label: 'Amount (₹)', required: true, type: 'number' },
              { key: 'tripId', label: 'Trip ID (optional)' },
              { key: 'tripAmount', label: 'Trip Amount (₹)', type: 'number' },
              { key: 'dispatchAmount', label: 'Dispatch Amount (₹)', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label}{f.required && ' *'}</label>
                <input
                  type={f.type || 'text'}
                  value={(createForm as any)[f.key]}
                  onChange={e => setCreateForm({ ...createForm, [f.key]: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              onClick={handleCreate}
              disabled={actionLoading === 'create' || !createForm.vendorInvoiceId || !createForm.invoiceAmount}
              style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {actionLoading === 'create' ? 'Creating...' : 'Create Invoice'}
            </button>
            <button onClick={() => setShowCreate(false)} style={{ padding: '10px 24px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div>
      ) : invoices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>🧾</div>
          <h3 style={{ color: '#374151', marginTop: 12 }}>No invoices</h3>
          <p style={{ color: '#6b7280' }}>Vendor invoices will appear here once submitted.</p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Invoice ID', 'Amount', 'Trip Amount', 'Dispatch Amount', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: Invoice) => (
                <tr key={inv.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>
                    {inv.vendorInvoiceId || inv.id.slice(0, 8)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>₹{inv.invoiceAmount.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}>{inv.tripAmount != null ? `₹${inv.tripAmount.toLocaleString()}` : '-'}</td>
                  <td style={{ padding: '12px 16px' }}>{inv.dispatchAmount != null ? `₹${inv.dispatchAmount.toLocaleString()}` : '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, ...statusStyle(inv.status) }}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                    {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {inv.status === 'PENDING' && (
                        <button
                          onClick={() => handleAutoMatch(inv.id)}
                          disabled={actionLoading === inv.id}
                          style={{ padding: '4px 10px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          {actionLoading === inv.id ? '...' : 'Match'}
                        </button>
                      )}
                      {(inv.status === 'PENDING' || inv.status === 'MATCHED' || inv.status === 'DISCREPANCY') && (
                        <button
                          onClick={() => handleApprove(inv.id)}
                          disabled={actionLoading === inv.id}
                          style={{ padding: '4px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          {actionLoading === inv.id ? '...' : 'Approve'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadInvoices(pagination.page - 1, statusFilter || undefined)}
                style={{ padding: '6px 12px', background: pagination.page <= 1 ? '#f3f4f6' : '#2563eb', color: pagination.page <= 1 ? '#9ca3af' : 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: pagination.page <= 1 ? 'default' : 'pointer' }}
              >
                Prev
              </button>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadInvoices(pagination.page + 1, statusFilter || undefined)}
                style={{ padding: '6px 12px', background: pagination.page >= pagination.totalPages ? '#f3f4f6' : '#2563eb', color: pagination.page >= pagination.totalPages ? '#9ca3af' : 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: pagination.page >= pagination.totalPages ? 'default' : 'pointer' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
