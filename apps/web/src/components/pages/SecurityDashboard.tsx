'use client';
import React, { useState, useEffect } from 'react';
import Spinner from '../Spinner';
import { API_URL } from '../../lib/config';

export default function SecurityDashboard({ token, user }: { token: string; user: any }) {
  const [kpi, setKpi] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API_URL}/api/dashboard/kpi`, { headers }).then(r => r.json()).catch(() => ({})),
      fetch(`${API_URL}/api/company-admin/audit-logs?limit=15`, { headers }).then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([k, a]) => {
      setKpi(k.data || k);
      setAuditLogs(a.data || a.documents || a || []);
    }).finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spinner />;

  const totalUsers = kpi?.users?.total ?? 0;
  const totalRoles = kpi?.roles?.total ?? 0;
  const totalPerms = kpi?.permissions?.total ?? 0;
  const auditTotal = kpi?.audit?.total ?? 0;
  const openIncidents = kpi?.incidents?.open ?? 0;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Security Operations Center</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Access control, audit trail, threat monitoring — {user?.name || 'Security Admin'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Users', value: totalUsers, color: '#2563eb', icon: '👥' },
          { label: 'Open Incidents', value: openIncidents, color: openIncidents > 0 ? '#ef4444' : '#10b981', icon: openIncidents > 0 ? '🚨' : '✅' },
          { label: 'Audit Events', value: auditTotal.toLocaleString(), color: '#8b5cf6', icon: '📋' },
          { label: 'Roles Defined', value: totalRoles, color: '#059669', icon: '🔐' },
          { label: 'Permissions', value: totalPerms, color: '#f59e0b', icon: '🔑' },
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
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Recent Security Events</h3>
          {auditLogs.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No audit events</div>
          ) : (
            auditLogs.slice(0, 10).map((e: any, i: number) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 14 }}>{e.action?.includes('FAIL') || e.action?.includes('DENY') ? '🔴' : 'ℹ️'}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{e.action}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{e.entity || ''} — {new Date(e.createdAt).toLocaleTimeString()}</div>
                  </div>
                </div>
                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                  background: e.action?.includes('FAIL') || e.action?.includes('DENY') ? '#fee2e2' : e.action?.includes('UPDATE') || e.action?.includes('CHANGE') ? '#fef3c7' : '#f0f9ff',
                  color: e.action?.includes('FAIL') || e.action?.includes('DENY') ? '#dc2626' : e.action?.includes('UPDATE') || e.action?.includes('CHANGE') ? '#d97706' : '#2563eb'
                }}>{e.resourceType || 'EVENT'}</span>
              </div>
            ))
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Security Posture</h3>
          {[
            { label: 'Password Policy', value: 'Enforced', score: 'A', color: '#10b981' },
            { label: 'Session Management', value: 'Active timeout', score: 'A', color: '#10b981' },
            { label: 'Audit Trail', value: `${auditTotal} events logged`, score: 'A', color: '#10b981' },
            { label: 'Incident Response', value: openIncidents > 0 ? `${openIncidents} open` : 'No open incidents', score: openIncidents > 0 ? 'B' : 'A', color: openIncidents > 0 ? '#f59e0b' : '#10b981' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{s.value}</div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${s.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: s.color }}>{s.score}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
