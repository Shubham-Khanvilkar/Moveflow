'use client';
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth, User, NavigationItem } from '../components/admin/AuthContext';
import EmployeesPage from '../components/pages/EmployeesPage';
import EmployeeTransportMasterPage from '../components/pages/EmployeeTransportMasterPage';
import DriversPage from '../components/pages/DriversPage';
import VehiclesPage from '../components/pages/VehiclesPage';
import OrganizationPage from '../components/pages/OrganizationPage';
import BookingsPage from '../components/pages/BookingsPage';
import DispatchPage from '../components/pages/DispatchPage';
import TripsPage from '../components/pages/TripsPage';
import ControlRoomPage from '../components/pages/ControlRoomPageV2';
import CompliancePage from '../components/pages/CompliancePage';
import NoShowPage from '../components/pages/NoShowPage';
import VendorsPage from '../components/pages/VendorsPage';
import RoutesPage from '../components/pages/RoutesPage';
import ReportsPage from '../components/pages/ReportsPage';
import PoliciesPage from '../components/pages/PoliciesPage';
import SettingsPage from '../components/pages/SettingsPage';
import EmployeeHomePage from '../components/pages/EmployeeHomePage';
import DriverHomePage from '../components/pages/DriverHomePage';
import BookTransportPage from '../components/pages/BookTransportPage';
import ApprovalsPage from '../components/pages/ApprovalsPage';
import SuperAdminPage from '../components/pages/SuperAdminPage';
import ProfileAccessManagementPage from '../components/pages/ProfileAccessManagementPage';
import DirectorDashboard from '../components/pages/DirectorDashboard';
import CoordinatorDashboard from '../components/pages/CoordinatorDashboard';
import VendorDashboard from '../components/pages/VendorDashboard';
import GuardDashboard from '../components/pages/GuardDashboard';
import FinanceDashboard from '../components/pages/FinanceDashboard';
import SecurityDashboard from '../components/pages/SecurityDashboard';
import AuditorDashboard from '../components/pages/AuditorDashboard';
import SupportDashboard from '../components/pages/SupportDashboard';
import ComplianceDashboard from '../components/pages/ComplianceDashboard';
import SeniorManagerDashboard from '../components/pages/SeniorManagerDashboard';
import AsstManagerDashboard from '../components/pages/AsstManagerDashboard';
import TeamLeaderDashboard from '../components/pages/TeamLeaderDashboard';
import NotificationsPage from '../components/pages/NotificationsPage';
import AuditLogPage from '../components/pages/AuditLogPage';
import NavigationPage from '../components/pages/NavigationPage';
import PassengersPage from '../components/pages/PassengersPage';
import BoardingPage from '../components/pages/BoardingPage';
import BreakdownPage from '../components/pages/BreakdownPage';
import SOSPage from '../components/pages/SOSPage';
import VehicleCheckPage from '../components/pages/VehicleCheckPage';
import ExpensesPage from '../components/pages/ExpensesPage';
import InvoicesPage from '../components/pages/InvoicesPage';
import PerformancePage from '../components/pages/PerformancePage';
import BudgetPage from '../components/pages/BudgetPage';
import ReconciliationPage from '../components/pages/ReconciliationPage';
import EventsPage from '../components/pages/EventsPage';
import AccessPage from '../components/pages/AccessPage';
import AuditLogCompliancePage from '../components/pages/AuditLogCompliancePage';
import TicketsPage from '../components/pages/TicketsPage';
import CompaniesPage from '../components/pages/CompaniesPage';
import OwnerManagementPage from '../components/pages/OwnerManagementPage';
import VehicleQRPage from '../components/pages/VehicleQRPage';
import VendorContractPage from '../components/pages/VendorContractPage';
import ApprovalWorkflowQueue from '../components/pages/ApprovalWorkflowQueue';
import NotificationPreferencesPage from '../components/pages/NotificationPreferencesPage';
import CompanyOnboardingWizard from '../components/pages/CompanyOnboardingWizard';
import LocationChangeRequestsPage from '../components/pages/LocationChangeRequestsPage';
import DigitalTwinPage from '../components/pages/DigitalTwinPage';
import CostLeakDashboard from '../components/pages/CostLeakDashboard';
import VendorTruthPage from '../components/pages/VendorTruthPage';
import PredictiveAnalyticsPage from '../components/pages/PredictiveAnalyticsPage';
import CapacityExchangePage from '../components/pages/CapacityExchangePage';
import CXOIntelligencePage from '../components/pages/CXOIntelligencePage';
import VehicleTypePage from '../components/pages/VehicleTypePage';
import EmployeeAddressesPage from '../components/pages/EmployeeAddressesPage';
import EmployeeSchedulingPage from '../components/pages/EmployeeSchedulingPage';
import ImportExportPage from '../components/pages/ImportExportPage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ─── Login Screen ──────────────────────────────────────────
function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoMode, setDemoMode] = useState(false);

  const handleLogin = async (loginEmail?: string) => {
    setLoading(true); setError('');
    try {
      await login(loginEmail || email, password);
    } catch (err: any) {
      setError(err?.message || 'Login failed — check credentials');
    }
    setLoading(false);
  };

  const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD || '';

  const handleDemoLogin = async (demoEmail: string) => {
    if (!DEMO_PASSWORD) {
      setError('Demo mode is not configured');
      return;
    }
    setLoading(true); setError('');
    const ok = await login(demoEmail, DEMO_PASSWORD);
    if (!ok) setError('Demo login failed');
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e40af 50%, #2563eb 100%)' }}>
      <div style={{ width: '100%', maxWidth: 520, padding: 20, maxHeight: '100vh', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🚐</div>
          <h1 style={{ color: 'white', fontSize: 36, fontWeight: 900, margin: 0, letterSpacing: -1 }}>NAVIRA</h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, margin: '8px 0 0', letterSpacing: 2, textTransform: 'uppercase' }}>Enterprise Transportation Platform</p>
        </div>
        <div style={{ background: 'white', borderRadius: 20, padding: 36, boxShadow: '0 25px 80px rgba(0,0,0,0.4)' }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 24px', textAlign: 'center' }}>Sign In</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: '2px solid #e5e7eb', borderRadius: 10, fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>
          {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <button onClick={() => handleLogin()} disabled={loading || demoMode}
            style={{ width: '100%', padding: '14px 0', background: demoMode ? '#9ca3af' : 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: loading ? 'wait' : demoMode ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(37,99,235,0.4)' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <div style={{ marginTop: 28, borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Demo Mode</p>
              <button onClick={() => setDemoMode(!demoMode)}
                style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: demoMode ? '#2563eb' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: demoMode ? 23 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </button>
            </div>
            {demoMode && (
              <div style={{ padding: 12, background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe' }}>
                <p style={{ fontSize: 12, color: '#1e40af', margin: '0 0 10px', fontWeight: 500 }}>Enter your demo email to sign in. Demo accounts are configured on the server.</p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="demo@example.com"
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #93c5fd', borderRadius: 8, fontSize: 13, outline: 'none' }}
                    onKeyDown={e => e.key === 'Enter' && handleDemoLogin(email)} />
                  <button onClick={() => handleDemoLogin(email)} disabled={loading || !email}
                    style={{ padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: loading || !email ? 'not-allowed' : 'pointer', opacity: loading || !email ? 0.5 : 1 }}>
                    Go
                  </button>
                </div>
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <a href="/signup" style={{ fontSize: 13, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>New company? Start free trial</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Generic Dashboard Page (for pages without dedicated components) ───
function GenericPage({ title, description, token }: { title: string; description: string; token: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/dashboard/analytics/summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { const raw = d?.data; setData(raw?.data !== undefined ? raw.data : raw ?? d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>{title}</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>{description}</p>
      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading...</div> : (
        <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#6b7280', border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 8 }}>No screen is configured for this section</div>
          <div style={{ fontSize: 14 }}>This navigation item needs a dedicated screen before it can be used.</div>
        </div>
      )}
    </div>
  );
}

// ─── Page Router ──────────────────────────────────────────
function PageRouter({ navId, user, token }: { navId: string; user: User; token: string }) {
  const pageMap: Record<string, React.ReactNode> = {
    // Transport Admin pages
    'employees': <EmployeeTransportMasterPage token={token} />,
    'drivers': <DriversPage token={token} />,
    'vehicles': <VehiclesPage token={token} />,
    'organization': <OrganizationPage token={token} />,
    'bookings': <BookingsPage token={token} />,
    'dispatch': <DispatchPage token={token} />,
    'control-room': <ControlRoomPage token={token} />,
    'trips': <TripsPage token={token} />,
    'routes': <RoutesPage token={token} />,
    'compliance': <CompliancePage token={token} />,
    'no-show': <NoShowPage token={token} />,
    'vendors': <VendorsPage token={token} />,
    'reports': <ReportsPage token={token} />,
    'policies': <PoliciesPage token={token} />,
    'settings': <SettingsPage token={token} />,
    'profile-access': <ProfileAccessManagementPage token={token} />,
    // Platform pages
    'platform': <SuperAdminPage token={token} />,
    'security': <AccessPage token={token} />,
    // Manager pages
    'team': <EmployeesPage token={token} />,
    'transport': <TripsPage token={token} />,
    'approvals': <ApprovalsPage token={token} />,
    // Employee pages
    'home': <EmployeeHomePage token={token} user={user} />,
    'my-transport': <TripsPage token={token} />,
    'my-bookings': <BookingsPage token={token} />,
    'book': <BookTransportPage token={token} />,
    'my-trips': <TripsPage token={token} />,
    'notifications': <NotificationsPage token={token} />,
    'expenses': <ExpensesPage token={token} />,
    'profile': <SettingsPage token={token} />,
    // Driver pages
    'availability': <DriverHomePage token={token} user={user} />,
    'navigation': <NavigationPage token={token} />,
    'passengers': <PassengersPage token={token} />,
    'boarding': <BoardingPage />,
    'breakdown': <BreakdownPage token={token} />,
    'sos': <SOSPage token={token} />,
    'vehicle-check': <VehicleCheckPage token={token} />,
    // Vendor pages
    'invoices': <InvoicesPage token={token} />,
    'performance': <PerformancePage token={token} />,
    // Finance pages
    'budget': <BudgetPage token={token} />,
    'reconciliation': <ReconciliationPage token={token} />,
    // Security pages
    'events': <EventsPage token={token} />,
    'audit': <AuditLogPage token={token} />,
    'access': <AccessPage token={token} />,
    // Auditor pages
    'audit-log': <AuditLogCompliancePage token={token} />,
    // Support pages
    'tickets': <TicketsPage token={token} />,
    'companies': <CompaniesPage token={token} />,
    // Owner governance & fleet QR
    'owners': <OwnerManagementPage token={token} />,
    'vehicle-qr': <VehicleQRPage token={token} />,
    'vendor-contracts': <VendorContractPage token={token} />,
    'approval-queue': <ApprovalWorkflowQueue />,
    'notification-preferences': <NotificationPreferencesPage />,
    'company-onboarding': <CompanyOnboardingWizard />,
    'location-change-requests': <LocationChangeRequestsPage />,
    'digital-twin': <DigitalTwinPage />,
    'cost-leaks': <CostLeakDashboard />,
    'vendor-truth': <VendorTruthPage token={token} />,
    'predictive-analytics': <PredictiveAnalyticsPage />,
    'capacity-exchange': <CapacityExchangePage />,
    'cxo-intelligence': <CXOIntelligencePage />,
    'vehicle-types': <VehicleTypePage token={token} />,
    'employee-addresses': <EmployeeAddressesPage token={token} />,
    'employee-scheduling': <EmployeeSchedulingPage token={token} />,
    'import-export': <ImportExportPage token={token} />,
    'gps-tracking': <ControlRoomPage token={token} />,
    'safety': <SOSPage token={token} />,
    'incidents': <TicketsPage token={token} />,
    'FINANCE_ADMIN': <FinanceDashboard token={token} user={user} />,
    'billing': <InvoicesPage token={token} />,
    'admin-access': <AccessPage token={token} />,
    'admin-roles': <ProfileAccessManagementPage token={token} />,
    'org-sites': <OrganizationPage token={token} />,
    'org-lobs': <OrganizationPage token={token} />,
    'org-shifts': <OrganizationPage token={token} />,
    'role-matrix': <AccessPage token={token} />,
    'profile-editor': <SettingsPage token={token} />,
    'support': <TicketsPage token={token} />,
    'feature-flags': <SettingsPage token={token} />,
    'booking-calendar': <BookingsPage token={token} />,
    'employee-self': <EmployeeHomePage token={token} user={user} />,
  };

  return <>{pageMap[navId] || <GenericPage title={navId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} description="" token={token} />}</>;
}

// ─── Role-Specific Dashboard ──────────────────────────────
function RoleDashboard({ user, navItem, token, onNavigate }: { user: User; navItem: NavigationItem | null; token: string; onNavigate: (id: string) => void }) {
  // Platform roles → Super Admin Platform Control Center
  if (['SUPER_ADMIN', 'NAVIRA_OWNER', 'NAVIRA_PLATFORM_ADMINISTRATOR', 'NAVIRA_PLATFORM_OPERATIONS_MANAGER', 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR', 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR', 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER', 'NAVIRA_PLATFORM_AUDITOR', 'NAVIRA_INTEGRATION_API_ADMINISTRATOR', 'NAVIRA_CLIENT_SUCCESS_MANAGER', 'NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR', 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER'].includes(user.activeRole)) {
    return <SuperAdminPage token={token} />;
  }
  // Each role gets its own dedicated dashboard
  if (user.activeRole === 'EMPLOYEE' || user.activeRole === 'TRAINER') {
    return <EmployeeHomePage token={token} user={user} onNavigate={onNavigate} />;
  }
  if (user.activeRole === 'DRIVER') {
    return <DriverHomePage token={token} user={user} onNavigate={onNavigate} />;
  }
  if (user.activeRole === 'GUARD') {
    return <GuardDashboard token={token} user={user} onNavigate={onNavigate} />;
  }
  if (user.activeRole === 'DIRECTOR') {
    return <DirectorDashboard token={token} user={user} onNavigate={onNavigate} />;
  }
  if (user.activeRole === 'SENIOR_MANAGER') {
    return <SeniorManagerDashboard token={token} user={user} onNavigate={onNavigate} />;
  }
  if (user.activeRole === 'MANAGER') {
    return <ApprovalsPage token={token} />;
  }
  if (user.activeRole === 'ASSISTANT_MANAGER') {
    return <AsstManagerDashboard token={token} user={user} onNavigate={onNavigate} />;
  }
  if (user.activeRole === 'TEAM_LEADER') {
    return <TeamLeaderDashboard token={token} user={user} onNavigate={onNavigate} />;
  }
  if (user.activeRole === 'TRANSPORT_COORDINATOR') {
    return <CoordinatorDashboard token={token} user={user} onNavigate={onNavigate} />;
  }
  if (user.activeRole === 'VENDOR_ADMIN') {
    return <VendorDashboard token={token} user={user} />;
  }
  if (user.activeRole === 'FINANCE_ADMIN' || user.activeRole === 'NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR') {
    return <FinanceDashboard token={token} user={user} onNavigate={onNavigate} />;
  }
  if (user.activeRole === 'SECURITY_ADMIN' || user.activeRole === 'NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR') {
    return <SecurityDashboard token={token} user={user} />;
  }
  if (user.activeRole === 'NAVIRA_PLATFORM_AUDITOR') {
    return <AuditorDashboard token={token} user={user} />;
  }
  if (user.activeRole === 'NAVIRA_CUSTOMER_SUPPORT_ENGINEER') {
    return <SupportDashboard token={token} user={user} />;
  }
  if (user.activeRole === 'SECURITY_ADMIN' || user.activeRole === 'NAVIRA_PLATFORM_COMPLIANCE_OFFICER') {
    return <ComplianceDashboard token={token} user={user} />;
  }
  // For TRANSPORT_ADMIN, TRANSPORT_SUB_ADMIN, TRANSPORT_COORDINATOR, and platform roles — show the operations dashboard
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/dashboard/analytics/summary`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { const raw = d?.data; setData(raw?.data !== undefined ? raw.data : raw ?? d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) return <div style={{ padding: 24, color: '#6b7280' }}>Loading workspace...</div>;

  const roleKpis = getRoleKpis(user.activeRole, data);

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>{getDashboardTitle(user.activeRole)}</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>{getDashboardDescription(user.activeRole)}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {roleKpis.map((kpi, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, marginBottom: 8 }}>{kpi.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: kpi.color || '#111827' }}>{kpi.value}</div>
            {kpi.sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{kpi.sub}</div>}
          </div>
        ))}
      </div>
      <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {getQuickActions(user.activeRole).map((action, i) => (
           <button key={i} onClick={() => onNavigate(getQuickActionTarget(action))} style={{ padding: '8px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>{action}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function getRoleKpis(role: string, data: any) {
  const d = data || {};
  const kpiSets: Record<string, any[]> = {
    TRANSPORT_ADMIN: [
      { label: 'Active Employees', value: d.employees?.total ?? '-', color: '#2563eb', sub: 'Registered in system' },
      { label: 'Available Drivers', value: d.drivers?.available ?? '-', color: '#10b981', sub: `of ${d.drivers?.total ?? 0} total` },
      { label: 'Active Vehicles', value: d.vehicles?.available ?? '-', color: '#8b5cf6', sub: `of ${d.vehicles?.total ?? 0} total` },
      { label: 'Live Trips', value: d.trips?.active ?? 0, color: '#f59e0b', sub: 'In progress now' },
      { label: 'Pending Approvals', value: d.approvals?.pending ?? 0, color: '#ef4444', sub: 'Awaiting decision' },
      { label: 'Active Routes', value: d.routes?.total ?? '-', color: '#06b6d4', sub: 'Configured routes' },
      { label: 'Vendors', value: d.vendors?.total ?? '-', color: '#6366f1', sub: 'Active vendors' },
      { label: 'No-Shows Today', value: d.noShows?.today ?? 0, color: '#dc2626', sub: 'Require attention' },
    ],
    MANAGER: [
      { label: 'Pending Approvals', value: d.approvals?.pending ?? 0, color: '#ef4444', sub: 'Team bookings' },
      { label: 'Team Members', value: d.employees?.total ?? '-', color: '#2563eb', sub: 'In your scope' },
      { label: 'Active Trips', value: d.trips?.active ?? 0, color: '#10b981', sub: 'Team trips today' },
      { label: 'No-Shows', value: d.noShows?.today ?? 0, color: '#f59e0b', sub: 'Team no-shows' },
    ],
  };
  return kpiSets[role] || [{ label: 'Overview', value: '-', color: '#2563eb', sub: role }];
}

function getDashboardTitle(role: string) {
  const t: Record<string, string> = {
    SUPER_ADMIN: 'Platform Control Center', NAVIRA_OWNER: 'Platform Control Center', NAVIRA_PLATFORM_ADMINISTRATOR: 'Platform Control Center', NAVIRA_PLATFORM_OPERATIONS_MANAGER: 'Operations Center', NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR: 'Finance Center', NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR: 'Security Center', NAVIRA_PLATFORM_COMPLIANCE_OFFICER: 'Compliance Center', NAVIRA_PLATFORM_AUDITOR: 'Audit Center', NAVIRA_INTEGRATION_API_ADMINISTRATOR: 'Integration Center', NAVIRA_CLIENT_SUCCESS_MANAGER: 'Client Success', NAVIRA_CLIENT_IMPLEMENTATION_COORDINATOR: 'Implementation Center', NAVIRA_CUSTOMER_SUPPORT_ENGINEER: 'Support Center', TRANSPORT_ADMIN: 'Transport Operations Dashboard', TRANSPORT_SUB_ADMIN: 'Transport Operations',
    TRANSPORT_COORDINATOR: 'Dispatch Operations Center', SECURITY_ADMIN: 'Transport Compliance Center',
    DIRECTOR: 'Executive Transport Overview', MANAGER: 'Team Management Dashboard', TEAM_LEADER: 'Team Leader Dashboard',
    EMPLOYEE: 'My Transport Hub', TRAINER: 'My Transport Hub', DRIVER: 'Driver Operations Hub',
    VENDOR_ADMIN: 'Vendor Operations Dashboard', GUARD: 'Guard Operations',
    FINANCE_ADMIN: 'Finance & Billing Operations',
  };
  return t[role] || role.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()) + ' Dashboard';
}

function getDashboardDescription(role: string) {
  const d: Record<string, string> = {
    SUPER_ADMIN: 'Cross-tenant platform administration and company management', NAVIRA_PLATFORM_ADMINISTRATOR: 'Cross-tenant platform administration and company management', TRANSPORT_ADMIN: 'Complete transport operations for your authorized scope',
    TRANSPORT_SUB_ADMIN: 'Delegated transport operations within your assigned scope',
    TRANSPORT_COORDINATOR: 'Live dispatch management and driver coordination', SECURITY_ADMIN: 'Policy adherence, violations, regulatory compliance',
    DIRECTOR: 'Cross-site operational visibility and executive approvals', MANAGER: "Your team's transport activity and approvals",
    TEAM_LEADER: 'Daily approvals and team transport management',
    EMPLOYEE: 'Book transport, track trips, manage expenses', DRIVER: 'Your trips, navigation, and operational tools',
    VENDOR_ADMIN: 'Manage your fleet, drivers, invoices and performance', GUARD: 'Trip monitoring, boarding verification, safety alerts',
    FINANCE_ADMIN: 'Budget, invoicing, reconciliation, cost analytics',
    NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR: 'Access control, audit trail, threat monitoring',
    NAVIRA_PLATFORM_AUDITOR: 'Compliance monitoring, audit trail, policy adherence',
    NAVIRA_CUSTOMER_SUPPORT_ENGINEER: 'Ticket management, company triage, issue resolution',
  };
  return d[role] || '';
}

function getQuickActions(role: string) {
  const a: Record<string, string[]> = {
    SUPER_ADMIN: ['Manage Companies', 'Manage Users', 'View Roles', 'Access Simulator'], NAVIRA_PLATFORM_ADMINISTRATOR: ['Manage Companies', 'Manage Users', 'View Roles', 'Access Simulator'],
    TRANSPORT_ADMIN: ['New Booking', 'Dispatch Trip', 'Add Driver', 'Add Vehicle', 'View Reports', 'Manage Routes'],
    TRANSPORT_SUB_ADMIN: ['Dispatch Trip', 'Assign Driver', 'View Reports', 'Manage Routes'],
    TRANSPORT_COORDINATOR: ['Quick Dispatch', 'View Trips', 'Driver Availability', 'Reassign Trip'],
    SECURITY_ADMIN: ['View Violations', 'Policy Rules', 'Compliance Report', 'Driver Compliance'],
    DIRECTOR: ['Approve Bookings', 'View All Sites', 'Cost Analytics', 'Executive Reports'],
    MANAGER: ['Approve Bookings', 'View Team', 'Team Reports', 'View Trips'],
    EMPLOYEE: ['Book Transport', 'View Trips', 'Submit Expense', 'Track Live Trip'],
    DRIVER: ['Start Trip', 'Mark Boarding', 'Report No-Show', 'Call Employee', 'Vehicle Check'],
    VENDOR_ADMIN: ['Submit Invoice', 'View Drivers', 'Vehicle Compliance', 'Performance'],
    GUARD: ['Verify Boarding', 'Safety Alert', 'Monitor Trips', 'Gate Log'],
    FINANCE_ADMIN: ['Generate Invoice', 'Export Excel', 'View Reconciliation', 'Cost Reports'],
    NAVIRA_PLATFORM_AUDITOR: ['Generate Report', 'Export PDF', 'View Audit Trail', 'Compliance Check'],
    NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR: ['Lock Session', 'Export Audit', 'View Events', 'Access Matrix'],
    NAVIRA_CUSTOMER_SUPPORT_ENGINEER: ['New Ticket', 'View Tickets', 'Company Health', 'Triage Issues'],
  };
  return a[role] || ['Dashboard'];
}

function getQuickActionTarget(action: string): string {
  const targets: Record<string, string> = {
    'Manage Companies': 'companies', 'Manage Users': 'employees', 'View Roles': 'admin-roles', 'Access Simulator': 'access',
    'New Booking': 'bookings', 'Book Transport': 'book', 'Approve Bookings': 'bookings', 'Approve All Pending': 'bookings', 'Approve All': 'bookings',
    'Dispatch Trip': 'dispatch', 'Quick Dispatch': 'dispatch', 'Assign Driver': 'dispatch', 'Reassign Trip': 'dispatch',
    'Add Driver': 'drivers', 'View Drivers': 'drivers', 'Add Vehicle': 'vehicles', 'View Vehicles': 'vehicles',
    'View Reports': 'reports', 'Team Reports': 'reports', 'Executive Reports': 'reports', 'Cost Reports': 'reports', 'Export Excel': 'reports', 'Export PDF': 'reports',
    'Manage Routes': 'routes', 'View Trips': 'trips', 'Start Trip': 'trips', 'Track Live Trip': 'control-room',
    'Mark Boarding': 'boarding', 'Report No-Show': 'no-show', 'Vehicle Check': 'vehicle-check', 'Safety Alert': 'safety', 'SOS': 'safety',
    'View Team': 'employees', 'View Team Reports': 'reports', 'Manage Team Members': 'employees', 'View Schedule': 'employee-scheduling',
    'Submit Expense': 'expenses', 'Generate Invoice': 'invoices', 'View Reconciliation': 'reconciliation', 'Cost Analytics': 'cost-leaks',
    'View Violations': 'compliance', 'Policy Rules': 'policies', 'Compliance Report': 'compliance', 'Driver Compliance': 'compliance',
    'View Audit Trail': 'audit', 'Compliance Check': 'compliance', 'Lock Session': 'settings', 'Access Matrix': 'access',
    'New Ticket': 'tickets', 'View Tickets': 'tickets', 'Company Health': 'companies', 'Triage Issues': 'tickets',
    'Submit Invoice': 'invoices', 'Vehicle Compliance': 'compliance', 'Performance': 'performance',
    'Dashboard': 'dashboard',
  };
  return targets[action] || 'dashboard';
}

// ─── Sidebar ──────────────────────────────────────────────
function Sidebar({ navigation, activeItem, onSelect, role }: {
  navigation: NavigationItem[]; activeItem: string; onSelect: (id: string) => void; role: string;
}) {
  const roleColors: Record<string, string> = {
    SUPER_ADMIN: '#991b1b', NAVIRA_PLATFORM_ADMINISTRATOR: '#991b1b', TRANSPORT_ADMIN: '#1e40af', TRANSPORT_SUB_ADMIN: '#1d4ed8', TRANSPORT_COORDINATOR: '#4338ca',
    NAVIRA_SECURITY_IDENTITY_ADMINISTRATOR: '#7e22ce', NAVIRA_PLATFORM_AUDITOR: '#6d28d9', NAVIRA_PLATFORM_FINANCE_ADMINISTRATOR: '#047857', NAVIRA_CUSTOMER_SUPPORT_ENGINEER: '#0e7490',
    MANAGER: '#7c3aed', DIRECTOR: '#b91c1c', TEAM_LEADER: '#6d28d9',
    EMPLOYEE: '#059669', TRAINER: '#15803d', DRIVER: '#d97706', VENDOR_ADMIN: '#ea580c', GUARD: '#b45309',
  };
  const icons: Record<string, string> = {
    LayoutDashboard: '📊', Users: '👥', Calendar: '📅', Send: '🚀', Radio: '📻', Map: '🗺️', Car: '🚗', Truck: '🚛',
    Route: '🛣️', CheckCircle: '✅', UserX: '🚫', Handshake: '🤝', BarChart3: '📈', FileText: '📄', Building: '🏢',
    Settings: '⚙️', Home: '🏠', Plus: '➕', Bell: '🔔', Wallet: '💳', User: '👤', Clock: '⏰', Navigation: '🧭',
    CheckSquare: '☑️', AlertTriangle: '⚠️', AlertCircle: '🔴', DollarSign: '💵', Shield: '🛡️', Lock: '🔒', RefreshCw: '🔄',
    Headphones: '🎧',
  };

  return (
    <div style={{ width: 240, background: roleColors[role] || '#1e40af', color: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>🚐 Navira</div>
        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>{role.replace(/_/g, ' ')}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {navigation.map(item => (
          <button key={item.id} onClick={() => onSelect(item.id)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', border: 'none', textAlign: 'left', fontSize: 13,
              background: activeItem === item.id ? 'rgba(255,255,255,0.15)' : 'transparent', color: 'white', cursor: 'pointer',
              fontWeight: activeItem === item.id ? 600 : 400, borderRadius: '0 24px 24px 0', marginRight: 8 }}>
            <span style={{ width: 20, textAlign: 'center' }}>{icons[item.icon] || '📋'}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Scope Bar ────────────────────────────────────────────
function ScopeBar({ user }: { user: User }) {
  if (!user.scope || (user.scope.sites.length === 0 && user.scope.lobs.length === 0)) return null;
  return (
    <div style={{ padding: '6px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: 12, color: '#64748b', display: 'flex', gap: 16 }}>
      <span>🏢 {user.companyName}</span>
      {user.scope.sites.length > 0 && <span>📍 {user.scope.sites.map(s => s.name).join(', ')}</span>}
      {user.scope.lobs.length > 0 && <span>📋 {user.scope.lobs.map(l => l.name).join(', ')}</span>}
      {user.scope.processes.length > 0 && <span>⚙️ {user.scope.processes.map(p => p.name).join(', ')}</span>}
    </div>
  );
}

// ─── Authenticated App ────────────────────────────────────
function AuthenticatedApp() {
  const { user, logout, resolving, token } = useAuth();
  const [activeNav, setActiveNav] = useState('');
  const [activePage, setActivePage] = useState('dashboard');

  if (!user) return <LoginScreen />;
  if (!activeNav && user.navigation.length > 0) { setActiveNav(user.navigation[0].id); }
  if (resolving) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 32, marginBottom: 12 }}>🚐</div><div style={{ fontSize: 14, color: '#6b7280' }}>Loading your workspace...</div></div>
      </div>
    );
  }

  const activeNavItem = user.navigation.find(n => n.id === activeNav) || user.navigation[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f3f4f6' }}>
      <ScopeBar user={user} />
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{getDashboardTitle(user.activeRole)}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{user.name}</span>
          <span style={{ fontSize: 11, color: 'white', background: '#2563eb', padding: '2px 10px', borderRadius: 12 }}>{user.activeRole.replace(/_/g, ' ')}</span>
          <button onClick={logout} style={{ fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Logout</button>
        </div>
      </div>
      <div style={{ display: 'flex', flex: 1 }}>
        <Sidebar navigation={user.navigation} activeItem={activeNav} onSelect={(id) => { setActiveNav(id); setActivePage(id); }} role={user.activeRole} />
        <div style={{ flex: 1, overflow: 'auto' }}>
          {activePage === 'dashboard' ? (
             <RoleDashboard user={user} navItem={activeNavItem} token={token || ''} onNavigate={(id) => { setActiveNav(id); setActivePage(id); }} />
          ) : (
            <PageRouter navId={activePage} user={user} token={token || ''} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Root ──────────────────────────────────────────────────
export default function Page() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
