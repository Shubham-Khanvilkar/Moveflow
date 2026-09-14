'use client';
import React, { useState, useEffect, useCallback } from 'react';

import { API_URL } from '../../lib/config';

type Tab = 'sites' | 'lobs' | 'processes' | 'shifts';

export default function OrganizationPage({ token }: { token: string }) {
  const [tab, setTab] = useState<Tab>('sites');
  const [sites, setSites] = useState<any[]>([]);
  const [lobs, setLobs] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<any>({});

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [s, l, p, sh] = await Promise.all([
      fetch(`${API_URL}/api/org/sites`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_URL}/api/org/lobs`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_URL}/api/org/processes`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_URL}/api/admin/shifts`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]);
    setSites(s.data || []); setLobs(l.data || []); setProcesses(p.data || []); setShifts(sh.data || []);
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const tabs: { key: Tab; label: string; icon: string; data: any[] }[] = [
    { key: 'sites', label: 'Sites', icon: '📍', data: sites },
    { key: 'lobs', label: 'LOBs', icon: '📋', data: lobs },
    { key: 'processes', label: 'Processes', icon: '⚙️', data: processes },
    { key: 'shifts', label: 'Shifts', icon: '⏰', data: shifts },
  ];

  const fields: Record<Tab, { key: string; label: string; type?: string }[]> = {
    sites: [{ key: 'siteName', label: 'Site Name' }, { key: 'siteCode', label: 'Code' }, { key: 'city', label: 'City' }, { key: 'address', label: 'Address' }],
    lobs: [{ key: 'lobName', label: 'LOB Name' }, { key: 'lobCode', label: 'Code' }],
    processes: [{ key: 'processName', label: 'Process Name' }, { key: 'processCode', label: 'Code' }],
    shifts: [{ key: 'name', label: 'Shift Name' }, { key: 'startTime', label: 'Start Time', type: 'time' }, { key: 'endTime', label: 'End Time', type: 'time' }],
  };

  const getName = (item: any) => item.siteName || item.lobName || item.processName || item.name || item.id;
  const getCode = (item: any) => item.siteCode || item.lobCode || item.processCode || '';

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 24px' }}>Organization Structure</h2>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 10, padding: 4, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setForm({}); setShowCreate(false); }}
            style={{ flex: 1, padding: '10px 16px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: tab === t.key ? 'white' : 'transparent', color: tab === t.key ? '#111827' : '#6b7280',
              boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
            {t.icon} {t.label} ({t.data.length})
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => { setShowCreate(true); setForm({}); }}
          style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          + Add {tabs.find(t => t.key === tab)?.label.slice(0, -1)}
        </button>
      </div>

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div> : (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Name</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Code</th>
                {tab === 'sites' && <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>City</th>}
                {tab === 'shifts' && <><th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Start</th><th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>End</th></>}
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(tab === 'sites' ? sites : tab === 'lobs' ? lobs : tab === 'processes' ? processes : shifts).map((item: any) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{getName(item)}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#6b7280' }}>{getCode(item)}</td>
                  {tab === 'sites' && <td style={{ padding: '12px 16px', color: '#6b7280' }}>{item.city || '-'}</td>}
                  {tab === 'shifts' && <><td style={{ padding: '12px 16px', color: '#6b7280' }}>{item.startTime || '-'}</td><td style={{ padding: '12px 16px', color: '#6b7280' }}>{item.endTime || '-'}</td></>}
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#d1fae5', color: '#065f46' }}>Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(tab === 'sites' ? sites : tab === 'lobs' ? lobs : tab === 'processes' ? processes : shifts).length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>No {tab} configured</div>
          )}
        </div>
      )}

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>Add {tabs.find(t => t.key === tab)?.label.slice(0, -1)}</h3>
            {fields[tab].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input type={f.type || 'text'} value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '10px 0', background: '#f3f4f6', border: '1px solid #e5e77', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
              <button style={{ flex: 1, padding: '10px 0', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
