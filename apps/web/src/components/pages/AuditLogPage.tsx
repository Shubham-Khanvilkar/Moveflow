'use client';
import { useState, useEffect } from 'react';
import { apiFetch } from '../../hooks/useApi';

interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface AuditLogsResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entity', entityFilter);

      const result = await apiFetch(`/admin/audit-logs?${params}`) as AuditLogsResponse;
      setLogs(result.data || []);
      setTotal(result.pagination?.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load audit logs');
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const filtered = logs.filter(l => {
    if (search && !JSON.stringify(l).toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFrom && l.createdAt && new Date(l.createdAt) < new Date(dateFrom)) return false;
    if (dateTo && l.createdAt && new Date(l.createdAt) > new Date(dateTo)) return false;
    return true;
  });

  const actions = Array.from(new Set(logs.map(l => l.action).filter(Boolean)));
  const entities = Array.from(new Set(logs.map(l => l.entity).filter(Boolean)));

  const exportCSV = () => {
    const headers = ['Timestamp', 'User ID', 'Action', 'Entity', 'Entity ID', 'New Value'];
    const rows = filtered.map(l => [
      l.createdAt,
      l.userId || '',
      l.action || '',
      l.entity || '',
      l.entityId || '',
      l.newValue ? JSON.stringify(l.newValue) : '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 4 }}>Audit Trail</h1>
          <p style={{ color: '#6b7280' }}>Complete trail of all system actions across NAVIRA</p>
        </div>
        <button onClick={exportCSV} style={{ padding: '8px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          Export CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search logs..."
          style={{ flex: 1, minWidth: 200, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }} />
        <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}>
          <option value="">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={entityFilter} onChange={e => setEntityFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }}>
          <option value="">All Entities</option>
          {entities.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }} />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13 }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48, animation: 'spin 1s linear infinite' }}>⏳</div>
          <p style={{ color: '#6b7280', marginTop: 12 }}>Loading audit logs...</p>
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fef2f2', borderRadius: 12, border: '1px solid #fecaca' }}>
          <div style={{ fontSize: 48 }}>⚠️</div>
          <h3 style={{ color: '#991b1b', marginTop: 12 }}>Error loading audit logs</h3>
          <p style={{ color: '#6b7280' }}>{error}</p>
          <button onClick={fetchLogs} style={{ marginTop: 12, padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>📋</div>
          <h3 style={{ color: '#374151', marginTop: 12 }}>No audit records found</h3>
          <p style={{ color: '#6b7280' }}>Actions will be logged here as they occur.</p>
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Timestamp</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Actor</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Action</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Entity</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Entity ID</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log: AuditLog, i: number) => (
                  <tr key={log.id || i} style={{ background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: 12 }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', fontWeight: 600, fontSize: 12 }}>
                      {log.userId || '-'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 600 }}>
                        {log.action || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>{log.entity || '-'}</td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontSize: 11, fontFamily: 'monospace' }}>
                      {log.entityId ? log.entityId.slice(0, 8) + '...' : '-'}
                    </td>
                    <td style={{ padding: '10px 12px', borderBottom: '1px solid #e5e7eb', color: '#6b7280', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
                      {log.newValue ? JSON.stringify(log.newValue).slice(0, 100) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > limit && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
              >
                Previous
              </button>
              <span style={{ padding: '6px 12px', color: '#6b7280', fontSize: 13 }}>
                Page {page} of {Math.ceil(total / limit)} ({total} total)
              </span>
              <button
                disabled={page * limit >= total}
                onClick={() => setPage(p => p + 1)}
                style={{ padding: '6px 12px', border: '1px solid #d1d5db', borderRadius: 6, cursor: page * limit >= total ? 'not-allowed' : 'pointer', opacity: page * limit >= total ? 0.5 : 1 }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
