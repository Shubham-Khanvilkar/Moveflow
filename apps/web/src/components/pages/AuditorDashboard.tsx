'use client';
import React, { useState, useEffect } from 'react';
import Spinner from '../Spinner';
import { API_URL } from '../../lib/config';

export default function AuditorDashboard({ token, user }: { token: string; user: any }) {
  const [kpi, setKpi] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_URL}/api/dashboard/kpi`, { headers }).then(r => r.json()).catch(() => ({})),
      fetch(`${API_URL}/api/company-admin/audit-logs?limit=20`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([k, a]) => {
      setKpi(k.data || k);
      setAuditLogs(a.data || a.documents || a || []);
    }).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spinner />;

  const totalAuditEvents = kpi?.audit?.total ?? 0;
  const totalIncidents = kpi?.incidents?.total ?? 0;
  const openIncidents = kpi?.incidents?.open ?? 0;
  const totalUsers = kpi?.users?.total ?? 0;
  const totalRoles = kpi?.roles?.total ?? 0;

  const groupedActions: Record<string, number> = {};
  auditLogs.forEach((e: any) => {
    const key = e.action || 'Unknown';
    groupedActions[key] = (groupedActions[key] || 0) + 1;
  });

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Platform Audit & Compliance</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Compliance monitoring, audit trail, policy adherence — {user?.name || 'Auditor'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Audit Events', value: totalAuditEvents.toLocaleString(), color: '#7c3aed', icon: '📋' },
          { label: 'Open Incidents', value: openIncidents, color: openIncidents > 0 ? '#ef4444' : '#10b981', icon: openIncidents > 0 ? '🚨' : '✅' },
          { label: 'Total Users', value: totalUsers, color: '#2563eb', icon: '👥' },
          { label: 'Role Definitions', value: totalRoles, color: '#059669', icon: '🔐' },
          { label: 'Compliance Score', value: totalIncidents === 0 ? '100%' : `${Math.max(50, 100 - totalIncidents * 5)}%`, color: '#059669', icon: '📈' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${kpi.color}` }}>
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
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Recent Audit Trail</h3>
          {auditLogs.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No audit logs</div>
          ) : (
            auditLogs.slice(0, 10).map((e: any, i: number) => (
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

        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Action Frequency</h3>
          {Object.keys(groupedActions).length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No data</div>
          ) : (
            Object.entries(groupedActions).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([action, count], i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span>{action}</span>
                <span style={{ fontWeight: 600 }}>{count}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
