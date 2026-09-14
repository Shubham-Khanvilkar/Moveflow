'use client';
import React, { useState, useEffect, useCallback } from 'react';

import { API_URL } from '../../lib/config';

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px', fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 },
  subtitle: { fontSize: '14px', color: '#6B7280', marginTop: '4px' },
  toolbar: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' },
  viewToggle: { display: 'flex', border: '1px solid #D1D5DB', borderRadius: '6px', overflow: 'hidden' },
  viewBtn: { padding: '8px 14px', fontSize: '13px', cursor: 'pointer', border: 'none', backgroundColor: '#fff', color: '#6B7280', fontWeight: 500 },
  viewBtnActive: { backgroundColor: '#2563EB', color: '#fff' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' },
  card: { backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '20px', transition: 'box-shadow 0.15s', cursor: 'pointer' },
  cardHover: { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
  cardTitle: { fontSize: '16px', fontWeight: 700, color: '#111827', marginBottom: '4px' },
  cardCode: { fontSize: '12px', color: '#6B7280', fontFamily: 'monospace', marginBottom: '8px' },
  cardDetail: { fontSize: '13px', color: '#374151', marginBottom: '4px' },
  cardStats: { display: 'flex', gap: '16px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' },
  stat: { textAlign: 'center' },
  statNum: { fontSize: '20px', fontWeight: 700, color: '#111827' },
  statLabel: { fontSize: '11px', color: '#6B7280', textTransform: 'uppercase' as const },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 },
  badgeGreen: { backgroundColor: '#D1FAE5', color: '#065F46' },
  badgeBlue: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  badgeRed: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#9CA3AF' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  emptyText: { fontSize: '16px', fontWeight: 500, color: '#6B7280' },
  emptySub: { fontSize: '14px', color: '#9CA3AF', marginTop: '4px' },
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px', color: '#6B7280' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modal: { backgroundColor: '#fff', borderRadius: '12px', padding: '24px', width: '500px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '16px' },
  formGroup: { marginBottom: '14px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px' },
  input: { width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box' as const },
  detailPanel: { backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '20px', marginTop: '20px' },
  memberRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #E5E7EB', fontSize: '14px' },
  btn: { padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.15s' },
  btnPrimary: { backgroundColor: '#2563EB', color: '#fff' },
  btnOutline: { backgroundColor: '#fff', color: '#374151', border: '1px solid #D1D5DB' },
  btnDanger: { backgroundColor: '#DC2626', color: '#fff' },
  btnSm: { padding: '4px 10px', fontSize: '12px' },
  btnSuccess: { backgroundColor: '#16A34A', color: '#fff' },
  btnWarning: { backgroundColor: '#D97706', color: '#fff' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '20px', padding: '12px' },
  paginationBtn: { padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: '1px solid #D1D5DB', backgroundColor: '#fff', color: '#374151' },
  paginationBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  paginationInfo: { fontSize: '13px', color: '#6B7280' },
  historyRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid #E5E7EB', fontSize: '13px' },
  thStyle: { padding: '10px 12px', textAlign: 'left' as const, fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' as const, borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB' },
};

interface Team {
  id: string;
  name: string;
  code: string;
  managerId?: string;
  managerName?: string;
  siteId?: string;
  siteName?: string;
  memberCount?: number;
  activeCount?: number;
  inactiveCount?: number;
  isActive?: boolean;
  lastModifiedAt?: string;
  lastModifiedBy?: string;
  members?: { userId: string; name: string; status: string }[];
}

interface TeamPermissions {
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canAddMember?: boolean;
  canRemoveMember?: boolean;
  canToggleActive?: boolean;
}

interface HistoryEntry {
  id: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details?: string;
}

interface Site {
  id: string;
  name: string;
}

interface TeamsPageProps {
  token: string;
  permissions?: TeamPermissions;
}

export default function TeamsPage({ token, permissions }: TeamsPageProps) {
  const perms: TeamPermissions = permissions || {};
  const hasPerm = (key: keyof TeamPermissions) => perms[key] !== false;

  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', managerId: '', siteId: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [sites, setSites] = useState<Site[]>([]);
  const [siteFilter, setSiteFilter] = useState('');
  const [historyTeam, setHistoryTeam] = useState<Team | null>(null);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (siteFilter) params.set('siteId', siteFilter);
      const res = await fetch(`${API_URL}/api/employee-teams?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setTeams(data.data || []); setTotalPages(data.totalPages || 1); }
    } catch { /* ignored */ }
    setLoading(false);
  }, [token, page, limit, siteFilter]);

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/api/employees`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setEmployees(data.data || []); }
    } catch { /* ignored */ }
  };

  const fetchSites = async () => {
    try {
      const res = await fetch(`${API_URL}/api/org/sites`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setSites(data.data || []); }
    } catch { /* ignored */ }
  };

  useEffect(() => { fetchTeams(); fetchEmployees(); fetchSites(); }, [fetchTeams]);

  const fetchTeamDetail = async (teamId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/employee-teams/${teamId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setSelectedTeam(data.data); }
    } catch { /* ignored */ }
  };

  const handleToggleActive = async (team: Team) => {
    try {
      await fetch(`${API_URL}/api/employee-teams/${team.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ isActive: !team.isActive }),
      });
      fetchTeams();
      if (selectedTeam?.id === team.id) fetchTeamDetail(team.id);
    } catch { /* ignored */ }
  };

  const handleExportCSV = async () => {
    try {
      const res = await fetch(`${API_URL}/api/employee-teams?page=1&limit=9999`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const allTeams: Team[] = data.data || [];
      const headers = ['Name', 'Code', 'Manager', 'Site', 'Active Count', 'Inactive Count', 'Active'];
      const rows = allTeams.map(t => [t.name, t.code, t.managerName || '', t.siteName || '', String(t.activeCount ?? 0), String(t.inactiveCount ?? 0), t.isActive ? 'Yes' : 'No']);
      const csv = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `teams-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignored */ }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    if (!window.confirm('Are you sure you want to remove this member from the team?')) return;
    try {
      await fetch(`${API_URL}/api/employee-teams/${teamId}/members/${userId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      fetchTeamDetail(teamId);
    } catch { /* ignored */ }
  };

  const fetchHistory = async (team: Team) => {
    setHistoryTeam(team);
    setHistoryLoading(true);
    setHistoryEntries([]);
    try {
      const res = await fetch(`${API_URL}/api/employee-teams/${team.id}/history`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setHistoryEntries(data.data || []); }
    } catch { /* ignored */ }
    setHistoryLoading(false);
  };

  const handleCreate = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/employee-teams`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (res.ok) { setShowForm(false); setForm({ name: '', code: '', managerId: '', siteId: '' }); fetchTeams(); } else { const e = await res.json(); setError(e.message || 'Failed'); }
    } catch { setError('Failed'); }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!selectedTeam) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/employee-teams/${selectedTeam.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: form.name || selectedTeam.name, code: form.code || selectedTeam.code, managerId: form.managerId || selectedTeam.managerId }),
      });
      if (res.ok) { setShowForm(false); fetchTeams(); fetchTeamDetail(selectedTeam.id); } else { const e = await res.json(); setError(e.message || 'Failed'); }
    } catch { setError('Failed'); }
    setSaving(false);
  };

  const handleAddMember = async (teamId: string, userId: string) => {
    try {
      await fetch(`${API_URL}/api/employee-teams/${teamId}/members`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      fetchTeamDetail(teamId);
    } catch { /* ignored */ }
  };

  const openEdit = (team: Team) => {
    setSelectedTeam(team);
    setForm({ name: team.name, code: team.code, managerId: team.managerId || '', siteId: team.siteId || '' });
    setShowForm(true);
  };

  const filtered = teams.filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.code?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Teams</h1>
          <p style={styles.subtitle}>Manage employee teams and their members</p>
        </div>
        <button style={{ ...styles.btn, ...styles.btnPrimary }} disabled={!hasPerm('canCreate')} onClick={() => { setForm({ name: '', code: '', managerId: '', siteId: '' }); setShowForm(true); }}>+ Create Team</button>
      </div>

      <div style={styles.toolbar}>
        <input style={{ ...styles.input, width: '280px' }} placeholder="Search teams..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...styles.input, width: '180px' }} value={siteFilter} onChange={e => { setSiteFilter(e.target.value); setPage(1); }}>
          <option value="">All Sites</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div style={styles.viewToggle}>
          <button style={{ ...styles.viewBtn, ...(view === 'grid' ? styles.viewBtnActive : {}) }} onClick={() => setView('grid')}>Grid</button>
          <button style={{ ...styles.viewBtn, ...(view === 'list' ? styles.viewBtnActive : {}) }} onClick={() => setView('list')}>List</button>
        </div>
        <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={handleExportCSV}>Export CSV</button>
      </div>

      {loading ? (
        <div style={styles.loading}>Loading teams...</div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>👥</div>
          <div style={styles.emptyText}>No teams found</div>
          <div style={styles.emptySub}>Click &quot;Create Team&quot; to get started</div>
        </div>
      ) : view === 'grid' ? (
        <div style={styles.grid}>
          {filtered.map(team => (
            <div key={team.id} style={styles.card} onClick={() => fetchTeamDetail(team.id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={styles.cardTitle}>{team.name}</div>
                  <div style={styles.cardCode}>{team.code}</div>
                </div>
                <span style={{ ...styles.badge, ...(team.isActive !== false ? styles.badgeGreen : styles.badgeRed) }}>
                  {team.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div style={styles.cardDetail}>Manager: {team.managerName || 'Unassigned'}</div>
              {team.siteName && <div style={styles.cardDetail}>Site: {team.siteName}</div>}
              <div style={styles.cardStats}>
                <div style={styles.stat}>
                  <div style={styles.statNum}>{team.activeCount ?? team.memberCount ?? 0}</div>
                  <div style={styles.statLabel}>Active</div>
                </div>
                <div style={styles.stat}>
                  <div style={{ ...styles.statNum, color: '#DC2626' }}>{team.inactiveCount ?? 0}</div>
                  <div style={styles.statLabel}>Inactive</div>
                </div>
              </div>
              <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {hasPerm('canEdit') && (
                  <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }} onClick={e => { e.stopPropagation(); openEdit(team); }}>Edit</button>
                )}
                {hasPerm('canToggleActive') && (
                  <button
                    style={{ ...styles.btn, ...styles.btnSm, ...(team.isActive !== false ? styles.btnWarning : styles.btnSuccess) }}
                    onClick={e => { e.stopPropagation(); handleToggleActive(team); }}
                  >
                    {team.isActive !== false ? 'Deactivate' : 'Activate'}
                  </button>
                )}
                <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }} onClick={e => { e.stopPropagation(); fetchHistory(team); }}>History</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={styles.thStyle}>Name</th>
                <th style={styles.thStyle}>Code</th>
                <th style={styles.thStyle}>Status</th>
                <th style={styles.thStyle}>Manager</th>
                <th style={styles.thStyle}>Members</th>
                <th style={styles.thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(team => (
                <tr key={team.id} style={{ cursor: 'pointer' }} onClick={() => fetchTeamDetail(team.id)}>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #E5E7EB', fontSize: '14px', fontWeight: 600 }}>{team.name}</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #E5E7EB', fontSize: '13px', fontFamily: 'monospace', color: '#6B7280' }}>{team.code}</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #E5E7EB' }}>
                    <span style={{ ...styles.badge, ...(team.isActive !== false ? styles.badgeGreen : styles.badgeRed) }}>
                      {team.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #E5E7EB', fontSize: '14px' }}>{team.managerName || '—'}</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #E5E7EB' }}>
                    <span style={{ ...styles.badge, ...styles.badgeGreen }}>{team.activeCount ?? 0} active</span>
                    <span style={{ ...styles.badge, ...styles.badgeRed, marginLeft: '4px' }}>{team.inactiveCount ?? 0} inactive</span>
                  </td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {hasPerm('canEdit') && (
                      <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }} onClick={e => { e.stopPropagation(); openEdit(team); }}>Edit</button>
                    )}
                    {hasPerm('canToggleActive') && (
                      <button
                        style={{ ...styles.btn, ...styles.btnSm, ...(team.isActive !== false ? styles.btnWarning : styles.btnSuccess) }}
                        onClick={e => { e.stopPropagation(); handleToggleActive(team); }}
                      >
                        {team.isActive !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                    <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }} onClick={e => { e.stopPropagation(); fetchHistory(team); }}>History</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={styles.pagination}>
        <button
          style={{ ...styles.paginationBtn, ...(page <= 1 ? styles.paginationBtnDisabled : {}) }}
          disabled={page <= 1}
          onClick={() => setPage(p => Math.max(1, p - 1))}
        >
          &larr; Previous
        </button>
        <span style={styles.paginationInfo}>Page {page} of {totalPages}</span>
        <button
          style={{ ...styles.paginationBtn, ...(page >= totalPages ? styles.paginationBtnDisabled : {}) }}
          disabled={page >= totalPages}
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        >
          Next &rarr;
        </button>
      </div>

      {selectedTeam && (
        <div style={styles.detailPanel}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: 0 }}>{selectedTeam.name}</h2>
              <span style={{ fontSize: '13px', color: '#6B7280' }}>{selectedTeam.code} — Manager: {selectedTeam.managerName || 'Unassigned'}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {hasPerm('canAddMember') && (
                <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnPrimary }} onClick={() => setShowAddMember(true)}>+ Add Member</button>
              )}
              {hasPerm('canEdit') && (
                <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }} onClick={() => openEdit(selectedTeam)}>Edit Team</button>
              )}
              <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }} onClick={() => fetchHistory(selectedTeam)}>History</button>
              <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }} onClick={() => setSelectedTeam(null)}>Close</button>
            </div>
          </div>
          {selectedTeam.members && selectedTeam.members.length > 0 ? (
            selectedTeam.members.map(member => (
              <div key={member.userId} style={styles.memberRow}>
                <div>
                  <strong>{member.name}</strong>
                  <span style={{ ...styles.badge, ...(member.status === 'ACTIVE' ? styles.badgeGreen : styles.badgeRed), marginLeft: '8px' }}>{member.status}</span>
                </div>
                {hasPerm('canRemoveMember') && (
                  <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnDanger }} onClick={() => handleRemoveMember(selectedTeam.id, member.userId)}>Remove</button>
                )}
              </div>
            ))
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>No members yet</div>
          )}
        </div>
      )}

      {showForm && (
        <div style={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{selectedTeam ? 'Edit Team' : 'Create Team'}</h3>
            {error && <div style={{ ...styles.badge, ...styles.badgeRed, display: 'block', padding: '8px', marginBottom: '12px' }}>{error}</div>}
            <div style={styles.formGroup}>
              <label style={styles.label}>Team Name</label>
              <input style={styles.input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Team Code</label>
              <input style={styles.input} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="e.g. TEAM-01" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Manager</label>
              <select style={styles.input} value={form.managerId} onChange={e => setForm({ ...form, managerId: e.target.value })}>
                <option value="">Select manager</option>
                {employees.map((emp: any) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setShowForm(false)}>Cancel</button>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={selectedTeam ? handleUpdate : handleCreate} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {showAddMember && selectedTeam && (
        <div style={styles.modalOverlay} onClick={() => setShowAddMember(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Add Member to {selectedTeam.name}</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {employees.filter(emp => !selectedTeam.members?.some(m => m.userId === emp.id)).map(emp => (
                <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #E5E7EB' }}>
                  <span>{emp.name}</span>
                  {hasPerm('canAddMember') && (
                    <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnPrimary }} onClick={() => handleAddMember(selectedTeam.id, emp.id)}>Add</button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setShowAddMember(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {historyTeam && (
        <div style={styles.modalOverlay} onClick={() => setHistoryTeam(null)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Change History — {historyTeam.name}</h3>
            {historyLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>Loading history...</div>
            ) : historyEntries.length > 0 ? (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {historyEntries.map(entry => (
                  <div key={entry.id} style={styles.historyRow}>
                    <div>
                      <strong>{entry.action}</strong>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                        by {entry.performedBy} — {new Date(entry.timestamp).toLocaleString()}
                      </div>
                      {entry.details && <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{entry.details}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>
                {historyTeam.lastModifiedAt ? (
                  <div>
                    <div>Last modified by {historyTeam.lastModifiedBy || 'unknown'}</div>
                    <div>{new Date(historyTeam.lastModifiedAt).toLocaleString()}</div>
                  </div>
                ) : 'No history available'}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setHistoryTeam(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
