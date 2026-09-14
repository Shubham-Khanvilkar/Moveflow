'use client';
import React, { useState, useEffect } from 'react';

import { API_URL } from '../../lib/config';

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px', fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 },
  subtitle: { fontSize: '14px', color: '#6B7280', marginTop: '4px' },
  toolbar: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' },
  btn: { padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.15s' },
  btnPrimary: { backgroundColor: '#2563EB', color: '#fff' },
  btnSecondary: { backgroundColor: '#1E40AF', color: '#fff' },
  btnOutline: { backgroundColor: '#fff', color: '#374151', border: '1px solid #D1D5DB' },
  btnDanger: { backgroundColor: '#DC2626', color: '#fff' },
  btnSuccess: { backgroundColor: '#059669', color: '#fff' },
  btnSm: { padding: '4px 10px', fontSize: '12px' },
  input: { padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' },
  select: { padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' as const, borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB' },
  td: { padding: '10px 12px', borderBottom: '1px solid #E5E7EB', fontSize: '14px' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 },
  badgeGreen: { backgroundColor: '#D1FAE5', color: '#065F46' },
  badgeYellow: { backgroundColor: '#FEF3C7', color: '#92400E' },
  badgeRed: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  badgeBlue: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  badgePurple: { backgroundColor: '#EDE9FE', color: '#5B21B6' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  emptyText: { fontSize: '16px', fontWeight: 500, color: '#6B7280' },
  emptySub: { fontSize: '14px', color: '#9CA3AF', marginTop: '4px' },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px', color: '#6B7280' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', width: '520px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '16px' },
  formGroup: { marginBottom: '14px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' },
};

interface PickupDropEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  time: string;
  type: 'PRIMARY' | 'ADDITIONAL' | 'AD_HOC';
  address: string;
  lat?: number;
  lng?: number;
  nodalPoint?: string;
  remarks?: string;
  status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
  createdAt: string;
}

interface BulkEntry {
  employeeId: string;
  time: string;
  type: 'PRIMARY' | 'ADDITIONAL' | 'AD_HOC';
  address: string;
  nodalPoint: string;
  remarks: string;
}

export default function AdditionalPickupDropPage({ token }: { token: string }) {
  const [entries, setEntries] = useState<PickupDropEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PickupDropEntry | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [form, setForm] = useState({ employeeId: '', time: '', type: 'ADDITIONAL' as const, address: '', lat: '', lng: '', nodalPoint: '', remarks: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [nodalPoints, setNodalPoints] = useState<any[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkEntry[]>([
    { employeeId: '', time: '', type: 'ADDITIONAL', address: '', nodalPoint: '', remarks: '' },
  ]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState('');

  useEffect(() => { fetchEntries(); fetchEmployees(); fetchNodalPoints(); }, [selectedDate, token]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const end = new Date(selectedDate); end.setDate(end.getDate() + 1);
      const res = await fetch(`${API_URL}/api/pickup-drop/range?startDate=${selectedDate}&endDate=${end.toISOString().split('T')[0]}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) { const data = await res.json(); setEntries(data.data?.entries || data.data || []); }
    } catch { /* ignored */ }
    setLoading(false);
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/api/employees`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setEmployees(data.data || []); }
    } catch { /* ignored */ }
  };

  const fetchNodalPoints = async () => {
    try {
      const res = await fetch(`${API_URL}/api/nodal-points`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setNodalPoints(data.data || []); }
    } catch { /* ignored */ }
  };

  const handleCreate = async () => {
    setSaving(true); setError('');
    try {
      const body = { ...form, lat: form.lat ? parseFloat(form.lat) : undefined, lng: form.lng ? parseFloat(form.lng) : undefined };
      const res = await fetch(`${API_URL}/api/pickup-drop`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) { setShowForm(false); resetForm(); fetchEntries(); } else { const e = await res.json(); setError(e.message || 'Failed'); }
    } catch { setError('Failed to create'); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingEntry) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/pickup-drop/${editingEntry.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ time: form.time, address: form.address, lat: form.lat ? parseFloat(form.lat) : undefined, lng: form.lng ? parseFloat(form.lng) : undefined, nodalPoint: form.nodalPoint, remarks: form.remarks }),
      });
      if (res.ok) { setEditingEntry(null); resetForm(); fetchEntries(); } else { const e = await res.json(); setError(e.message || 'Failed'); }
    } catch { setError('Update failed'); }
    setSaving(false);
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this pickup/drop?')) return;
    try {
      await fetch(`${API_URL}/api/pickup-drop/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      fetchEntries();
    } catch { /* ignored */ }
  };

  const handleBulkCreate = async () => {
    const validRows = bulkRows.filter(r => r.employeeId && r.address);
    if (validRows.length === 0) { setBulkError('Add at least one row with employee and address'); return; }
    setBulkSaving(true); setBulkError('');
    try {
      let created = 0;
      for (const row of validRows) {
        const res = await fetch(`${API_URL}/api/pickup-drop`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(row),
        });
        if (res.ok) created++;
      }
      setShowBulkModal(false); setBulkRows([{ employeeId: '', time: '', type: 'ADDITIONAL', address: '', nodalPoint: '', remarks: '' }]); fetchEntries();
      if (created < validRows.length) setBulkError(`Created ${created} of ${validRows.length} entries`);
    } catch { setBulkError('Bulk creation failed'); }
    setBulkSaving(false);
  };

  const exportCSV = () => {
    const headers = ['Employee', 'Time', 'Type', 'Address', 'Nodal Point', 'Status', 'Remarks'];
    const rows = filtered.map(e => [e.employeeName, e.time, e.type, e.address, e.nodalPoint || '', e.status, e.remarks || '']);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `pickup-drop-${selectedDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const openEdit = (entry: PickupDropEntry) => {
    setEditingEntry(entry);
    setForm({ employeeId: entry.employeeId, time: entry.time, type: entry.type as 'ADDITIONAL', address: entry.address, lat: entry.lat?.toString() || '', lng: entry.lng?.toString() || '', nodalPoint: entry.nodalPoint || '', remarks: entry.remarks || '' });
    setShowForm(true);
  };

  const openHistory = async (entry: PickupDropEntry) => {
    setShowHistory(true);
    try {
      const res = await fetch(`${API_URL}/api/pickup-drop/${entry.id}/history`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setHistoryData(data.data || []); } else { setHistoryData([]); }
    } catch { setHistoryData([]); }
  };

  const resetForm = () => {
    setForm({ employeeId: '', time: '', type: 'ADDITIONAL', address: '', lat: '', lng: '', nodalPoint: '', remarks: '' });
  };

  const typeBadge = (type: string) => {
    const map: Record<string, React.CSSProperties> = { PRIMARY: styles.badgeGreen, ADDITIONAL: styles.badgeBlue, AD_HOC: styles.badgePurple };
    return <span style={{ ...styles.badge, ...map[type] || styles.badgeYellow }}>{type}</span>;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, React.CSSProperties> = { ACTIVE: styles.badgeGreen, COMPLETED: styles.badgeBlue, CANCELLED: styles.badgeRed };
    return <span style={{ ...styles.badge, ...map[status] || styles.badgeYellow }}>{status}</span>;
  };

  const filtered = entries.filter(e => {
    if (search && !e.employeeName.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== 'All' && e.type !== filterType) return false;
    if (filterStatus !== 'All' && e.status !== filterStatus) return false;
    return true;
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Pickup / Drop Management</h1>
          <p style={styles.subtitle}>Manage multiple stops for employees</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ ...styles.btn, ...styles.btnSuccess }} onClick={exportCSV}>Export CSV</button>
          <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={() => { setBulkRows([{ employeeId: '', time: '', type: 'ADDITIONAL', address: '', nodalPoint: '', remarks: '' }]); setShowBulkModal(true); }}>Bulk Add</button>
          <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => { resetForm(); setEditingEntry(null); setShowForm(true); }}>+ Add Pickup/Drop</button>
        </div>
      </div>

      <div style={styles.toolbar}>
        <input style={styles.input} type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        <input style={{ ...styles.input, width: '260px' }} placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={styles.select} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="All">All Types</option>
          <option value="PRIMARY">PRIMARY</option>
          <option value="ADDITIONAL">ADDITIONAL</option>
          <option value="AD_HOC">AD_HOC</option>
        </select>
        <select style={styles.select} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📍</div>
          <div style={styles.emptyText}>No pickups/drops for {selectedDate}</div>
          <div style={styles.emptySub}>Click &quot;Add Pickup/Drop&quot; to create one</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Employee</th>
                <th style={styles.th}>Time</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Address</th>
                <th style={styles.th}>Nodal Point</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <tr key={entry.id}>
                  <td style={styles.td}><strong>{entry.employeeName}</strong></td>
                  <td style={styles.td}>{entry.time}</td>
                  <td style={styles.td}>{typeBadge(entry.type)}</td>
                  <td style={{ ...styles.td, maxWidth: '280px' }}>{entry.address}</td>
                  <td style={styles.td}>{entry.nodalPoint || '—'}</td>
                  <td style={styles.td}>{statusBadge(entry.status)}</td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }} onClick={() => openEdit(entry)}>Edit</button>
                      <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnDanger }} onClick={() => handleCancel(entry.id)}>Cancel</button>
                      <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }} onClick={() => openHistory(entry)}>History</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div style={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{editingEntry ? 'Edit Pickup/Drop' : 'Add Pickup/Drop'}</h3>
            {error && <div style={{ ...styles.badge, ...styles.badgeRed, display: 'block', marginBottom: '12px', padding: '8px' }}>{error}</div>}
            <div style={styles.formGroup}>
              <label style={styles.label}>Employee</label>
              <select style={{ ...styles.input, width: '100%' }} value={form.employeeId} onChange={e => setForm({ ...form, employeeId: e.target.value })} disabled={!!editingEntry}>
                <option value="">Select employee</option>
                {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Time</label>
              <input style={{ ...styles.input, width: '100%' }} type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Type</label>
              <select style={{ ...styles.input, width: '100%' }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}>
                {['PRIMARY', 'ADDITIONAL', 'AD_HOC'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Address</label>
              <input style={{ ...styles.input, width: '100%' }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Full address" />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Latitude</label>
                <input style={{ ...styles.input, width: '100%' }} value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} placeholder="28.6139" />
              </div>
              <div style={{ ...styles.formGroup, flex: 1 }}>
                <label style={styles.label}>Longitude</label>
                <input style={{ ...styles.input, width: '100%' }} value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} placeholder="77.2090" />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nodal Point</label>
              <select style={{ ...styles.input, width: '100%' }} value={form.nodalPoint} onChange={e => setForm({ ...form, nodalPoint: e.target.value })}>
                <option value="">Select nodal point</option>
                {nodalPoints.map((np: any) => <option key={np.id} value={np.name}>{np.name}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Remarks</label>
              <input style={{ ...styles.input, width: '100%' }} value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setShowForm(false)}>Cancel</button>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={editingEntry ? handleUpdate : handleCreate} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {showBulkModal && (
        <div style={styles.modalOverlay} onClick={() => setShowBulkModal(false)}>
          <div style={{ ...styles.modal, width: '720px' }} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Bulk Add Pickups/Drops</h3>
            {bulkError && <div style={{ ...styles.badge, ...styles.badgeRed, display: 'block', marginBottom: '12px', padding: '8px' }}>{bulkError}</div>}
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {bulkRows.map((row, idx) => (
                <div key={idx} style={{ border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>Row {idx + 1}</span>
                    {bulkRows.length > 1 && (
                      <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnDanger }} onClick={() => setBulkRows(bulkRows.filter((_, i) => i !== idx))}>Remove</button>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <select style={styles.select} value={row.employeeId} onChange={e => { const r = [...bulkRows]; r[idx] = { ...r[idx], employeeId: e.target.value }; setBulkRows(r); }}>
                      <option value="">Select employee</option>
                      {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                    <input style={styles.input} type="time" value={row.time} onChange={e => { const r = [...bulkRows]; r[idx] = { ...r[idx], time: e.target.value }; setBulkRows(r); }} />
                    <select style={styles.select} value={row.type} onChange={e => { const r = [...bulkRows]; r[idx] = { ...r[idx], type: e.target.value as any }; setBulkRows(r); }}>
                      {['PRIMARY', 'ADDITIONAL', 'AD_HOC'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input style={styles.input} placeholder="Address" value={row.address} onChange={e => { const r = [...bulkRows]; r[idx] = { ...r[idx], address: e.target.value }; setBulkRows(r); }} />
                    <select style={styles.select} value={row.nodalPoint} onChange={e => { const r = [...bulkRows]; r[idx] = { ...r[idx], nodalPoint: e.target.value }; setBulkRows(r); }}>
                      <option value="">Select nodal point</option>
                      {nodalPoints.map((np: any) => <option key={np.id} value={np.name}>{np.name}</option>)}
                    </select>
                    <input style={styles.input} placeholder="Remarks" value={row.remarks} onChange={e => { const r = [...bulkRows]; r[idx] = { ...r[idx], remarks: e.target.value }; setBulkRows(r); }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setBulkRows([...bulkRows, { employeeId: '', time: '', type: 'ADDITIONAL', address: '', nodalPoint: '', remarks: '' }])}>+ Add Row</button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setShowBulkModal(false)}>Cancel</button>
                <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleBulkCreate} disabled={bulkSaving}>{bulkSaving ? 'Saving...' : 'Create All'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div style={styles.modalOverlay} onClick={() => setShowHistory(false)}>
          <div style={{ ...styles.modal, width: '600px' }} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Pickup/Drop History</h3>
            {historyData.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>No history available</div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {historyData.map((h: any, i: number) => (
                  <div key={i} style={{ padding: '10px', borderBottom: '1px solid #E5E7EB', fontSize: '13px' }}>
                    <strong>{h.action}</strong> — {h.address || ''}
                    <div style={{ color: '#6B7280', fontSize: '12px' }}>{h.timestamp}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setShowHistory(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
