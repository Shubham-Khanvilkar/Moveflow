'use client';
import { useState, useEffect } from 'react';

import { API_URL } from '../../lib/config';

const PAGES: Record<string, {icon: string, title: string, desc: string, color: string}> = {
  AuditLogCompliancePage: { icon: '📊', title: 'Compliance Audit Trail', desc: 'Monitor compliance adherence and regulatory requirements', color: '#0891b2' },
  TicketsPage: { icon: '🎫', title: 'Support Tickets', desc: 'Manage and resolve transport support issues', color: '#7c3aed' },
  CompaniesPage: { icon: '🏢', title: 'Company Management', desc: 'Create and manage customer companies', color: '#2563eb' }
};

export default function AuditLogCompliancePage({ token }: { token: string }) {
  const info = PAGES['AuditLogCompliancePage'];
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoints: Record<string, string> = {
      AuditLogCompliancePage: '/api/audit',
      CompaniesPage: '/api/platform/companies'
    };
    const url = endpoints['AuditLogCompliancePage'] || '/api/audit';
    fetch(`${API_URL}${url}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(d => {
      const raw = d?.data;
      setData(Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{info.icon} {info.title}</h1>
      <p style={{ color: '#6b7280', marginBottom: 20 }}>{info.desc}</p>
      {loading ? <p style={{ color: '#6b7280' }}>Loading...</p> : data.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>{info.icon}</div>
          <h3 style={{ color: '#374151', marginTop: 12 }}>No records yet</h3>
          <p style={{ color: '#6b7280' }}>Data will appear here as records are created.</p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
          <p style={{ color: '#6b7280' }}>{data.length} record(s) found.</p>
        </div>
      )}
    </div>
  );
}
