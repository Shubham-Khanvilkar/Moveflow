'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../lib/config';

const TOGGLE_SECTIONS = [
  {
    title: 'Identity & Scope', icon: '🪪',
    toggles: [
      { key: 'ACTIVE_USER', label: 'Active User', desc: 'User account is active' },
      { key: 'LOGIN_ENABLED', label: 'Login Enabled', desc: 'Can log in to the system' },
      { key: 'WEB_PORTAL_ENABLED', label: 'Web Portal Access', desc: 'Can access web portal' },
      { key: 'MOBILE_APP_ENABLED', label: 'Mobile App Access', desc: 'Can access mobile app' },
    ],
  },
  {
    title: 'User Administration', icon: '👥',
    toggles: [
      { key: 'VIEW_USERS', label: 'View Users', desc: 'Can view user list' },
      { key: 'CREATE_EMPLOYEE', label: 'Create Employee', desc: 'Can add new employees' },
      { key: 'EDIT_EMPLOYEE', label: 'Edit Employee', desc: 'Can edit employee details' },
      { key: 'ONBOARD_EMPLOYEE', label: 'Onboard Employee', desc: 'Can onboard employees for transport' },
      { key: 'OFFBOARD_EMPLOYEE', label: 'Offboard Employee', desc: 'Can offboard employees from transport' },
      { key: 'CREATE_TEAM', label: 'Create Team', desc: 'Can create teams' },
      { key: 'EDIT_TEAM', label: 'Edit Team', desc: 'Can edit team details' },
      { key: 'CREATE_TRANSPORT_ADMIN', label: 'Create Transport Admin', desc: 'Can create delegated transport admins' },
      { key: 'CREATE_SUB_ADMIN', label: 'Create Sub-Admin', desc: 'Can create sub-admins within scope' },
      { key: 'CHANGE_ROLE', label: 'Change Role', desc: 'Can change user roles' },
      { key: 'GRANT_PERMISSION', label: 'Grant Permission', desc: 'Can grant permissions to users' },
      { key: 'REVOKE_PERMISSION', label: 'Revoke Permission', desc: 'Can revoke permissions from users' },
    ],
  },
  {
    title: 'Booking', icon: '🎫',
    toggles: [
      { key: 'BOOK_OWN', label: 'Book Own Transport', desc: 'Can book transport for themselves' },
      { key: 'BOOK_TEAM', label: 'Book Team Transport', desc: 'Can book for employees in their team' },
      { key: 'BOOK_PROCESS', label: 'Book Process Transport', desc: 'Can book for their process' },
      { key: 'BOOK_SITE', label: 'Book Site Transport', desc: 'Can book for their site' },
      { key: 'BOOK_COMPANY', label: 'Book Company Transport', desc: 'Can book company-wide transport' },
      { key: 'EDIT_BOOKING', label: 'Edit Booking', desc: 'Can edit existing bookings' },
      { key: 'CANCEL_BOOKING', label: 'Cancel Booking', desc: 'Can cancel bookings' },
      { key: 'APPROVE_BOOKING', label: 'Approve/Reject Booking', desc: 'Can approve or reject bookings' },
      { key: 'BULK_BOOKING', label: 'Bulk Booking', desc: 'Can create bulk bookings' },
      { key: 'WEEKLY_BOOKING', label: 'Weekly Booking', desc: 'Can create weekly recurring bookings' },
      { key: 'RECURRING_BOOKING', label: 'Recurring Booking', desc: 'Can create recurring bookings' },
      { key: 'BOOKING_CALENDAR', label: 'Booking Calendar', desc: 'Can view booking calendar' },
    ],
  },
  {
    title: 'Trips & Dispatch', icon: '🚀',
    toggles: [
      { key: 'VIEW_TRIPS', label: 'View Trips', desc: 'Can view trip list' },
      { key: 'CREATE_TRIP', label: 'Create Trip', desc: 'Can create trips' },
      { key: 'ASSIGN_DRIVER', label: 'Assign/Unassign Driver', desc: 'Can assign or unassign drivers to trips' },
      { key: 'ASSIGN_VEHICLE', label: 'Assign/Unassign Vehicle', desc: 'Can assign or unassign vehicles to trips' },
      { key: 'REASSIGN_TRIP', label: 'Reassign Complete Trip', desc: 'Can reassign a complete trip to another driver/vehicle' },
      { key: 'UNASSIGN_EMPLOYEE', label: 'Unassign One Employee', desc: 'Can remove one employee from a trip' },
      { key: 'MOVE_EMPLOYEE_CAB', label: 'Move Employee to Another Cab', desc: 'Can move an employee to a different cab' },
      { key: 'MOVE_MULTIPLE_EMPLOYEES', label: 'Move Multiple Employees', desc: 'Can move multiple employees between cabs' },
      { key: 'DISPATCH', label: 'Dispatch/Re-dispatch', desc: 'Can dispatch or re-dispatch vehicles' },
      { key: 'END_CANCEL_TRIP', label: 'End/Cancel Trip', desc: 'Can end or cancel active trips' },
      { key: 'MARK_NOSHOW', label: 'Mark No-Show', desc: 'Can mark employees as no-show' },
      { key: 'OVERRIDE_NOSHOW', label: 'Override No-Show', desc: 'Can override no-show status' },
      { key: 'VIEW_BOARDING', label: 'View Boarding/OTP State', desc: 'Can view boarding and OTP verification status' },
    ],
  },
  {
    title: 'Driver & Vehicle', icon: '🧑‍✈️',
    toggles: [
      { key: 'VIEW_DRIVER', label: 'View Driver', desc: 'Can view driver details' },
      { key: 'CREATE_DRIVER', label: 'Create Driver', desc: 'Can add new drivers' },
      { key: 'EDIT_DRIVER', label: 'Edit Driver', desc: 'Can edit driver details' },
      { key: 'ACTIVATE_DRIVER', label: 'Activate/Deactivate Driver', desc: 'Can activate or deactivate drivers' },
      { key: 'VIEW_DRIVER_AVAILABILITY', label: 'View Driver Availability', desc: 'Can view driver availability status' },
      { key: 'CONFIGURE_DRIVER_SHIFT', label: 'Configure Driver Shift', desc: 'Can set driver work shifts' },
      { key: 'VIEW_FAVOURITE_AREA', label: 'View Favourite Area', desc: 'Can view driver favourite service areas' },
      { key: 'VIEW_VEHICLE', label: 'View Vehicle', desc: 'Can view vehicle details' },
      { key: 'CREATE_VEHICLE', label: 'Create Vehicle', desc: 'Can add new vehicles' },
      { key: 'EDIT_VEHICLE', label: 'Edit Vehicle', desc: 'Can edit vehicle details' },
      { key: 'VEHICLE_COMPLIANCE', label: 'Vehicle Compliance/Maintenance', desc: 'Can manage vehicle compliance and maintenance' },
    ],
  },
  {
    title: 'Map & Control Room', icon: '🗺️',
    toggles: [
      { key: 'LIVE_MAP', label: 'Live Map', desc: 'Can access live map view' },
      { key: 'LIVE_CAB_LOCATIONS', label: 'Live Cab Locations', desc: 'Can view live cab locations' },
      { key: 'PICKUP_DROP_MAP', label: 'Pickup/Drop Map', desc: 'Can view pickup and drop map' },
      { key: 'ROUTE_MAP', label: 'Route Map', desc: 'Can view route map' },
      { key: 'SITE_MAP', label: 'Site Map', desc: 'Can view site map' },
      { key: 'EMPLOYEE_CLUSTERS', label: 'Employee Clusters', desc: 'Can view employee clusters on map' },
      { key: 'DRIVER_FAVOURITE_CIRCLES', label: 'Driver Favourite Circles', desc: 'Can view driver favourite area circles' },
      { key: 'GPS_HISTORY', label: 'GPS History', desc: 'Can view historical GPS data' },
      { key: 'TRIP_REPLAY', label: 'Trip Replay', desc: 'Can replay completed trips' },
      { key: 'CONTROL_ROOM_ACTIONS', label: 'Control Room Actions', desc: 'Can perform control room actions' },
    ],
  },
  {
    title: 'Routes & Optimization', icon: '🛣️',
    toggles: [
      { key: 'CREATE_EDIT_ROUTES', label: 'Create/Edit Routes', desc: 'Can create and edit routes' },
      { key: 'CREATE_EDIT_STOPS', label: 'Create/Edit Stops', desc: 'Can create and edit route stops' },
      { key: 'CONFIGURE_COORDINATES', label: 'Configure Coordinates', desc: 'Can configure route coordinates' },
      { key: 'CLUB_EMPLOYEES', label: 'Club Employees', desc: 'Can club employees on routes' },
      { key: 'CONFIGURE_CLUBBING_RULES', label: 'Configure Clubbing Rules', desc: 'Can configure employee clubbing rules' },
      { key: 'OPTIMIZE_ROUTE', label: 'Optimize Route', desc: 'Can run route optimization' },
      { key: 'ROUTE_CONSTRAINTS', label: 'Route Constraints', desc: 'Can set route constraints' },
      { key: 'FEMALE_SAFETY_CONSTRAINTS', label: 'Female Safety Constraints', desc: 'Can configure female safety constraints' },
    ],
  },
  {
    title: 'Shifts & Calendar', icon: '📅',
    toggles: [
      { key: 'VIEW_SHIFTS', label: 'View Shifts', desc: 'Can view shift schedules' },
      { key: 'CREATE_SHIFT', label: 'Create/Edit/Cancel Shifts', desc: 'Can create, edit, and cancel shifts' },
      { key: 'ASSIGN_DRIVER_SHIFT', label: 'Assign Drivers/Vehicles to Shifts', desc: 'Can assign drivers and vehicles to shifts' },
      { key: 'SHUTTLE_AVAILABILITY', label: 'Shuttle Availability', desc: 'Can view shuttle availability' },
      { key: 'CAB_AVAILABILITY', label: 'Cab Availability', desc: 'Can view cab availability' },
      { key: 'RECURRING_SCHEDULES', label: 'Recurring Schedules', desc: 'Can create recurring schedules' },
      { key: 'DAY_WEEK_MONTH_CALENDAR', label: 'Day/Week/Month Calendar', desc: 'Can view day, week, and month calendar' },
      { key: 'DRIVER_VEHICLE_CALENDAR', label: 'Driver/Vehicle/Team Calendar', desc: 'Can view driver, vehicle, and team calendars' },
    ],
  },
  {
    title: 'Policies', icon: '📜',
    toggles: [
      { key: 'VIEW_POLICIES', label: 'View Policies', desc: 'Can view transport policies' },
      { key: 'CREATE_EDIT_POLICIES', label: 'Create/Edit Policies', desc: 'Can create and edit policies' },
      { key: 'ACTIVATE_POLICIES', label: 'Activate Policies', desc: 'Can activate policies' },
      { key: 'NOSHOW_POLICY', label: 'No-Show Policy', desc: 'Can configure no-show policy' },
      { key: 'CLUBBING_POLICY', label: 'Clubbing Policy', desc: 'Can configure clubbing policy' },
      { key: 'FEMALE_TRANSPORT_RULES', label: 'Female Transport Rules', desc: 'Can configure female transport rules' },
      { key: 'DRIVER_BREAK_RULES', label: 'Driver Break/Sleepy Rules', desc: 'Can configure driver break and sleepy rules' },
      { key: 'DISPATCH_RULES', label: 'Dispatch Rules', desc: 'Can configure dispatch rules' },
    ],
  },
  {
    title: 'Reports & Exports', icon: '📊',
    toggles: [
      { key: 'VIEW_REPORTS', label: 'View Reports', desc: 'Can access transport reports' },
      { key: 'EXPORT_EXCEL', label: 'Export Excel/XLSX', desc: 'Can export reports as Excel' },
      { key: 'EXPORT_CSV', label: 'Export CSV', desc: 'Can export reports as CSV' },
      { key: 'EXPORT_PDF', label: 'Export PDF', desc: 'Can export reports as PDF' },
      { key: 'SCHEDULED_REPORTS', label: 'Scheduled Reports', desc: 'Can schedule automated reports' },
    ],
  },
  {
    title: 'Finance & Security', icon: '💰',
    toggles: [
      { key: 'VIEW_INVOICES', label: 'View Invoices', desc: 'Can view vendor invoices' },
      { key: 'VIEW_RECONCILIATION', label: 'View Reconciliation', desc: 'Can view invoice reconciliation' },
      { key: 'VIEW_RATES', label: 'View Rates', desc: 'Can view rate cards' },
      { key: 'BILLING_CONFIGURATION', label: 'Billing Configuration', desc: 'Can configure billing settings' },
      { key: 'VIEW_AUDIT', label: 'View Audit', desc: 'Can view audit trail' },
      { key: 'VIEW_SECURITY_EVENTS', label: 'View Security Events', desc: 'Can view security events' },
      { key: 'SESSION_MANAGEMENT', label: 'Session Management', desc: 'Can manage user sessions' },
      { key: 'ACCOUNT_DISABLE_RESET', label: 'Account Disable/Reset', desc: 'Can disable or reset user accounts' },
    ],
  },
];

type OverrideStatus = 'GRANTED' | 'REVOKED' | 'SUSPENDED' | 'SCHEDULED' | 'EXPIRED';

interface OverrideRecord {
  id: string;
  permissionKey: string;
  status: OverrideStatus;
  isGranted: boolean;
  reason?: string;
  grantedBy?: string;
  revokedBy?: string;
  suspendedBy?: string;
  suspensionReason?: string;
  effectiveFrom?: string;
  effectiveUntil?: string;
  createdAt: string;
}

interface HistoryRecord {
  id: string;
  permissionKey: string;
  previousStatus?: OverrideStatus;
  newStatus: OverrideStatus;
  reason: string;
  performedBy: string;
  createdAt: string;
}

interface UserWithRoles {
  id: string; name: string; email: string; status: string;
  roles: { id: string; name: string; displayName?: string; securityDomain: string }[];
}

interface EffectiveAccess {
  name: string; email: string; domain: string; status: string;
  roles: { id: string; name: string; displayName: string; securityDomain: string; hierarchyLevel: number }[];
  effectivePermissions: { id: string; name: string; resource: string; action: string }[];
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  GRANTED: { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' },
  REVOKED: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  SUSPENDED: { bg: '#fefce8', text: '#ca8a04', border: '#fef08a' },
  SCHEDULED: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  EXPIRED: { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' },
};

export default function ProfileAccessManagementPage({ token }: { token: string }) {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [overrides, setOverrides] = useState<OverrideRecord[]>([]);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [effectiveAccess, setEffectiveAccess] = useState<EffectiveAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [tab, setTab] = useState<'access' | 'overview' | 'scope' | 'preview' | 'history'>('access');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState<{ permissionKey: string; action: string } | null>(null);
  const [modalReason, setModalReason] = useState('');
  const [modalExpiry, setModalExpiry] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/platform/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setUsers(d.data?.data || d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const loadUser = useCallback(async (userId: string) => {
    const [userRes, overridesRes, historyRes, accessRes] = await Promise.all([
      fetch(`${API_URL}/api/platform/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/platform/access-toggles/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/platform/access-toggles/${userId}/history`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/api/platform/access-simulator/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const userData = await userRes.json();
    const overridesData = await overridesRes.json();
    const historyData = await historyRes.json();
    const accessData = await accessRes.json();
    setSelectedUser(userData.data || userData);
    setOverrides(overridesData.data || overridesData || []);
    setHistory(historyData.data || historyData || []);
    setEffectiveAccess(accessData.data || accessData);
  }, [token]);

  const getOverrideStatus = (key: string): OverrideStatus => {
    const override = overrides.find(o => o.permissionKey === key);
    return override?.status || 'REVOKED';
  };

  const getOverrideDetails = (key: string): OverrideRecord | undefined => {
    return overrides.find(o => o.permissionKey === key);
  };

  const executePermissionChange = async (permissionKey: string, status: string, reason: string, effectiveUntil?: string) => {
    if (!selectedUser) return;
    setSaving(permissionKey);
    try {
      const endpoint = `/api/platform/users/${selectedUser.id}/access/${permissionKey}/${status}`;
      await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, effectiveUntil: effectiveUntil || undefined }),
      });
      await loadUser(selectedUser.id);
    } catch (e) {
      // Error handled by UI state
    }
    setSaving(null);
    setShowModal(null);
    setModalReason('');
    setModalExpiry('');
  };

  const openActionModal = (permissionKey: string, action: string) => {
    setShowModal({ permissionKey, action });
    setModalReason('');
    setModalExpiry('');
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)' }}>
      {/* Left: User List */}
      <div style={{ width: 320, background: 'white', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>👤 User Profiles</h3>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? <div style={{ padding: 20, color: '#6b7280', textAlign: 'center' }}>Loading...</div> : (
            filteredUsers.map(u => (
              <button key={u.id} onClick={() => { loadUser(u.id); setTab('access'); }}
                style={{ width: '100%', padding: '12px 16px', border: 'none', textAlign: 'left', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                  background: selectedUser?.id === u.id ? '#eff6ff' : 'white', borderLeft: selectedUser?.id === u.id ? '3px solid #2563eb' : '3px solid transparent' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{u.email}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                  {(u.roles || []).slice(0, 2).map(r => (
                    <span key={r.id} style={{ padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 600,
                      background: r.securityDomain === 'PLATFORM_INTERNAL' ? '#ede9fe' : '#dbeafe',
                      color: r.securityDomain === 'PLATFORM_INTERNAL' ? '#7c3aed' : '#2563eb' }}>
                      {r.displayName || r.name}
                    </span>
                  ))}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Profile & Access */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>
        {!selectedUser ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Select a user to manage access</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Choose a user from the left panel to configure their permissions</div>
            </div>
          </div>
        ) : (
          <div style={{ padding: 24 }}>
            {/* User Header */}
            <div style={{ background: 'white', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{selectedUser.name}</h2>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>{selectedUser.email} · {selectedUser.status}</p>
                <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                  {(selectedUser.roles || []).map(r => (
                    <span key={r.id} style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: r.securityDomain === 'PLATFORM_INTERNAL' ? '#ede9fe' : '#dbeafe',
                      color: r.securityDomain === 'PLATFORM_INTERNAL' ? '#7c3aed' : '#2563eb' }}>
                      {r.displayName || r.name}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#2563eb' }}>{effectiveAccess?.effectivePermissions?.length || 0}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>Effective Permissions</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{overrides.length} override(s)</div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'white', padding: 4, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              {[
                { key: 'access', label: '🔐 Responsibilities' },
                { key: 'overview', label: '📋 Profile' },
                { key: 'history', label: '📜 History' },
                { key: 'preview', label: '🧪 Effective Access' },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key as any)}
                  style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.key ? 700 : 400,
                    background: tab === t.key ? '#2563eb' : 'transparent', color: tab === t.key ? 'white' : '#6b7280', transition: 'all 0.2s' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Access & Responsibilities Tab */}
            {tab === 'access' && (
              <div style={{ display: 'grid', gap: 16 }}>
                {TOGGLE_SECTIONS.map(section => (
                  <div key={section.title} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{section.icon}</span>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{section.title}</div>
                    </div>
                    {section.toggles.map(toggle => {
                      const status = getOverrideStatus(toggle.key);
                      const details = getOverrideDetails(toggle.key);
                      const colors = STATUS_COLORS[status] || STATUS_COLORS.REVOKED;
                      const isSavingThis = saving === toggle.key;
                      return (
                        <div key={toggle.key} style={{ padding: '12px 20px', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{toggle.label}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{toggle.desc}</div>
                            {details?.effectiveUntil && (
                              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
                                Expires: {new Date(details.effectiveUntil).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                              background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                              {status}
                            </span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {status !== 'GRANTED' && (
                                <button onClick={() => openActionModal(toggle.key, 'grant')} disabled={isSavingThis}
                                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                  Grant
                                </button>
                              )}
                              {status === 'GRANTED' && (
                                <button onClick={() => openActionModal(toggle.key, 'suspend')} disabled={isSavingThis}
                                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fef08a', background: '#fefce8', color: '#ca8a04', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                  Suspend
                                </button>
                              )}
                              {status !== 'REVOKED' && (
                                <button onClick={() => openActionModal(toggle.key, 'revoke')} disabled={isSavingThis}
                                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                  Revoke
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* History Tab */}
            {tab === 'history' && (
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Permission Change History</h3>
                {history.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>No permission changes recorded yet</div>
                ) : (
                  <div style={{ display: 'grid', gap: 8 }}>
                    {history.map(h => {
                      const colors = STATUS_COLORS[h.newStatus] || STATUS_COLORS.REVOKED;
                      return (
                        <div key={h.id} style={{ padding: '12px 16px', borderRadius: 8, border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{h.permissionKey.replace(/_/g, ' ')}</div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                              {h.previousStatus ? `${h.previousStatus} → ` : ''}{h.newStatus}
                              {h.reason ? ` · ${h.reason}` : ''}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: colors.bg, color: colors.text }}>
                              {h.newStatus}
                            </span>
                            <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{new Date(h.createdAt).toLocaleString()}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Overview Tab */}
            {tab === 'overview' && effectiveAccess && (
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Profile Overview</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                  <div><div style={{ fontSize: 12, color: '#6b7280' }}>Name</div><div style={{ fontSize: 14, fontWeight: 600 }}>{effectiveAccess.name}</div></div>
                  <div><div style={{ fontSize: 12, color: '#6b7280' }}>Email</div><div style={{ fontSize: 14, fontWeight: 600 }}>{effectiveAccess.email}</div></div>
                  <div><div style={{ fontSize: 12, color: '#6b7280' }}>Domain</div><div style={{ fontSize: 14, fontWeight: 600 }}>{effectiveAccess.domain}</div></div>
                  <div><div style={{ fontSize: 12, color: '#6b7280' }}>Status</div><span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: effectiveAccess.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2', color: effectiveAccess.status === 'ACTIVE' ? '#16a34a' : '#dc2626' }}>{effectiveAccess.status}</span></div>
                  <div><div style={{ fontSize: 12, color: '#6b7280' }}>Roles</div><div style={{ fontSize: 14, fontWeight: 600 }}>{(effectiveAccess.roles || []).length}</div></div>
                  <div><div style={{ fontSize: 12, color: '#6b7280' }}>Permissions</div><div style={{ fontSize: 14, fontWeight: 600 }}>{(effectiveAccess.effectivePermissions || []).length}</div></div>
                </div>
                <div style={{ marginTop: 20 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px' }}>Assigned Roles</h4>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(effectiveAccess.roles || []).map(r => (
                      <div key={r.id} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{r.displayName || r.name}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>Domain: {r.securityDomain} · Level: L{r.hierarchyLevel}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Effective Access Preview */}
            {tab === 'preview' && effectiveAccess && (
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Effective Access</h3>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(effectiveAccess.effectivePermissions || []).map((p: any) => (
                    <span key={p.id || p.name} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                      {p.name}
                    </span>
                  ))}
                  {(!effectiveAccess.effectivePermissions || effectiveAccess.effectivePermissions.length === 0) && (
                    <div style={{ fontSize: 13, color: '#6b7280' }}>No effective permissions.</div>
                  )}
                </div>
                {overrides.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 8px' }}>Overrides</h4>
                    {overrides.map(o => {
                      const colors = STATUS_COLORS[o.status] || STATUS_COLORS.REVOKED;
                      return (
                        <div key={o.id} style={{ padding: '8px 12px', borderRadius: 8, background: colors.bg, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: colors.text }}>{o.permissionKey.replace(/_/g, ' ')}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: colors.text }}>{o.status}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowModal(null)}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, width: 420, boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>
              {showModal.action === 'grant' ? '✅ Grant Access' : showModal.action === 'suspend' ? '⏸️ Suspend Access' : '🚫 Revoke Access'}
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
              Permission: <strong>{showModal.permissionKey.replace(/_/g, ' ')}</strong>
              <br />User: <strong>{selectedUser?.name}</strong>
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Reason (required)</label>
              <textarea value={modalReason} onChange={e => setModalReason(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, minHeight: 80, boxSizing: 'border-box', resize: 'vertical' }}
                placeholder="Enter reason for this change..." />
            </div>
            {(showModal.action === 'grant' || showModal.action === 'suspend') && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Expires on (optional)</label>
                <input type="datetime-local" value={modalExpiry} onChange={e => setModalExpiry(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(null)}
                style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', background: 'white', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={() => executePermissionChange(showModal.permissionKey, showModal.action, modalReason, modalExpiry || undefined)}
                disabled={!modalReason.trim() || saving === showModal.permissionKey}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: showModal.action === 'grant' ? '#16a34a' : showModal.action === 'suspend' ? '#ca8a04' : '#dc2626',
                  color: 'white', opacity: (!modalReason.trim() || saving === showModal.permissionKey) ? 0.6 : 1 }}>
                {saving === showModal.permissionKey ? 'Processing...' : showModal.action === 'grant' ? 'Grant' : showModal.action === 'suspend' ? 'Suspend' : 'Revoke'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
