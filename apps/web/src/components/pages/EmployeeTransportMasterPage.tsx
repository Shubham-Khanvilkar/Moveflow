'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../lib/config';

interface OrgData {
  sites: { id: string; siteCode: string; siteName: string }[];
  lobs: { id: string; lobCode: string; lobName: string }[];
  processes: { id: string; processCode: string; processName: string }[];
  shifts: { id: string; name: string; startTime: string; endTime: string }[];
  departments: { id: string; name: string }[];
  teams: { id: string; name: string }[];
}

interface EmployeeAddress {
  id: string; label: string; type: string; status: string;
  address: string; latitude: number; longitude: number;
  effectiveFrom?: string; effectiveTo?: string; isVerified?: boolean;
}

interface HistoryEntry {
  id: string; actor: string; timestamp: string; action: string;
  oldValue?: string; newValue?: string; reason?: string;
}

type ProfileTab = 'personal' | 'address' | 'details' | 'history' | 'settings';

const EMPTY_FORM = {
  email: '', name: '', phone: '', employeeId: '', gender: '', designation: '', employmentType: 'FULL_TIME',
  siteId: '', processId: '', lobId: '', shiftId: '', teamId: '', departmentId: '', managerId: '', teamLeaderId: '',
  transportEligibility: 'ELIGIBLE', homeAddress: '', homeLatitude: 0, homeLongitude: 0,
  pickupLatitude: 0, pickupLongitude: 0, pickupAddress: '', dropLatitude: 0, dropLongitude: 0, dropAddress: '',
  locationType: 'RESIDENTIAL', preferredNodalPoint: '', emergencyContactName: '', emergencyContactPhone: '',
  alternateMobile: '', specialNeeds: '', project: '', businessUnit: '', costCentre: '',
  employmentStatus: '', dateFrom: '', dateTo: '',
  cabAllowed: true, shuttleAllowed: true, acAllowed: true, maxDistance: 50,
  emailNotifications: true, smsNotifications: true, pushNotifications: true,
};

export default function EmployeeTransportMasterPage({ token }: { token: string }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [orgData, setOrgData] = useState<OrgData>({ sites: [], lobs: [], processes: [], shifts: [], departments: [], teams: [] });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editEmployee, setEditEmployee] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [filterEligibility, setFilterEligibility] = useState('');
  const [filterStatus, setFilterStatus] = useState('ACTIVE');
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [viewEmployee, setViewEmployee] = useState<any>(null);
  const [employeeAddresses, setEmployeeAddresses] = useState<EmployeeAddress[]>([]);
  const [employeeHistory, setEmployeeHistory] = useState<HistoryEntry[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [empRes, sitesRes, lobsRes, procsRes, shiftsRes, deptsRes, teamsRes] = await Promise.all([
      fetch(`${API_URL}/api/admin/users?limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/org/sites`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/org/lobs`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/org/processes`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/org/shifts`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/admin/departments`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/admin/business-units`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const [emp, sites, lobs, procs, shifts, depts, teams] = await Promise.all([
      empRes.json(), sitesRes.json(), lobsRes.json(), procsRes.json(), shiftsRes.json(), deptsRes.json(), teamsRes.json(),
    ]);
    setEmployees(emp.data || emp || []);
    setOrgData({
      sites: sites.data || sites || [], lobs: lobs.data || lobs || [], processes: procs.data || procs || [],
      shifts: shifts.data || shifts || [], departments: depts.data || depts || [], teams: teams.data || teams || [],
    });
    setLoading(false);
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = async () => {
    if (!form.email || !form.name) { setError('Email and name are required'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/users`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: 'EMPLOYEE', password: 'Temp@123' }),
      });
      const data = await res.json();
      if (res.ok) { setSuccess('Employee created successfully'); setShowCreate(false); setForm(EMPTY_FORM); loadData(); }
      else setError(data.message || 'Failed to create employee');
    } catch { setError('Network error'); }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editEmployee) return;
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${editEmployee.id}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) { setSuccess('Employee updated'); setEditEmployee(null); loadData(); }
      else setError(data.message || 'Failed to update');
    } catch { setError('Network error'); }
    setSaving(false);
  };

  const handleSuspend = async (userId: string) => {
    if (!confirm('Suspend this employee?')) return;
    try {
      await fetch(`${API_URL}/api/admin/users/${userId}/suspend`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Transport offboarded by admin' }),
      });
      setSuccess('Employee suspended'); loadData();
    } catch { /* ignored */ }
  };

  const handleReactivate = async (userId: string) => {
    try {
      await fetch(`${API_URL}/api/admin/users/${userId}/reactivate`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess('Employee reactivated'); loadData();
    } catch { /* ignored */ }
  };

  const fetchAddresses = async (userId: string) => {
    setLoadingAddresses(true);
    try {
      const res = await fetch(`${API_URL}/api/employee-addresses/user/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setEmployeeAddresses(data.data || data || []);
    } catch { setEmployeeAddresses([]); }
    setLoadingAddresses(false);
  };

  const fetchHistory = async (userId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_URL}/api/employee-history/${userId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setEmployeeHistory(data.data || data || []);
    } catch { setEmployeeHistory([]); }
    setLoadingHistory(false);
  };

  const openView = async (emp: any) => {
    const res = await fetch(`${API_URL}/api/admin/users/${emp.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const u = data.data || data;
    setViewEmployee(u);
    setActiveTab('personal');
    fetchAddresses(u.id);
    fetchHistory(u.id);
  };

  const openEdit = async (emp: any) => {
    const res = await fetch(`${API_URL}/api/admin/users/${emp.id}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const u = data.data || data;
    setForm({
      email: u.email || '', name: u.name || '', phone: u.phone || '', employeeId: u.employeeId || '',
      gender: u.gender || '', designation: u.designation || '', employmentType: u.employmentType || 'FULL_TIME',
      siteId: u.siteId || '', processId: u.processId || '', lobId: u.lobId || '', shiftId: u.shiftId || '',
      teamId: u.teamId || '', departmentId: u.departmentId || '', managerId: u.managerId || '', teamLeaderId: u.teamLeaderId || '',
      transportEligibility: u.transportEligibility || 'ELIGIBLE', homeAddress: u.homeAddress || '',
      homeLatitude: u.homeLatitude || 0, homeLongitude: u.homeLongitude || 0,
      pickupLatitude: u.pickupLatitude || 0, pickupLongitude: u.pickupLongitude || 0, pickupAddress: u.pickupAddress || '',
      dropLatitude: u.dropLatitude || 0, dropLongitude: u.dropLongitude || 0, dropAddress: u.dropAddress || '',
      locationType: u.locationType || 'RESIDENTIAL', preferredNodalPoint: u.preferredNodalPoint || '',
      emergencyContactName: u.emergencyContactName || '', emergencyContactPhone: u.emergencyContactPhone || '',
      alternateMobile: u.alternateMobile || '', specialNeeds: u.specialNeeds || '',
      project: u.project || '', businessUnit: u.businessUnit || '', costCentre: u.costCentre || '',
      employmentStatus: u.employmentStatus || '', dateFrom: u.dateFrom || '', dateTo: u.dateTo || '',
      cabAllowed: u.cabAllowed !== false, shuttleAllowed: u.shuttleAllowed !== false,
      acAllowed: u.acAllowed !== false, maxDistance: u.maxDistance || 50,
      emailNotifications: u.emailNotifications !== false, smsNotifications: u.smsNotifications !== false,
      pushNotifications: u.pushNotifications !== false,
    });
    setEditEmployee(u);
    setActiveTab('personal');
    fetchAddresses(u.id);
    fetchHistory(u.id);
  };

  const filteredEmployees = employees.filter(e => {
    if (search && !e.name?.toLowerCase().includes(search.toLowerCase()) && !e.email?.toLowerCase().includes(search.toLowerCase()) && !e.employeeId?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && e.status !== filterStatus) return false;
    return true;
  });

  const ProfileTabs = ({ employee, isEdit }: { employee: any; isEdit: boolean }) => {
    if (!employee) return null;

    const tabButtonStyle = (tab: ProfileTab): React.CSSProperties => ({
      padding: '10px 20px', border: 'none', borderRadius: '8px 8px 0 0', fontSize: 13, fontWeight: 600, cursor: 'pointer',
      background: activeTab === tab ? '#2563eb' : '#f1f5f9', color: activeTab === tab ? 'white' : '#64748b',
      transition: 'all 0.2s',
    });

    return (
      <div>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', borderRadius: 12, padding: 20, marginBottom: 16, color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px' }}>{employee.name}</h3>
              <p style={{ fontSize: 12, opacity: 0.9, margin: '0 0 8px' }}>{employee.designation || 'No Designation'}</p>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, opacity: 0.85 }}>
                <span>🏢 {employee.site?.siteName || employee.siteId || 'N/A'}</span>
                <span>📧 {employee.email}</span>
                <span>📱 {employee.phone || 'N/A'}</span>
                <span>🆔 {employee.employeeId || 'N/A'}</span>
                <span>👤 {employee.employmentType || 'N/A'}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: employee.status === 'ACTIVE' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)', color: employee.status === 'ACTIVE' ? '#d1fae5' : '#fecaca' }}>
                {employee.status}
              </span>
              <span style={{ padding: '4px 12px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: employee.transportEligibility === 'ELIGIBLE' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)', color: employee.transportEligibility === 'ELIGIBLE' ? '#d1fae5' : '#fef3c7' }}>
                {employee.transportEligibility}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #e2e8f0', paddingBottom: 0 }}>
          {(['personal', 'address', 'details', 'history', 'settings'] as ProfileTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={tabButtonStyle(tab)}>
              {tab === 'personal' ? '👤 Personal Info' : tab === 'address' ? '📍 Address' : tab === 'details' ? '📋 More Details' : tab === 'history' ? '📜 History' : '⚙️ Settings'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 20, minHeight: 400 }}>
          {/* Tab 1: Personal Info */}
          {activeTab === 'personal' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { label: 'Employee Name', value: employee.name },
                { label: 'Employee ID', value: employee.employeeId || '—' },
                { label: 'Email', value: employee.email },
                { label: 'Mobile Number', value: employee.phone || '—' },
                { label: 'Alternate Mobile', value: employee.alternateMobile || '—' },
                { label: 'Gender', value: employee.gender || '—' },
                { label: 'Designation', value: employee.designation || '—' },
                { label: 'Office/Site', value: employee.site?.siteName || employee.siteId || '—' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 8, padding: 14, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{item.value}</div>
                </div>
              ))}
              <div style={{ gridColumn: 'span 3', background: 'white', borderRadius: 8, padding: 14, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>Special Need / Accessibility</div>
                <div style={{ fontSize: 13, color: '#1e293b', minHeight: 60 }}>{employee.specialNeeds || 'No special requirements noted'}</div>
              </div>
            </div>
          )}

          {/* Tab 2: Address */}
          {activeTab === 'address' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1e293b' }}>📍 Addresses</h4>
                {isEdit && (
                  <button style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>+ Add Address</button>
                )}
              </div>
              {loadingAddresses ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading addresses...</div>
              ) : employeeAddresses.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', background: 'white', borderRadius: 8 }}>No addresses found</div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {employeeAddresses.map(addr => (
                    <div key={addr.id} style={{ background: 'white', borderRadius: 8, padding: 16, border: '1px solid #e2e8f0', borderLeft: `4px solid ${addr.type === 'PRIMARY' ? '#2563eb' : addr.type === 'SECONDARY' ? '#10b981' : '#f59e0b'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>{addr.label}</span>
                            <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: addr.type === 'PRIMARY' ? '#dbeafe' : addr.type === 'SECONDARY' ? '#d1fae5' : '#fef3c7', color: addr.type === 'PRIMARY' ? '#1e40af' : addr.type === 'SECONDARY' ? '#065f46' : '#92400e' }}>{addr.type}</span>
                            <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: addr.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2', color: addr.status === 'ACTIVE' ? '#16a34a' : '#dc2626' }}>{addr.status}</span>
                            {addr.isVerified && <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600, background: '#dbeafe', color: '#1e40af' }}>✓ Verified</span>}
                          </div>
                          <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>{addr.address}</div>
                          <div style={{ fontSize: 11, color: '#94a3b8' }}>Lat: {addr.latitude}, Lng: {addr.longitude}</div>
                          {addr.effectiveFrom && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Effective: {addr.effectiveFrom}{addr.effectiveTo ? ` → ${addr.effectiveTo}` : ' → Ongoing'}</div>}
                        </div>
                        {isEdit && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button style={{ padding: '4px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Edit</button>
                            <button style={{ padding: '4px 10px', background: addr.status === 'ACTIVE' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${addr.status === 'ACTIVE' ? '#fecaca' : '#bbf7d0'}`, borderRadius: 6, fontSize: 11, cursor: 'pointer', color: addr.status === 'ACTIVE' ? '#dc2626' : '#16a34a' }}>
                              {addr.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: More Details */}
          {activeTab === 'details' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[
                { label: 'Reporting Manager', value: employee.manager?.name || employee.managerId || '—' },
                { label: 'Project', value: employee.project || '—' },
                { label: 'Business Unit', value: employee.businessUnit || '—' },
                { label: 'Cost Centre', value: employee.costCentre || '—' },
                { label: 'Department', value: employee.department?.name || employee.departmentId || '—' },
                { label: 'Team', value: employee.team?.name || employee.teamId || '—' },
                { label: 'Site', value: employee.site?.siteName || employee.siteId || '—' },
                { label: 'Process', value: employee.process?.processName || employee.processId || '—' },
                { label: 'Employment Status', value: employee.employmentStatus || employee.status || '—' },
                { label: 'Transport Eligibility', value: employee.transportEligibility || '—' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 8, padding: 14, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontSize: 13, color: '#1e293b', fontWeight: 500 }}>{item.value}</div>
                </div>
              ))}
              <div style={{ gridColumn: 'span 3', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ background: 'white', borderRadius: 8, padding: 14, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>Effective From</div>
                  <div style={{ fontSize: 13, color: '#1e293b' }}>{employee.dateFrom || '—'}</div>
                </div>
                <div style={{ background: 'white', borderRadius: 8, padding: 14, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>Effective To</div>
                  <div style={{ fontSize: 13, color: '#1e293b' }}>{employee.dateTo || '—'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: History */}
          {activeTab === 'history' && (
            <div>
              <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: '#1e293b' }}>📜 Change History</h4>
              {loadingHistory ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading history...</div>
              ) : employeeHistory.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', background: 'white', borderRadius: 8 }}>No history records found</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {employeeHistory.map(entry => (
                    <div key={entry.id} style={{ background: 'white', borderRadius: 8, padding: 14, border: '1px solid #e2e8f0', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ minWidth: 140 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b' }}>{entry.actor}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(entry.timestamp).toLocaleString()}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: entry.action.includes('CREATE') ? '#dcfce7' : entry.action.includes('UPDATE') ? '#dbeafe' : entry.action.includes('DELETE') || entry.action.includes('SUSPEND') ? '#fee2e2' : '#f3f4f6', color: entry.action.includes('CREATE') ? '#16a34a' : entry.action.includes('UPDATE') ? '#1e40af' : entry.action.includes('DELETE') || entry.action.includes('SUSPEND') ? '#dc2626' : '#6b7280' }}>
                          {entry.action}
                        </span>
                        {entry.oldValue && <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>From: {entry.oldValue}</div>}
                        {entry.newValue && <div style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>To: {entry.newValue}</div>}
                        {entry.reason && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, fontStyle: 'italic' }}>Reason: {entry.reason}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Settings */}
          {activeTab === 'settings' && (
            <div style={{ display: 'grid', gap: 20 }}>
              <div style={{ background: 'white', borderRadius: 8, padding: 16, border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>🚐 Transport Preferences</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {[
                    { label: 'Cab Allowed', key: 'cabAllowed', value: employee.cabAllowed !== false },
                    { label: 'Shuttle Allowed', key: 'shuttleAllowed', value: employee.shuttleAllowed !== false },
                    { label: 'AC Allowed', key: 'acAllowed', value: employee.acAllowed !== false },
                  ].map(item => (
                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                      <div style={{ width: 44, height: 24, borderRadius: 12, background: item.value ? '#2563eb' : '#d1d5db', position: 'relative', cursor: 'pointer' }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: item.value ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                      </div>
                      <span style={{ fontSize: 13, color: '#475569' }}>{item.label}</span>
                    </div>
                  ))}
                  <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Max Distance (km)</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>{employee.maxDistance || 50} km</div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'white', borderRadius: 8, padding: 16, border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#1e293b' }}>🔔 Notification Preferences</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  {[
                    { label: 'Email Notifications', key: 'emailNotifications', value: employee.emailNotifications !== false, icon: '📧' },
                    { label: 'SMS Notifications', key: 'smsNotifications', value: employee.smsNotifications !== false, icon: '💬' },
                    { label: 'Push Notifications', key: 'pushNotifications', value: employee.pushNotifications !== false, icon: '🔔' },
                  ].map(item => (
                    <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                      <div style={{ width: 44, height: 24, borderRadius: 12, background: item.value ? '#2563eb' : '#d1d5db', position: 'relative', cursor: 'pointer' }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: item.value ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                      </div>
                      <span style={{ fontSize: 13, color: '#475569' }}>{item.icon} {item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const FormFields = ({ isEdit = false }: { isEdit?: boolean }) => (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Identity */}
      <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 8 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px', color: '#2563eb' }}>👤 Identity</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { key: 'name', label: 'Full Name *', type: 'text' },
            { key: 'email', label: 'Email *', type: 'email' },
            { key: 'phone', label: 'Phone', type: 'tel' },
            { key: 'alternateMobile', label: 'Alternate Mobile', type: 'tel' },
            { key: 'employeeId', label: 'Employee ID', type: 'text' },
            { key: 'gender', label: 'Gender', type: 'select', options: ['', 'MALE', 'FEMALE', 'OTHER'] },
            { key: 'designation', label: 'Designation', type: 'text' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>{f.label}</label>
              {f.type === 'select' ? (
                <select value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}>
                  {(f.options || []).map(o => <option key={o} value={o}>{o || 'Select...'}</option>)}
                </select>
              ) : (
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Special Need / Accessibility</label>
          <textarea value={form.specialNeeds} onChange={e => setForm({ ...form, specialNeeds: e.target.value })} rows={3}
            style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box', resize: 'vertical' }} />
        </div>
      </div>

      {/* Organization */}
      <div style={{ padding: '12px 16px', background: '#f0fdf4', borderRadius: 8 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px', color: '#059669' }}>🏢 Organization</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Site</label>
            <select value={form.siteId} onChange={e => setForm({ ...form, siteId: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}>
              <option value="">Select Site</option>
              {orgData.sites.map(s => <option key={s.id} value={s.id}>{s.siteCode} — {s.siteName}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>LOB</label>
            <select value={form.lobId} onChange={e => setForm({ ...form, lobId: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}>
              <option value="">Select LOB</option>
              {orgData.lobs.map(l => <option key={l.id} value={l.id}>{l.lobCode} — {l.lobName}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Process</label>
            <select value={form.processId} onChange={e => setForm({ ...form, processId: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}>
              <option value="">Select Process</option>
              {orgData.processes.map(p => <option key={p.id} value={p.id}>{p.processCode} — {p.processName}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Shift</label>
            <select value={form.shiftId} onChange={e => setForm({ ...form, shiftId: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}>
              <option value="">Select Shift</option>
              {orgData.shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Department</label>
            <select value={form.departmentId} onChange={e => setForm({ ...form, departmentId: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}>
              <option value="">Select Department</option>
              {orgData.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Team</label>
            <select value={form.teamId} onChange={e => setForm({ ...form, teamId: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}>
              <option value="">Select Team</option>
              {orgData.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Project</label>
            <input value={form.project} onChange={e => setForm({ ...form, project: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Business Unit</label>
            <input value={form.businessUnit} onChange={e => setForm({ ...form, businessUnit: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Cost Centre</label>
            <input value={form.costCentre} onChange={e => setForm({ ...form, costCentre: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Employment Status</label>
            <input value={form.employmentStatus} onChange={e => setForm({ ...form, employmentStatus: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
        </div>
      </div>

      {/* Transport */}
      <div style={{ padding: '12px 16px', background: '#eff6ff', borderRadius: 8 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px', color: '#2563eb' }}>🚐 Transport</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Eligibility *</label>
            <select value={form.transportEligibility} onChange={e => setForm({ ...form, transportEligibility: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}>
              <option value="ELIGIBLE">ELIGIBLE</option>
              <option value="INELIGIBLE">INELIGIBLE</option>
              <option value="CONDITIONAL">CONDITIONAL</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Location Type</label>
            <select value={form.locationType} onChange={e => setForm({ ...form, locationType: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }}>
              <option value="RESIDENTIAL">Residential</option>
              <option value="NODAL">Nodal Point</option>
              <option value="OFFICE">Office</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Preferred Nodal Point</label>
            <input value={form.preferredNodalPoint} onChange={e => setForm({ ...form, preferredNodalPoint: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Home Address</label>
            <input value={form.homeAddress} onChange={e => setForm({ ...form, homeAddress: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Pickup Address</label>
            <input value={form.pickupAddress} onChange={e => setForm({ ...form, pickupAddress: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12 }}>
          {[
            { key: 'pickupLatitude', label: 'Pickup Lat', type: 'number' },
            { key: 'pickupLongitude', label: 'Pickup Lng', type: 'number' },
            { key: 'dropLatitude', label: 'Drop Lat', type: 'number' },
            { key: 'dropLongitude', label: 'Drop Lng', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>{f.label}</label>
              <input type="number" step="0.0001" value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Effective From</label>
            <input type="date" value={form.dateFrom} onChange={e => setForm({ ...form, dateFrom: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Effective To</label>
            <input type="date" value={form.dateTo} onChange={e => setForm({ ...form, dateTo: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
        </div>
      </div>

      {/* Emergency */}
      <div style={{ padding: '12px 16px', background: '#fef2f2', borderRadius: 8 }}>
        <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 12px', color: '#dc2626' }}>🆘 Emergency Contact</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Contact Name</label>
            <input value={form.emergencyContactName} onChange={e => setForm({ ...form, emergencyContactName: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' }}>Contact Phone</label>
            <input value={form.emergencyContactPhone} onChange={e => setForm({ ...form, emergencyContactPhone: e.target.value })}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 12, boxSizing: 'border-box' }} />
          </div>
        </div>
      </div>

      {/* Submit */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={() => { setShowCreate(false); setEditEmployee(null); setForm(EMPTY_FORM); setError(''); }}
          style={{ padding: '10px 20px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
        <button onClick={isEdit ? handleEdit : handleCreate} disabled={saving}
          style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
          {saving ? 'Saving...' : isEdit ? 'Update Employee' : 'Create Employee'}
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
      {success && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{success}</div>}

      {/* Create Modal */}
      {showCreate && !editEmployee && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '90%', maxWidth: 900, maxHeight: '85vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 20px' }}>➕ Create New Employee</h3>
            <FormFields isEdit={false} />
          </div>
        </div>
      )}

      {/* Profile/Edit Modal with Tabs */}
      {editEmployee && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '95%', maxWidth: 1100, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>✏️ Edit Employee Profile</h3>
              <button onClick={() => { setEditEmployee(null); setForm(EMPTY_FORM); setError(''); }}
                style={{ padding: '6px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>✕ Close</button>
            </div>
            <ProfileTabs employee={editEmployee} isEdit={true} />
            {/* Edit Form Actions */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
              <button onClick={() => { setEditEmployee(null); setForm(EMPTY_FORM); setError(''); }}
                style={{ padding: '10px 20px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleEdit} disabled={saving}
                style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer' }}>
                {saving ? 'Saving...' : 'Update Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Profile Modal */}
      {viewEmployee && !editEmployee && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '95%', maxWidth: 1100, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>👁 Employee Profile</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { openEdit(viewEmployee); setViewEmployee(null); }}
                  style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✏️ Edit</button>
                <button onClick={() => setViewEmployee(null)}
                  style={{ padding: '6px 14px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>✕ Close</button>
              </div>
            </div>
            <ProfileTabs employee={viewEmployee} isEdit={false} />
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>👤 Employee Transport Master</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Manage employee profiles, transport eligibility, and organizational assignment</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setForm(EMPTY_FORM); setShowCreate(true); }}
            style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>➕ Add Employee</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Employees', value: employees.length, color: '#2563eb' },
          { label: 'Active', value: employees.filter(e => e.status === 'ACTIVE').length, color: '#10b981' },
          { label: 'Transport Eligible', value: employees.filter(e => e.transportEligibility === 'ELIGIBLE').length, color: '#8b5cf6' },
          { label: 'Suspended', value: employees.filter(e => e.status === 'SUSPENDED').length, color: '#ef4444' },
          { label: 'Ineligible', value: employees.filter(e => e.transportEligibility === 'INELIGIBLE').length, color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 10, padding: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 11, color: '#6b7280' }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, employee ID..."
          style={{ flex: 1, padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12 }}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Employee Table */}
      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading employees...</div> : (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['Employee', 'Site', 'Process', 'Shift', 'Eligibility', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => (
                <tr key={emp.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{emp.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{emp.email} · {emp.employeeId || '—'}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>{emp.site?.siteCode || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>{emp.process?.processCode || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>{emp.shift?.name || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: emp.transportEligibility === 'ELIGIBLE' ? '#dcfce7' : emp.transportEligibility === 'CONDITIONAL' ? '#fef3c7' : '#fee2e2',
                      color: emp.transportEligibility === 'ELIGIBLE' ? '#16a34a' : emp.transportEligibility === 'CONDITIONAL' ? '#d97706' : '#dc2626'
                    }}>{emp.transportEligibility}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: emp.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                      color: emp.status === 'ACTIVE' ? '#16a34a' : '#dc2626'
                    }}>{emp.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => openView(emp)} style={{ padding: '4px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: '#16a34a' }}>👁 View</button>
                      <button onClick={() => openEdit(emp)} style={{ padding: '4px 10px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>✏️ Edit</button>
                      {emp.status === 'ACTIVE' ? (
                        <button onClick={() => handleSuspend(emp.id)} style={{ padding: '4px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: '#dc2626' }}>🚫 Offboard</button>
                      ) : (
                        <button onClick={() => handleReactivate(emp.id)} style={{ padding: '4px 10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, fontSize: 11, cursor: 'pointer', color: '#16a34a' }}>✅ Onboard</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>No employees found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
