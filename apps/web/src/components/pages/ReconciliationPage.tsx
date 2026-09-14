'use client';
import { useState, useEffect } from 'react';
import { API_URL } from '../../lib/config';

export default function ReconciliationPage({ token }: { token: string }) {
  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_URL}/api/finance/invoice-reconciliation`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`${API_URL}/api/finance/invoice-reconciliation/reconciliation/summary`, { headers }).then(r => r.json()).catch(() => ({})),
    ]).then(([r, s]) => {
      setReconciliations(r.data || r.reconciliations || r || []);
      setSummary(s.data || s);
    }).finally(() => setLoading(false));
  }, [token]);

  const reconciled = reconciliations.filter((r: any) => r.status === 'RECONCILED');
  const pending = reconciliations.filter((r: any) => r.status !== 'RECONCILED');

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Invoice Reconciliation</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Match invoices against trip records and rates</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Invoices', value: reconciliations.length, color: '#dc2626' },
          { label: 'Reconciled', value: reconciled.length, color: '#10b981' },
          { label: 'Pending', value: pending.length, color: '#f59e0b' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: `${kpi.color}08`, border: `1px solid ${kpi.color}20`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {loading ? <p style={{ color: '#6b7280' }}>Loading...</p> : reconciliations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>🔄</div>
          <h3 style={{ color: '#374151', marginTop: 12 }}>No reconciliations</h3>
          <p style={{ color: '#6b7280' }}>Reconciliation records will appear here after invoices are submitted.</p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Invoice ID', 'Vendor', 'Amount', 'Variance', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reconciliations.map((r: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.invoiceId?.slice(0, 8) || r.id?.slice(0, 8) || `INV-${i + 1}`}</td>
                  <td style={{ padding: '12px 16px' }}>{r.vendorName || r.vendor?.name || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>₹{(r.amount || r.totalAmount || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}>{r.variance || '0%'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: r.status === 'RECONCILED' ? '#dcfce7' : '#fef3c7', color: r.status === 'RECONCILED' ? '#16a34a' : '#d97706' }}>{r.status || 'PENDING'}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
