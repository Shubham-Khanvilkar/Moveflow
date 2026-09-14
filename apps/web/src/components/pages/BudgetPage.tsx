'use client';
import { useState, useEffect } from 'react';
import { API_URL } from '../../lib/config';

export default function BudgetPage({ token }: { token: string }) {
  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/budget`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { const raw = d?.data; setAllocations(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []); })
      .catch(() => setError('Failed to load data')).finally(() => setLoading(false));
  }, [token]);

  const totalBudget = allocations.reduce((sum: number, a: any) => sum + (a.budgetAmount || a.amount || 0), 0);
  const totalSpent = allocations.reduce((sum: number, a: any) => sum + (a.spentAmount || a.spent || 0), 0);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Budget Allocation</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Track transport budget by process and site</p>

      {error && <div style={{ padding: '10px 16px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Budget', value: `₹${totalBudget.toLocaleString()}`, color: '#d97706' },
          { label: 'Total Spent', value: `₹${totalSpent.toLocaleString()}`, color: '#2563eb' },
          { label: 'Remaining', value: `₹${(totalBudget - totalSpent).toLocaleString()}`, color: '#10b981' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: `${kpi.color}08`, border: `1px solid ${kpi.color}20`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {loading ? <p style={{ color: '#6b7280' }}>Loading...</p> : allocations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>💰</div>
          <h3 style={{ color: '#374151', marginTop: 12 }}>No budget allocations</h3>
          <p style={{ color: '#6b7280' }}>Create your first budget allocation to see it here.</p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Vendor/Category', 'Budget', 'Spent', 'Remaining', 'Utilization'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allocations.map((a: any, i: number) => {
                const budget = a.budgetAmount || a.amount || 0;
                const spent = a.spentAmount || a.spent || 0;
                const remaining = budget - spent;
                const pct = budget > 0 ? ((spent / budget) * 100).toFixed(0) : '0';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{a.vendorName || a.category || a.name || `Allocation ${i + 1}`}</td>
                    <td style={{ padding: '12px 16px' }}>₹{budget.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}>₹{spent.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', color: remaining >= 0 ? '#10b981' : '#dc2626' }}>₹{remaining.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, parseInt(pct))}%`, background: parseInt(pct) > 90 ? '#dc2626' : parseInt(pct) > 70 ? '#f59e0b' : '#10b981', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
