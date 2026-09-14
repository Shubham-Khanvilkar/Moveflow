'use client';
import React, { useState, useEffect } from 'react';
import Spinner from '../Spinner';
import { API_URL } from '../../lib/config';

export default function ComplianceDashboard({ token, user }: { token: string; user: any }) {
  const [kpi, setKpi] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_URL}/api/dashboard/kpi`, { headers }).then(r => r.json()).catch(() => ({})),
      fetch(`${API_URL}/api/company-admin/audit-logs?limit=10`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`${API_URL}/api/dashboard/compliance/documents`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([k, a, d]) => {
      setKpi(k.data || k);
      setAuditLogs(a.data || a.documents || a || []);
      setDocuments(d.data || d.documents || d || []);
    }).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spinner />;

  const totalDocuments = kpi?.documents?.total ?? 0;
  const expiringDocs = kpi?.documents?.expiringSoon ?? 0;
  const totalIncidents = kpi?.incidents?.total ?? 0;
  const openIncidents = kpi?.incidents?.open ?? 0;
  const totalDrivers = kpi?.drivers?.total ?? 0;

  const expiringList = (documents || []).filter((d: any) => d.status === 'VERIFIED' && d.expiryDate);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Transport Compliance Center</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Policy adherence, violations, regulatory compliance — {user?.name || 'Compliance Officer'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Documents', value: totalDocuments, color: '#0d9488', icon: '📄' },
          { label: 'Expiring Soon', value: expiringDocs, color: expiringDocs > 0 ? '#ef4444' : '#10b981', icon: '⏰' },
          { label: 'Total Incidents', value: totalIncidents, color: '#2563eb', icon: '🚨' },
          { label: 'Open Incidents', value: openIncidents, color: openIncidents > 0 ? '#ef4444' : '#10b981', icon: '⚠️' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderTop: `3px solid ${kpi.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>{kpi.label}</span>
              <span style={{ fontSize: 16 }}>{kpi.icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Expiring Documents</h3>
          {expiringList.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No documents expiring soon</div>
          ) : (
            expiringList.slice(0, 8).map((d: any, i: number) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{d.documentType?.replace(/_/g, ' ') || 'Document'}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Entity: {d.entityId?.slice(0, 8) || '-'}</div>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: '#fef3c7', color: '#d97706' }}>
                    Exp: {d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : '-'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Recent Audit Trail</h3>
          {auditLogs.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No audit logs</div>
          ) : (
            auditLogs.slice(0, 8).map((e: any, i: number) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{e.action}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{e.entity || ''} {e.resourceType ? `— ${e.resourceType}` : ''}</div>
                  </div>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(e.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
