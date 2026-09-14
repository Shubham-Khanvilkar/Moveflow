'use client';
import { useState, useEffect } from 'react';

import { API_URL } from '../../lib/config';

const PAGES: Record<string, {icon: string, title: string, desc: string, color: string}> = {
  ExpensesPage: { icon: '💳', title: 'Transport Expenses', desc: 'Submit and track transport expense claims', color: '#8b5cf6' },
  InvoicesPage: { icon: '🧾', title: 'Vendor Invoices', desc: 'Manage vendor invoice submissions and payments', color: '#059669' },
  PerformancePage: { icon: '📈', title: 'Vendor Performance', desc: 'Track vendor SLA, compliance and trip metrics', color: '#2563eb' },
  BudgetPage: { icon: '💰', title: 'Budget Allocation', desc: 'Track transport budget by process and site', color: '#d97706' },
  ReconciliationPage: { icon: '🔄', title: 'Invoice Reconciliation', desc: 'Match invoices against trip records and rates', color: '#dc2626' },
  EventsPage: { icon: '🛡️', title: 'Security Events', desc: 'Monitor security events and access violations', color: '#1e293b' },
  AccessPage: { icon: '🔐', title: 'Access Control', desc: 'Manage roles, permissions and user access', color: '#7c3aed' }
};

export default function EventsPage({ token }: { token: string }) {
  const info = PAGES['EventsPage'];
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoints: Record<string, string> = {
      ExpensesPage: '/api/admin/users',
      InvoicesPage: '/api/billing/external',
      BudgetPage: '/api/billing/external',
      EventsPage: '/api/audit',
      AccessPage: '/api/platform/roles'
    };
    const url = endpoints['EventsPage'] || '/api/audit';
    fetch(`${API_URL}${url}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(d => {
      setData(Array.isArray(d) ? d : d.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{info.icon} {info.title}</h1>
      <p style={{ color: '#6b7280', marginBottom: 20 }}>{info.desc}</p>
      {loading ? <p style={{ color: '#6b7280' }}>Loading...</p> : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            <div style={{ background: info.color + '08', border: `1px solid ${info.color}20`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: info.color }}>{data.length}</div>
              <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Total Records</div>
            </div>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#059669' }}>0</div>
              <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Pending Action</div>
            </div>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#dc2626' }}>0</div>
              <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Overdue</div>
            </div>
          </div>
          {data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
              <div style={{ fontSize: 48 }}>{info.icon}</div>
              <h3 style={{ color: '#374151', marginTop: 12 }}>No records yet</h3>
              <p style={{ color: '#6b7280' }}>Data will appear here as records are created.</p>
            </div>
          ) : (
            <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['Event', 'Entity', 'Severity', 'Time'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((e: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{e.action || e.event || `Event ${i + 1}`}</td>
                      <td style={{ padding: '12px 16px' }}>{e.entity || e.resourceType || '-'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: e.severity === 'HIGH' ? '#fee2e2' : e.severity === 'MEDIUM' ? '#fef3c7' : '#f0f9ff', color: e.severity === 'HIGH' ? '#dc2626' : e.severity === 'MEDIUM' ? '#d97706' : '#2563eb' }}>{e.severity || 'INFO'}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#6b7280' }}>{e.createdAt ? new Date(e.createdAt).toLocaleString() : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
