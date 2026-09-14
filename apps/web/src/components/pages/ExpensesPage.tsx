'use client';
import { useState, useEffect } from 'react';
import { API_URL } from '../../lib/config';

export default function ExpensesPage({ token }: { token: string }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/transport-expenses/my`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { const raw = d?.data; setExpenses(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []); })
      .catch(() => setError('Failed to load data')).finally(() => setLoading(false));
  }, [token]);

  const pending = expenses.filter((e: any) => e.status === 'DRAFT' || e.status === 'SUBMITTED');
  const approved = expenses.filter((e: any) => e.status === 'APPROVED');
  const totalAmount = expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Transport Expenses</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Submit and track transport expense claims</p>

      {error && <div style={{ padding: '10px 16px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Expenses', value: expenses.length, color: '#8b5cf6' },
          { label: 'Pending', value: pending.length, color: '#f59e0b' },
          { label: 'Total Amount', value: `₹${totalAmount.toLocaleString()}`, color: '#2563eb' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: `${kpi.color}08`, border: `1px solid ${kpi.color}20`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {loading ? <p style={{ color: '#6b7280' }}>Loading...</p> : expenses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>💳</div>
          <h3 style={{ color: '#374151', marginTop: 12 }}>No expenses yet</h3>
          <p style={{ color: '#6b7280' }}>Submit your first expense claim to see it here.</p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Trip', 'Amount', 'Status', 'Submitted', 'Category'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map((e: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{e.tripId?.slice(0, 8) || e.description || `Expense ${i + 1}`}</td>
                  <td style={{ padding: '12px 16px' }}>₹{(e.amount || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: e.status === 'APPROVED' ? '#dcfce7' : e.status === 'REJECTED' ? '#fee2e2' : '#fef3c7', color: e.status === 'APPROVED' ? '#16a34a' : e.status === 'REJECTED' ? '#dc2626' : '#d97706' }}>{e.status || 'DRAFT'}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{e.category || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
