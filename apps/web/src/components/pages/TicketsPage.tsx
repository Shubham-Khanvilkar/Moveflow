'use client';
import { useState, useEffect } from 'react';
import { API_URL } from '../../lib/config';

export default function TicketsPage({ token }: { token: string }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/tickets?limit=20`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { const raw = d?.data; setTickets(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []); })
      .catch(() => setError('Failed to load data')).finally(() => setLoading(false));
  }, [token]);

  const open = tickets.filter((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const resolved = tickets.filter((t: any) => t.status === 'RESOLVED' || t.status === 'CLOSED');

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Support Tickets</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Manage and resolve transport support issues</p>

      {error && <div style={{ padding: '10px 16px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Tickets', value: tickets.length, color: '#7c3aed' },
          { label: 'Open/In Progress', value: open.length, color: '#f59e0b' },
          { label: 'Resolved', value: resolved.length, color: '#10b981' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: `${kpi.color}08`, border: `1px solid ${kpi.color}20`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {loading ? <p style={{ color: '#6b7280' }}>Loading...</p> : tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>🎫</div>
          <h3 style={{ color: '#374151', marginTop: 12 }}>No tickets</h3>
          <p style={{ color: '#6b7280' }}>Support tickets will appear here when issues are reported.</p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Subject', 'Company', 'Priority', 'Status', 'Created'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((t: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{t.subject || t.title || `Ticket ${t.id?.slice(0, 8) || i + 1}`}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{t.companyName || '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: t.priority === 'HIGH' ? '#fee2e2' : t.priority === 'MEDIUM' ? '#fef3c7' : '#f0f9ff', color: t.priority === 'HIGH' ? '#dc2626' : t.priority === 'MEDIUM' ? '#d97706' : '#2563eb' }}>{t.priority || 'NORMAL'}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: t.status === 'RESOLVED' || t.status === 'CLOSED' ? '#dcfce7' : '#fef3c7', color: t.status === 'RESOLVED' || t.status === 'CLOSED' ? '#16a34a' : '#d97706' }}>{t.status || 'OPEN'}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
