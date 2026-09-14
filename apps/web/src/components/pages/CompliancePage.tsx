'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost, ApiError } from '../../lib/api-client';

interface ComplianceDoc {
  id: string;
  entityType: string;
  entityId: string;
  documentType: string;
  documentNumber?: string;
  fileName: string;
  fileUrl: string;
  status: string;
  expiryDate?: string;
  issuedDate?: string;
  issuingAuthority?: string;
  reviewNotes?: string;
  createdAt: string;
}

interface ComplianceStanding {
  id: string;
  companyId: string;
  overallScore: number;
  overallGrade: string;
  documentCompliance: number;
  totalDocuments: number;
  validDocuments: number;
  expiringDocuments: number;
  expiredDocuments: number;
  totalVehicles: number;
  totalDrivers: number;
  lastAuditDate?: string;
  lastAuditScore?: number;
}

interface ComplianceAudit {
  id: string;
  auditType: string;
  entityType?: string;
  entityId?: string;
  status: string;
  priority?: string;
  findings?: string;
  complianceScore?: number;
  issuesFound?: number;
  actionRequired?: boolean;
  createdAt: string;
}

interface ComplianceTask {
  id: string;
  taskType: string;
  title: string;
  description?: string;
  entityType?: string;
  entityId?: string;
  assignedTo?: string;
  status: string;
  priority?: string;
  dueDate?: string;
  result?: string;
  notes?: string;
  createdAt: string;
}

interface DocumentType {
  id: string;
  documentType: string;
  displayName: string;
  description?: string;
  isMandatory: boolean;
  forEntityType: string;
  alertBeforeDays?: number;
}

type Tab = 'overview' | 'documents' | 'audits' | 'tasks';

export default function CompliancePage({ token, user }: { token: string; user?: any }) {
  const [tab, setTab] = useState<Tab>('overview');
  const [standing, setStanding] = useState<ComplianceStanding | null>(null);
  const [documents, setDocuments] = useState<ComplianceDoc[]>([]);
  const [audits, setAudits] = useState<ComplianceAudit[]>([]);
  const [tasks, setTasks] = useState<ComplianceTask[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [standingRes, docsRes, auditsRes, tasksRes, docTypesRes] = await Promise.allSettled([
        apiGet<any>('/dashboard/compliance/standing'),
        apiGet<any>('/dashboard/compliance/documents?limit=50'),
        apiGet<any>('/dashboard/compliance/audits?limit=20'),
        apiGet<any>('/dashboard/compliance/tasks?limit=20'),
        apiGet<DocumentType[]>('/dashboard/compliance/document-types'),
      ]);

      if (standingRes.status === 'fulfilled') setStanding(standingRes.value);
      if (docsRes.status === 'fulfilled') {
        const d = docsRes.value as any;
        setDocuments(d?.data || d || []);
      }
      if (auditsRes.status === 'fulfilled') {
        const a = auditsRes.value as any;
        setAudits(a?.data || a || []);
      }
      if (tasksRes.status === 'fulfilled') {
        const t = tasksRes.value as any;
        setTasks(t?.data || t || []);
      }
      if (docTypesRes.status === 'fulfilled') {
        const dt = docTypesRes.value as any;
        setDocumentTypes(Array.isArray(dt) ? dt : dt?.data || []);
      }

      const failures = [standingRes, docsRes, auditsRes, tasksRes, docTypesRes]
        .filter(r => r.status === 'rejected')
        .map(r => (r as PromiseRejectedResult).reason);
      if (failures.length === 5) {
        setError('Failed to load compliance data. Please try again.');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const refreshScore = async () => {
    setActionLoading('refresh');
    try {
      const updated = await apiPost<any>('/dashboard/compliance/standing/refresh');
      setStanding(updated);
    } catch { /* ignore */ } finally {
      setActionLoading(null);
    }
  };

  const reviewDocument = async (docId: string, decision: 'APPROVE' | 'REJECT') => {
    setActionLoading(`doc-${docId}`);
    try {
      await apiPost(`/dashboard/compliance/documents/${docId}/review`, { decision });
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED' } : d));
    } catch { /* ignore */ } finally {
      setActionLoading(null);
    }
  };

  const completeTask = async (taskId: string) => {
    setActionLoading(`task-${taskId}`);
    try {
      await apiPost(`/dashboard/compliance/tasks/${taskId}/complete`, { result: 'COMPLETED' });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'COMPLETED' } : t));
    } catch { /* ignore */ } finally {
      setActionLoading(null);
    }
  };

  const docStatus = (expiryDate?: string) => {
    if (!expiryDate) return { label: 'N/A', bg: '#f3f4f6', color: '#6b7280' };
    const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
    if (days <= 0) return { label: 'EXPIRED', bg: '#fef2f2', color: '#dc2626' };
    if (days <= 7) return { label: `${days}d`, bg: '#fef2f2', color: '#dc2626' };
    if (days <= 30) return { label: `${days}d`, bg: '#fefce8', color: '#a16207' };
    return { label: 'Valid', bg: '#f0fdf4', color: '#15803d' };
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string }> = {
      ACTIVE: { bg: '#f0fdf4', color: '#15803d' },
      APPROVED: { bg: '#f0fdf4', color: '#15803d' },
      COMPLETED: { bg: '#f0fdf4', color: '#15803d' },
      PENDING: { bg: '#fefce8', color: '#a16207' },
      IN_PROGRESS: { bg: '#eff6ff', color: '#2563eb' },
      REJECTED: { bg: '#fef2f2', color: '#dc2626' },
      EXPIRED: { bg: '#fef2f2', color: '#dc2626' },
      FAILED: { bg: '#fef2f2', color: '#dc2626' },
    };
    const s = map[status] || { bg: '#f3f4f6', color: '#374151' };
    return <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>{status}</span>;
  };

  const pendingDocs = documents.filter(d => d.status === 'PENDING');
  const rejectedDocs = documents.filter(d => d.status === 'REJECTED');
  const approvedDocs = documents.filter(d => d.status === 'APPROVED');
  const pendingTasks = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'FAILED');
  const pendingAudits = audits.filter(a => a.status !== 'COMPLETED');

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'documents', label: 'Documents', count: documents.length },
    { key: 'audits', label: 'Audits', count: audits.length },
    { key: 'tasks', label: 'Tasks', count: tasks.length },
  ];

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: 14 }}>Loading compliance data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: '#fef2f2', borderRadius: 12, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#dc2626', marginBottom: 12 }}>{error}</div>
          <button onClick={fetchData} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Compliance Dashboard</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Document compliance tracking &amp; audit management</p>
        </div>
        <button
          onClick={refreshScore}
          disabled={actionLoading === 'refresh'}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', fontSize: 13, fontWeight: 600, cursor: actionLoading === 'refresh' ? 'not-allowed' : 'pointer', opacity: actionLoading === 'refresh' ? 0.6 : 1 }}
        >
          {actionLoading === 'refresh' ? 'Refreshing...' : 'Refresh Score'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              borderBottom: tab === t.key ? '2px solid #2563eb' : '2px solid transparent', marginBottom: -2,
              color: tab === t.key ? '#2563eb' : '#6b7280',
            }}
          >
            {t.label}{t.count !== undefined ? ` (${t.count})` : ''}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <div style={{ background: 'white', borderRadius: 12, padding: 20, borderLeft: '4px solid #2563eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Total Documents</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb' }}>{standing?.totalDocuments ?? documents.length}</div>
            </div>
            <div style={{ background: 'white', borderRadius: 12, padding: 20, borderLeft: '4px solid #10b981', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Valid Documents</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>{standing?.validDocuments ?? approvedDocs.length}</div>
            </div>
            <div style={{ background: 'white', borderRadius: 12, padding: 20, borderLeft: '4px solid #f59e0b', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Pending Review</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>{pendingDocs.length}</div>
            </div>
            <div style={{ background: 'white', borderRadius: 12, padding: 20, borderLeft: '4px solid #ef4444', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Rejected / Expired</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444' }}>{(standing?.expiredDocuments ?? 0) + rejectedDocs.length}</div>
            </div>
          </div>

          {/* Compliance Score */}
          {standing && (
            <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Compliance Score</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', border: `6px solid ${standing.overallGrade === 'A' ? '#10b981' : standing.overallGrade === 'B' ? '#f59e0b' : '#ef4444'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 28, fontWeight: 800 }}>{standing.overallGrade}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Overall Score: <strong>{standing.overallScore}%</strong></div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Document Compliance: <strong>{standing.documentCompliance}%</strong></div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>
                    Fleet: <strong>{standing.totalDrivers}</strong> drivers, <strong>{standing.totalVehicles}</strong> vehicles
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick views */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Pending Tasks</h3>
                <button onClick={() => setTab('tasks')} style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>View all</button>
              </div>
              {pendingTasks.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No pending tasks</div>
              ) : (
                pendingTasks.slice(0, 5).map(t => (
                  <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{t.taskType} {t.dueDate ? `— due ${new Date(t.dueDate).toLocaleDateString()}` : ''}</div>
                    </div>
                    {statusBadge(t.status)}
                  </div>
                ))
              )}
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Pending Document Reviews</h3>
                <button onClick={() => setTab('documents')} style={{ fontSize: 12, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>View all</button>
              </div>
              {pendingDocs.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No documents awaiting review</div>
              ) : (
                pendingDocs.slice(0, 5).map(d => (
                  <div key={d.id} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{d.documentType?.replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{d.entityType} — {d.entityId?.slice(0, 8)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => reviewDocument(d.id, 'APPROVE')}
                        disabled={actionLoading === `doc-${d.id}`}
                        style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >Approve</button>
                      <button
                        onClick={() => reviewDocument(d.id, 'REJECT')}
                        disabled={actionLoading === `doc-${d.id}`}
                        style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >Reject</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'documents' && (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>All Compliance Documents</h3>
          </div>
          {documents.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No documents found</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Type', 'Entity', 'File', 'Number', 'Status', 'Expiry', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map(d => {
                  const ex = docStatus(d.expiryDate);
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 16px', fontWeight: 600 }}>{d.documentType?.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '10px 16px' }}>{d.entityType} — {d.entityId?.slice(0, 8)}</td>
                      <td style={{ padding: '10px 16px', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.fileName}</td>
                      <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12 }}>{d.documentNumber || '-'}</td>
                      <td style={{ padding: '10px 16px' }}>{statusBadge(d.status)}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, background: ex.bg, color: ex.color }}>{ex.label}</span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        {d.status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => reviewDocument(d.id, 'APPROVE')}
                              disabled={actionLoading === `doc-${d.id}`}
                              style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                            >Approve</button>
                            <button
                              onClick={() => reviewDocument(d.id, 'REJECT')}
                              disabled={actionLoading === `doc-${d.id}`}
                              style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                            >Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'audits' && (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Compliance Audits</h3>
          </div>
          {audits.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No audits found</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Type', 'Entity', 'Status', 'Priority', 'Score', 'Issues', 'Created'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audits.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>{a.auditType}</td>
                    <td style={{ padding: '10px 16px' }}>{a.entityType ? `${a.entityType} — ${a.entityId?.slice(0, 8)}` : '-'}</td>
                    <td style={{ padding: '10px 16px' }}>{statusBadge(a.status)}</td>
                    <td style={{ padding: '10px 16px' }}>{a.priority || '-'}</td>
                    <td style={{ padding: '10px 16px' }}>{a.complianceScore != null ? `${a.complianceScore}%` : '-'}</td>
                    <td style={{ padding: '10px 16px' }}>{a.issuesFound ?? '-'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#6b7280' }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'tasks' && (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Compliance Tasks</h3>
          </div>
          {tasks.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No tasks found</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Title', 'Type', 'Assigned To', 'Priority', 'Status', 'Due Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: '#374151' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                    <td style={{ padding: '10px 16px' }}>{t.taskType}</td>
                    <td style={{ padding: '10px 16px' }}>{t.assignedTo?.slice(0, 8) || '-'}</td>
                    <td style={{ padding: '10px 16px' }}>{t.priority || '-'}</td>
                    <td style={{ padding: '10px 16px' }}>{statusBadge(t.status)}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#6b7280' }}>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      {t.status !== 'COMPLETED' && t.status !== 'FAILED' && (
                        <button
                          onClick={() => completeTask(t.id)}
                          disabled={actionLoading === `task-${t.id}`}
                          style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          {actionLoading === `task-${t.id}` ? '...' : 'Complete'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
