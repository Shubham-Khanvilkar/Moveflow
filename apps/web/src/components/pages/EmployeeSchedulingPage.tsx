'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';

import { apiGet, apiPost, apiRequest, ApiError } from '../../lib/api-client';

const DEFAULT_TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0');
  const m = i % 2 === 0 ? '00' : '30';
  return `${h}:${m}`;
});

const BUFFER_DEFAULTS = { arrivalBufferMin: 15, departureBufferMin: 30 };

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px', fontFamily: 'Inter, system-ui, sans-serif', maxWidth: '1400px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  title: { fontSize: '24px', fontWeight: 700, color: '#111827', margin: 0 },
  subtitle: { fontSize: '14px', color: '#6B7280', marginTop: '4px' },
  toolbar: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' },
  select: { padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px', backgroundColor: '#fff' },
  btn: { padding: '8px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.15s' },
  btnPrimary: { backgroundColor: '#2563EB', color: '#fff' },
  btnSecondary: { backgroundColor: '#1E40AF', color: '#fff' },
  btnOutline: { backgroundColor: '#fff', color: '#374151', border: '1px solid #D1D5DB' },
  btnDanger: { backgroundColor: '#DC2626', color: '#fff' },
  btnSm: { padding: '4px 10px', fontSize: '12px' },
  weekNav: { display: 'flex', alignItems: 'center', gap: '12px' },
  weekLabel: { fontSize: '15px', fontWeight: 600, color: '#111827', minWidth: '220px', textAlign: 'center' },
  grid: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 8px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' as const, borderBottom: '2px solid #E5E7EB', backgroundColor: '#F9FAFB' },
  td: { padding: '10px 8px', borderBottom: '1px solid #E5E7EB', fontSize: '14px', verticalAlign: 'top' },
  cellCard: { backgroundColor: '#F9FAFB', borderRadius: '6px', padding: '8px', fontSize: '13px' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 },
  badgeGreen: { backgroundColor: '#D1FAE5', color: '#065F46' },
  badgeYellow: { backgroundColor: '#FEF3C7', color: '#92400E' },
  badgeRed: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  badgeBlue: { backgroundColor: '#DBEAFE', color: '#1E40AF' },
  badgeGray: { backgroundColor: '#F3F4F6', color: '#374151' },
  badgePurple: { backgroundColor: '#EDE9FE', color: '#5B21B6' },
  warning: { backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', color: '#92400E', marginBottom: '8px' },
  errorBanner: { backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', color: '#991B1B', marginBottom: '8px' },
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
  swapPanel: { backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', padding: '16px', marginBottom: '16px' },
  overnightBadge: { backgroundColor: '#312E81', color: '#E0E7FF', display: 'inline-block', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, marginBottom: '4px' },
  bufferInfo: { backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: '#166534', marginBottom: '12px' },
  autocompleteWrap: { position: 'relative' as const },
  autocompleteDropdown: { position: 'absolute' as const, top: '100%', left: 0, right: 0, backgroundColor: '#fff', border: '1px solid #D1D5DB', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '200px', overflowY: 'auto' },
  autocompleteItem: { padding: '8px 12px', cursor: 'pointer', fontSize: '14px', borderBottom: '1px solid #F3F4F6' },
  impactBanner: { backgroundColor: '#FFF7ED', border: '1px solid #FDBA74', borderRadius: '6px', padding: '12px', fontSize: '13px', color: '#9A3412', marginBottom: '12px' },
};

interface ScheduleEntry {
  id: string;
  userId: string;
  employeeName: string;
  date: string;
  loginTime: string;
  logoutTime: string;
  status: string;
  effectiveFrom: string;
  effectiveTo?: string;
  loginBuffer: number;
  logoutBuffer: number;
  loginArrivalBuffer: number;
  logoutDepartureBuffer: number;
  isRecurring: boolean;
  recurringDays: number[];
  weeklyOffs: string[];
  slotType: string;
  siteId?: string;
  warnings?: string[];
  user?: { id: string; name: string; email: string };
  site?: { id: string; name: string };
}

interface EmployeeOption {
  id: string;
  name: string;
  email?: string;
  department?: string;
}

interface BufferPolicy {
  arrivalBufferMin: number;
  departureBufferMin: number;
}

export default function EmployeeSchedulingPage({ token }: { token: string }) {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().split('T')[0];
  });
  const [siteFilter, setSiteFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [sites, setSites] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [swapForm, setSwapForm] = useState({ fromId: '', toId: '', reason: '' });
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [form, setForm] = useState({ employeeId: '', date: '', loginTime: '', logoutTime: '', status: 'SCHEDULED' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [showAdhoc, setShowAdhoc] = useState(false);
  const [adhocForm, setAdhocForm] = useState({ employeeId: '', date: '', loginTime: '', logoutTime: '', pickup: '', drop: '', reason: '', status: 'SCHEDULED' });
  const [adhocSaving, setAdhocSaving] = useState(false);
  const [adhocError, setAdhocError] = useState('');

  const [timeSlots, setTimeSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);

  const [showWeeklyOff, setShowWeeklyOff] = useState(false);
  const [weeklyOffEmployee, setWeeklyOffEmployee] = useState('');
  const [weeklyOffDays, setWeeklyOffDays] = useState<string[]>([]);
  const [weeklyOffLoading, setWeeklyOffLoading] = useState(false);

  const [bufferPolicy, setBufferPolicy] = useState<BufferPolicy>(BUFFER_DEFAULTS);

  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeResults, setEmployeeResults] = useState<EmployeeOption[]>([]);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const employeeSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const employeeWrapRef = useRef<HTMLDivElement>(null);

  const [impactData, setImpactData] = useState<{ trips: number; routes: number; vehicles: number } | null>(null);

  const weekEnd = (() => { const d = new Date(weekStart); d.setDate(d.getDate() + 6); return d.toISOString().split('T')[0]; })();

  const getWeekRange = () => {
    const start = new Date(weekStart);
    const end = new Date(weekStart); end.setDate(end.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}, ${end.getFullYear()}`;
  };

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getWeekDates = () => {
    const dates: string[] = [];
    const start = new Date(weekStart);
    for (let i = 0; i < 7; i++) { const d = new Date(start); d.setDate(d.getDate() + i); dates.push(d.toISOString().split('T')[0]); }
    return dates;
  };

  const isOvernight = (login: string, logout: string) => {
    if (!login || !logout) return false;
    return logout < login;
  };

  useEffect(() => { fetchSchedules(); fetchFilters(); fetchBufferPolicy(); }, [weekStart, token]);
  useEffect(() => { fetchSchedules(); }, [siteFilter, deptFilter, teamFilter]);

  // Fetch dynamic time slots from API
  useEffect(() => {
    apiGet('/transport-config/time-slots', token)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTimeSlots(data);
        }
      })
      .catch(() => {
        // Keep default time slots on error
      });
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (employeeWrapRef.current && !employeeWrapRef.current.contains(e.target as Node)) {
        setShowEmployeeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ weekStart });
      if (siteFilter) params.set('siteId', siteFilter);
      if (deptFilter) params.set('departmentId', deptFilter);
      if (teamFilter) params.set('teamId', teamFilter);
      const grid = await apiGet<Record<string, ScheduleEntry[]>>(`/employee-scheduling/grid?${params}`);
      const flat: ScheduleEntry[] = [];
      for (const [date, entries] of Object.entries(grid)) {
        for (const entry of entries) {
          flat.push({ ...entry, date, employeeName: entry.user?.name || entry.employeeName || 'Unknown' });
        }
      }
      setSchedules(flat);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load schedules');
      setSchedules([]);
    }
    setLoading(false);
  };

  const fetchFilters = async () => {
    try { const data = await apiGet<any[]>('/admin/sites'); setSites(data); } catch { /* ignored */ }
    try { const data = await apiGet<any[]>('/admin/departments'); setDepartments(data); } catch { /* ignored */ }
    try { const data = await apiGet<any[]>('/employee-teams'); setTeams(data); } catch { /* ignored */ }
  };

  const fetchBufferPolicy = async () => {
    try {
      const data = await apiGet<BufferPolicy>('/config/buffer-policy');
      setBufferPolicy(data || BUFFER_DEFAULTS);
    } catch { setBufferPolicy(BUFFER_DEFAULTS); }
  };

  const fetchHistory = async (userId?: string) => {
    try {
      const params = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      const data = await apiGet<any[]>(`/employee-scheduling/history${params}`);
      setHistory(data || []);
    } catch { setHistory([]); }
  };

  const fetchEmployeeSearch = useCallback((query: string) => {
    if (employeeSearchTimeout.current) clearTimeout(employeeSearchTimeout.current);
    if (!query || query.length < 2) { setEmployeeResults([]); return; }
    employeeSearchTimeout.current = setTimeout(async () => {
      try {
        const data = await apiGet<EmployeeOption[]>(`/employees?search=${encodeURIComponent(query)}`);
        setEmployeeResults(data || []);
      } catch { setEmployeeResults([]); }
    }, 300);
  }, []);

  const fetchWeeklyOff = async (empId: string) => {
    setWeeklyOffLoading(true);
    try {
      const data = await apiGet<{ days?: string[] } | string[]>(`/employee-scheduling/weekly-off?employeeId=${encodeURIComponent(empId)}`);
      if (Array.isArray(data)) { setWeeklyOffDays(data); }
      else { setWeeklyOffDays((data as any)?.days || []); }
    } catch { setWeeklyOffDays([]); }
    setWeeklyOffLoading(false);
  };

  const addWeeklyOff = async (day: string) => {
    if (!weeklyOffEmployee) return;
    try {
      await apiPost('/employee-scheduling/weekly-off', { employeeId: weeklyOffEmployee, day });
      fetchWeeklyOff(weeklyOffEmployee);
    } catch { /* ignored */ }
  };

  const removeWeeklyOff = async (day: string) => {
    if (!weeklyOffEmployee) return;
    try {
      await apiRequest('/employee-scheduling/weekly-off', {
        method: 'DELETE',
        body: JSON.stringify({ employeeId: weeklyOffEmployee, day }),
      });
      fetchWeeklyOff(weeklyOffEmployee);
    } catch { /* ignored */ }
  };

  const checkImpact = async (scheduleId: string): Promise<boolean> => {
    try {
      const data = await apiGet<{ affectedTrips: number; affectedRoutes: number; affectedVehicles: number }>(`/employee-scheduling/${scheduleId}/impact`);
      const trips = data?.affectedTrips || 0;
      const routes = data?.affectedRoutes || 0;
      const vehicles = data?.affectedVehicles || 0;
      if (trips > 0 || routes > 0 || vehicles > 0) {
        const msg = `This schedule change will affect ${trips} upcoming trips, ${routes} routes and ${vehicles} vehicle allocations.`;
        setImpactData({ trips, routes, vehicles });
        return window.confirm(msg);
      }
      return true;
    } catch { return true; }
  };

  const navigateWeek = (dir: number) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().split('T')[0]);
  };

  const handleUpdate = async () => {
    if (!editingEntry) return;
    const proceed = await checkImpact(editingEntry.id);
    if (!proceed) return;
    setSaving(true); setError('');
    try {
      await apiRequest(`/employee-scheduling/${editingEntry.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          loginTime: form.loginTime,
          logoutTime: form.logoutTime,
          status: form.status,
          userId: editingEntry.userId,
          effectiveFrom: editingEntry.effectiveFrom,
        }),
      });
      setEditingEntry(null);
      setImpactData(null);
      fetchSchedules();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 400) setError(`Validation failed: ${e.message}`);
        else setError(e.message || 'Update failed');
      } else {
        setError('Update failed');
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const reason = prompt('Reason for cancellation:');
    if (!reason) return;
    try {
      await apiRequest(`/employee-scheduling/${id}?reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE',
      });
      fetchSchedules();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to cancel schedule');
    }
  };

  const handleSwap = async () => {
    setSaving(true); setError('');
    try {
      await apiPost('/employee-scheduling/swap', {
        scheduleId1: swapForm.fromId,
        scheduleId2: swapForm.toId,
        reason: swapForm.reason,
      });
      setShowSwap(false);
      setSwapForm({ fromId: '', toId: '', reason: '' });
      fetchSchedules();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Swap failed');
    }
    setSaving(false);
  };

  const handleAdd = async () => {
    setSaving(true); setError('');
    try {
      await apiPost('/employee-scheduling', {
        userId: form.employeeId,
        effectiveFrom: form.date,
        loginTime: form.loginTime,
        logoutTime: form.logoutTime,
        isRecurring: false,
        recurringDays: [],
      });
      setShowAdd(false);
      setImpactData(null);
      setForm({ employeeId: '', date: '', loginTime: '', logoutTime: '', status: 'SCHEDULED' });
      fetchSchedules();
    } catch (e) {
      if (e instanceof ApiError) {
        if (e.status === 400) setError(`Validation failed: ${e.message}`);
        else setError(e.message || 'Failed to add schedule');
      } else {
        setError('Failed to add schedule');
      }
    }
    setSaving(false);
  };

  const handleAdhocAdd = async () => {
    setAdhocSaving(true); setAdhocError('');
    try {
      const result = await apiPost('/employee-scheduling', {
        userId: adhocForm.employeeId,
        effectiveFrom: adhocForm.date,
        loginTime: adhocForm.loginTime,
        logoutTime: adhocForm.logoutTime,
        isRecurring: false,
        recurringDays: [],
        weeklyOffs: [],
        adHocReason: adhocForm.reason,
      });

      // Create pickup/drop entries if addresses are provided
      if (adhocForm.pickup || adhocForm.drop) {
        const scheduleId = result?.id;
        if (adhocForm.pickup) {
          await apiPost('/pickup-drop', {
            userId: adhocForm.employeeId,
            scheduleId,
            date: adhocForm.date,
            pickupDropType: 'AD_HOC',
            addressLine1: adhocForm.pickup,
            latitude: 0,
            longitude: 0,
            time: adhocForm.loginTime,
            remarks: 'Ad-hoc pickup',
          }).catch(() => {});
        }
        if (adhocForm.drop) {
          await apiPost('/pickup-drop', {
            userId: adhocForm.employeeId,
            scheduleId,
            date: adhocForm.date,
            pickupDropType: 'AD_HOC',
            addressLine1: adhocForm.drop,
            latitude: 0,
            longitude: 0,
            time: adhocForm.logoutTime,
            remarks: 'Ad-hoc drop',
          }).catch(() => {});
        }
      }

      setShowAdhoc(false);
      setAdhocForm({ employeeId: '', date: '', loginTime: '', logoutTime: '', pickup: '', drop: '', reason: '', status: 'SCHEDULED' });
      fetchSchedules();
    } catch (e) {
      setAdhocError(e instanceof ApiError ? e.message : 'Failed to create ad-hoc shift');
    }
    setAdhocSaving(false);
  };

  const openEdit = (s: ScheduleEntry) => {
    setEditingEntry(s);
    setForm({ employeeId: s.userId, date: s.date, loginTime: s.loginTime, logoutTime: s.logoutTime, status: s.status });
  };

  const statusBadge = (status: string) => {
    const map: Record<string, React.CSSProperties> = { SCHEDULED: styles.badgeGreen, COMPLETED: styles.badgeBlue, CANCELLED: styles.badgeRed, NO_SHOW: styles.badgeRed, PENDING: styles.badgeYellow };
    return <span style={{ ...styles.badge, ...map[status] || styles.badgeGray }}>{status}</span>;
  };

  const weekDates = getWeekDates();
  const employees = Array.from(new Set(schedules.map(s => s.userId))).map(id => {
    const s = schedules.find(e => e.userId === id)!;
    return { id, name: s.employeeName };
  });

  const getSchedulesForEmployee = (empId: string) => {
    const map: Record<string, ScheduleEntry> = {};
    schedules.filter(s => s.userId === empId).forEach(s => { map[s.date] = s; });
    return map;
  };

  const warnings = schedules.flatMap(s => (s.warnings || []).map(w => ({ employee: s.employeeName, warning: w })));

  const renderTimeSelect = (value: string, onChange: (v: string) => void, label: string) => (
    <div style={{ ...styles.formGroup, flex: 1 }}>
      <label style={styles.label}>{label}</label>
      <select style={styles.input} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Select time</option>
        {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Employee Scheduling</h1>
          <p style={styles.subtitle}>Weekly transport scheduling grid</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => window.location.href = '/import-export'}>Bulk Import</button>
          <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => { setShowHistory(true); fetchHistory(); }}>History</button>
          <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setShowSwap(true)}>Swap Schedules</button>
          <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setShowWeeklyOff(true)}>Weekly Off</button>
          <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => { setShowAdhoc(true); setAdhocError(''); }}>Create Ad-Hoc Shift</button>
          <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => { setShowAdd(true); setForm({ employeeId: '', date: weekDates[0], loginTime: '', logoutTime: '', status: 'SCHEDULED' }); }}>+ Add Schedule</button>
        </div>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.weekNav}>
          <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => navigateWeek(-1)}>← Prev</button>
          <span style={styles.weekLabel}>{getWeekRange()}</span>
          <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => navigateWeek(1)}>Next →</button>
        </div>
        <select style={styles.select} value={siteFilter} onChange={e => setSiteFilter(e.target.value)}>
          <option value="">All Sites</option>
          {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select style={styles.select} value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select style={styles.select} value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
          <option value="">All Teams</option>
          {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {warnings.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          {warnings.slice(0, 3).map((w, i) => (
            <div key={i} style={styles.warning}>⚠ {w.employee}: {w.warning}</div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={styles.loading}>Loading schedules...</div>
      ) : employees.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📅</div>
          <div style={styles.emptyText}>No schedules for this week</div>
          <div style={styles.emptySub}>Click &quot;Add Schedule&quot; or import from the Import/Export page</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.grid}>
            <thead>
              <tr>
                <th style={styles.th}>Employee</th>
                {daysOfWeek.map((day, i) => <th key={day} style={{ ...styles.th, textAlign: 'center' }}>{day}<br/><span style={{ fontWeight: 400, fontSize: '11px' }}>{weekDates[i].slice(5)}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const empSchedules = getSchedulesForEmployee(emp.id);
                return (
                  <tr key={emp.id}>
                    <td style={{ ...styles.td, fontWeight: 600, whiteSpace: 'nowrap' }}>{emp.name}</td>
                    {weekDates.map(date => {
                      const s = empSchedules[date];
                      return (
                        <td key={date} style={{ ...styles.td, minWidth: '130px' }}>
                          {s ? (
                            <div style={styles.cellCard}>
                              {isOvernight(s.loginTime, s.logoutTime) && (
                                <div style={styles.overnightBadge}>🌙 {s.loginTime} → {s.logoutTime}</div>
                              )}
                              <div style={{ fontSize: '12px', color: '#374151' }}>In: {s.loginTime || '—'} | Out: {s.logoutTime || '—'}</div>
                              <div style={{ marginTop: '4px' }}>{statusBadge(s.status)}</div>
                              {s.warnings && s.warnings.length > 0 && <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '4px' }}>⚠ {s.warnings[0]}</div>}
                              <div style={{ marginTop: '6px', display: 'flex', gap: '4px' }}>
                                <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline }} onClick={() => openEdit(s)}>Edit</button>
                                <button style={{ ...styles.btn, ...styles.btnSm, ...styles.btnDanger }} onClick={() => handleDelete(s.id)}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#D1D5DB' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(showAdd || editingEntry) && (
        <div style={styles.modalOverlay} onClick={() => { setShowAdd(false); setEditingEntry(null); }}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{editingEntry ? 'Edit Schedule' : 'Add Schedule'}</h3>
            {error && <div style={error.startsWith('Validation') ? styles.errorBanner : styles.warning}>{error}</div>}
            {impactData && (impactData.trips > 0 || impactData.routes > 0 || impactData.vehicles > 0) && (
              <div style={styles.impactBanner}>This schedule change will affect {impactData.trips} upcoming trips, {impactData.routes} routes and {impactData.vehicles} vehicle allocations.</div>
            )}
            <div style={styles.bufferInfo}>Arrival Buffer: {bufferPolicy.arrivalBufferMin}min, Departure Buffer: {bufferPolicy.departureBufferMin}min</div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Employee</label>
              {editingEntry ? (
                <input style={styles.input} value={form.employeeId} disabled />
              ) : (
                <div style={styles.autocompleteWrap} ref={employeeWrapRef}>
                  <input
                    style={styles.input}
                    placeholder="Search employee by name or ID..."
                    value={employeeSearch || form.employeeId}
                    onChange={e => {
                      setEmployeeSearch(e.target.value);
                      setForm({ ...form, employeeId: '' });
                      fetchEmployeeSearch(e.target.value);
                      setShowEmployeeDropdown(true);
                    }}
                    onFocus={() => { if (employeeResults.length > 0) setShowEmployeeDropdown(true); }}
                  />
                  {showEmployeeDropdown && employeeResults.length > 0 && (
                    <div style={styles.autocompleteDropdown}>
                      {employeeResults.map(emp => (
                        <div
                          key={emp.id}
                          style={styles.autocompleteItem}
                          onClick={() => {
                            setForm({ ...form, employeeId: emp.id });
                            setEmployeeSearch(`${emp.name} (${emp.id})`);
                            setShowEmployeeDropdown(false);
                          }}
                        >
                          <strong>{emp.name}</strong> <span style={{ color: '#6B7280', fontSize: '12px' }}>({emp.id}{emp.department ? ` · ${emp.department}` : ''})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Date</label>
              <input style={styles.input} type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} disabled={!!editingEntry} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {renderTimeSelect(form.loginTime, v => setForm({ ...form, loginTime: v }), 'Login Time')}
              {renderTimeSelect(form.logoutTime, v => setForm({ ...form, logoutTime: v }), 'Logout Time')}
            </div>
            {form.loginTime && form.logoutTime && isOvernight(form.loginTime, form.logoutTime) && (
              <div style={{ ...styles.overnightBadge, marginBottom: '12px' }}>🌙 Overnight shift: {form.loginTime} → {form.logoutTime}</div>
            )}
            <div style={styles.formGroup}>
              <label style={styles.label}>Status</label>
              <select style={styles.input} value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                {['SCHEDULED', 'PENDING', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => { setShowAdd(false); setEditingEntry(null); setImpactData(null); }}>Cancel</button>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={editingEntry ? handleUpdate : handleAdd} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {showSwap && (
        <div style={styles.modalOverlay} onClick={() => setShowSwap(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Swap Schedules</h3>
            {error && <div style={styles.warning}>{error}</div>}
            <div style={styles.formGroup}>
              <label style={styles.label}>From Schedule ID</label>
              <input style={styles.input} value={swapForm.fromId} onChange={e => setSwapForm({ ...swapForm, fromId: e.target.value })} placeholder="Schedule ID to swap from" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>To Schedule ID</label>
              <input style={styles.input} value={swapForm.toId} onChange={e => setSwapForm({ ...swapForm, toId: e.target.value })} placeholder="Schedule ID to swap to" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Reason</label>
              <input style={styles.input} value={swapForm.reason} onChange={e => setSwapForm({ ...swapForm, reason: e.target.value })} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setShowSwap(false)}>Cancel</button>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleSwap} disabled={saving}>{saving ? 'Swapping...' : 'Swap'}</button>
            </div>
          </div>
        </div>
      )}

      {showAdhoc && (
        <div style={styles.modalOverlay} onClick={() => setShowAdhoc(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Create Ad-Hoc Shift</h3>
            {adhocError && <div style={styles.errorBanner}>{adhocError}</div>}
            <div style={styles.formGroup}>
              <label style={styles.label}>Employee ID</label>
              <input style={styles.input} value={adhocForm.employeeId} onChange={e => setAdhocForm({ ...adhocForm, employeeId: e.target.value })} placeholder="Employee ID" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Date</label>
              <input style={styles.input} type="date" value={adhocForm.date} onChange={e => setAdhocForm({ ...adhocForm, date: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              {renderTimeSelect(adhocForm.loginTime, v => setAdhocForm({ ...adhocForm, loginTime: v }), 'Login Time')}
              {renderTimeSelect(adhocForm.logoutTime, v => setAdhocForm({ ...adhocForm, logoutTime: v }), 'Logout Time')}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Pickup Location</label>
              <input style={styles.input} value={adhocForm.pickup} onChange={e => setAdhocForm({ ...adhocForm, pickup: e.target.value })} placeholder="Pickup address" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Drop Location</label>
              <input style={styles.input} value={adhocForm.drop} onChange={e => setAdhocForm({ ...adhocForm, drop: e.target.value })} placeholder="Drop address" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Reason</label>
              <input style={styles.input} value={adhocForm.reason} onChange={e => setAdhocForm({ ...adhocForm, reason: e.target.value })} placeholder="Reason for ad-hoc shift" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Status</label>
              <select style={styles.input} value={adhocForm.status} onChange={e => setAdhocForm({ ...adhocForm, status: e.target.value })}>
                {['SCHEDULED', 'PENDING'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setShowAdhoc(false)}>Cancel</button>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleAdhocAdd} disabled={adhocSaving}>{adhocSaving ? 'Creating...' : 'Create Shift'}</button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div style={styles.modalOverlay} onClick={() => setShowHistory(false)}>
          <div style={{ ...styles.modal, width: '600px' }} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Schedule Change History</h3>
            {history.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>No history available</div>
            ) : (
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {history.map((h: any, i: number) => (
                  <div key={i} style={{ padding: '10px', borderBottom: '1px solid #E5E7EB', fontSize: '13px' }}>
                    <strong>{h.action}</strong> — {h.employeeName} — {h.date}
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

      {showWeeklyOff && (
        <div style={styles.modalOverlay} onClick={() => setShowWeeklyOff(false)}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Weekly Off Management</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Employee ID</label>
              <input
                style={styles.input}
                value={weeklyOffEmployee}
                onChange={e => { setWeeklyOffEmployee(e.target.value); if (e.target.value) fetchWeeklyOff(e.target.value); }}
                placeholder="Enter Employee ID to manage weekly offs"
              />
            </div>
            {weeklyOffEmployee && (
              <div>
                {weeklyOffLoading ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#6B7280' }}>Loading...</div>
                ) : (
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>Current Weekly Offs:</div>
                    {weeklyOffDays.length === 0 ? (
                      <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '12px' }}>No weekly offs set</div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                        {weeklyOffDays.map(day => (
                          <span key={day} style={{ ...styles.badge, ...styles.badgePurple, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {day}
                            <button
                              style={{ background: 'none', border: 'none', color: '#5B21B6', cursor: 'pointer', fontSize: '14px', padding: 0, lineHeight: 1 }}
                              onClick={() => removeWeeklyOff(day)}
                            >×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Add Weekly Off:</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <button
                          key={day}
                          style={{ ...styles.btn, ...styles.btnSm, ...styles.btnOutline, opacity: weeklyOffDays.includes(day) ? 0.5 : 1 }}
                          disabled={weeklyOffDays.includes(day)}
                          onClick={() => addWeeklyOff(day)}
                        >{day}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button style={{ ...styles.btn, ...styles.btnOutline }} onClick={() => setShowWeeklyOff(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
