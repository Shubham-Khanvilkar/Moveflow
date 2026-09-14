'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function useDashboardData(endpoint: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    fetch(`${API_BASE}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        setRequestId(r.headers.get('X-Request-ID'));
        if (!r.ok) {
          if (r.status === 403) throw new Error('You do not have permission to access this resource');
          if (r.status === 404) throw new Error('This resource is outside your authorized scope');
          throw new Error(`Request failed: ${r.status}`);
        }
        return r.json();
      })
      .then(d => { setData(d?.data || d); setLoading(false); })
      .catch((err) => { setError(err?.message || 'Failed to load data'); setLoading(false); });
  }, [endpoint]);
  return { data, loading, error, requestId };
}

function DashboardWrapper({ title, subtitle, children, loading, error, requestId }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  requestId?: string | null;
}) {
  if (loading) return <LoadingSkeleton />;
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-800 font-medium">We could not load this data</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          {requestId && <p className="text-red-400 text-xs mt-1">Request ID: {requestId}</p>}
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ============================================================
// SUPERADMIN — PLATFORM COMMAND CENTER
// ============================================================
export function SuperAdminDashboard() {
  const { user } = useAuth();
  const { data, loading, error, requestId } = useDashboardData('/dashboards/platform/command-center');
  const { data: health } = useDashboardData('/dashboards/platform/company-health');
  const { data: saas } = useDashboardData('/dashboards/platform/saas-health');

  return (
    <DashboardWrapper
      title="Platform Command Center"
      subtitle="SUPERADMIN — Global platform overview"
      loading={loading}
      error={error}
      requestId={requestId}
    >
      {/* Platform KPIs */}
      {data?.platform && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KPI title="Total Companies" value={data.platform.totalCompanies} icon="🏢" color="blue" />
          <KPI title="Active Companies" value={data.platform.activeCompanies} icon="✅" color="green" />
          <KPI title="Total Employees" value={data.platform.totalEmployees} icon="👥" color="purple" />
          <KPI title="Active Drivers" value={data.platform.activeDrivers} icon="🚗" color="orange" />
          <KPI title="Active Vehicles" value={data.platform.activeVehicles} icon="🚐" color="teal" />
          <KPI title="Trips Today" value={data.operations?.tripsToday || 0} icon="📍" color="indigo" />
          <KPI title="Active Trips" value={data.operations?.activeTrips || 0} icon="🔄" color="yellow" />
          <KPI title="Completed Today" value={data.operations?.completedToday || 0} icon="✅" color="green" />
          <KPI title="No-Shows Today" value={data.operations?.noShowsToday || 0} icon="⚠️" color="red" />
          <KPI title="SOS Today" value={data.operations?.sosToday || 0} icon="🚨" color="red" />
        </div>
      )}

      {/* SaaS Health */}
      {saas?.saas && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-lg font-semibold mb-3">SaaS Health</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="Active Subscriptions" value={saas.saas.activeCompanies} color="blue" />
            <MiniStat label="New Trials (30d)" value={saas.saas.newTrials} color="green" />
            <MiniStat label="Conversion Rate" value={`${saas.saas.trialConversionRate}%`} color="purple" />
            <MiniStat label="Churned" value={saas.saas.churnedCompanies} color="red" />
          </div>
        </div>
      )}

      {/* Company Health Matrix */}
      {health?.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-lg font-semibold mb-3">Company Health Matrix</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b text-left text-gray-500">
                <th className="p-2">Company</th>
                <th className="p-2 text-right">Employees</th>
                <th className="p-2 text-right">Drivers</th>
                <th className="p-2 text-right">Vehicles</th>
                <th className="p-2 text-right">Trips Today</th>
                <th className="p-2 text-right">No-Show Rate</th>
              </tr></thead>
              <tbody>
                {health.map((c: any) => (
                  <tr key={c.companyId} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{c.companyName}</td>
                    <td className="p-2 text-right">{c.employees}</td>
                    <td className="p-2 text-right">{c.drivers}</td>
                    <td className="p-2 text-right">{c.vehicles}</td>
                    <td className="p-2 text-right">{c.tripsToday}</td>
                    <td className="p-2 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs ${c.noShowRate > 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {c.noShowRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!data?.platform && !loading && (
        <div className="bg-white rounded-xl border p-8 text-center">
          <p className="text-gray-500">No platform data available in your authorized scope.</p>
        </div>
      )}
    </DashboardWrapper>
  );
}

// ============================================================
// TRANSPORT ADMIN — FLEET OPERATIONS DASHBOARD
// ============================================================
export function TransportAdminDashboard() {
  const { user } = useAuth();
  const { data, loading, error, requestId } = useDashboardData('/dashboards/transport');

  return (
    <DashboardWrapper
      title="Transport Operations"
      subtitle={`${user?.companyName || user?.company?.name || ''} — Transport Admin Dashboard`}
      loading={loading}
      error={error}
      requestId={requestId}
    >
      {data?.kpis ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI title="Active Employees" value={data.kpis.totalEmployees} icon="👥" color="blue" />
            <KPI title="Transport Eligible" value={data.kpis.transportEligible} icon="✅" color="green" />
            <KPI title="Active Drivers" value={data.kpis.activeDrivers} icon="🚗" color="orange" />
            <KPI title="Active Vehicles" value={data.kpis.activeVehicles} icon="🚐" color="teal" />
            <KPI title="Pending Bookings" value={data.kpis.pendingBookings} icon="📅" color="yellow" />
            <KPI title="Today's Trips" value={data.kpis.todayTrips} icon="🗺️" color="indigo" />
            <KPI title="Active Trips" value={data.kpis.activeTrips} icon="🔄" color="blue" />
            <KPI title="Completed Trips" value={data.kpis.completedTrips} icon="✅" color="green" />
            <KPI title="No-Shows" value={data.kpis.noShows} icon="⚠️" color="red" />
            <KPI title="No-Show Rate" value={`${data.kpis.noShowRate}%`} icon="📊" color="red" />
            <KPI title="Incidents (30d)" value={data.kpis.incidents} icon="🚨" color="red" />
            <KPI title="Active Bans" value={data.kpis.activeBans} icon="⛔" color="red" />
          </div>

          {data.kpis.noShowRate > 5 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-800 font-medium">⚠️ No-Show Rate ({data.kpis.noShowRate}%) exceeds 5% threshold</p>
              <p className="text-red-600 text-sm mt-1">Review no-show policies and driver assignment patterns.</p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-xl border p-8 text-center">
          <p className="text-gray-500">No transport data available in your authorized scope.</p>
        </div>
      )}
    </DashboardWrapper>
  );
}

// ============================================================
// MANAGER — TEAM MANAGEMENT DASHBOARD
// ============================================================
export function ManagerDashboard() {
  const { user } = useAuth();
  const { data, loading, error, requestId } = useDashboardData('/dashboards/manager');

  return (
    <DashboardWrapper
      title="Team Transport Dashboard"
      subtitle={`${user?.name} — Team Overview`}
      loading={loading}
      error={error}
      requestId={requestId}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI title="Pending Approvals" value={data?.pendingApprovals || 0} icon="📋" color="yellow" />
        <KPI title="Team Trips Active" value={data?.myTeamTrips || 0} icon="🗺️" color="blue" />
        <KPI title="Team No-Shows" value={data?.myTeamNoShows || 0} icon="⚠️" color="red" />
        <KPI title="Team Bookings Today" value={data?.myTeamBookings || 0} icon="📅" color="green" />
      </div>

      {data?.pendingApprovals > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-yellow-800 font-medium">📋 {data.pendingApprovals} booking(s) pending your approval</p>
        </div>
      )}

      {!data && !loading && (
        <div className="bg-white rounded-xl border p-8 text-center">
          <p className="text-gray-500">No team data available in your authorized scope.</p>
        </div>
      )}
    </DashboardWrapper>
  );
}

// ============================================================
// EMPLOYEE — PERSONAL TRANSPORT DASHBOARD
// ============================================================
export function EmployeeDashboard() {
  const { user } = useAuth();
  const { data, loading, error, requestId } = useDashboardData('/dashboards/employee');

  return (
    <DashboardWrapper
      title="My Transport"
      subtitle={`${user?.name} — Employee Self-Service`}
      loading={loading}
      error={error}
      requestId={requestId}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <KPI title="Upcoming Trips" value={data?.upcomingTrips?.length || 0} icon="🗺️" color="blue" />
        <KPI title="Active Bookings" value={data?.activeBookings || 0} icon="📅" color="green" />
        <KPI title="Recent Bookings" value={data?.recentBookings?.length || 0} icon="📋" color="purple" />
      </div>

      {data?.upcomingTrips?.length > 0 && (
        <div className="bg-white rounded-xl border p-5">
          <h2 className="text-lg font-semibold mb-3">Upcoming Trip</h2>
          {data.upcomingTrips.map((trip: any, i: number) => (
            <div key={i} className="p-3 bg-blue-50 rounded-lg mb-2">
              <div className="flex justify-between">
                <span className="font-medium">Trip #{trip.id?.slice(-6)}</span>
                <span className="text-sm text-blue-600">{trip.status}</span>
              </div>
              {trip.driver?.user && (
                <p className="text-sm text-gray-600 mt-1">Driver: {trip.driver.user.name}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!data?.upcomingTrips?.length && !loading && (
        <div className="bg-white rounded-xl border p-8 text-center">
          <p className="text-gray-500">No upcoming trips in your authorized scope.</p>
        </div>
      )}
    </DashboardWrapper>
  );
}

// ============================================================
// CONTROL ROOM — REAL-TIME OPERATIONS
// ============================================================
export function ControlRoomDashboard() {
  const { user } = useAuth();
  const { data, loading, error, requestId } = useDashboardData('/dashboards/control-room');

  return (
    <DashboardWrapper
      title="Control Room"
      subtitle="Real-time operations monitor"
      loading={loading}
      error={error}
      requestId={requestId}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="flex items-center gap-2 text-sm text-green-600">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" /> LIVE
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI title="Active Trips" value={data?.activeTrips || 0} icon="🔄" color="blue" />
        <KPI title="Delayed Trips" value={data?.delayedTrips || 0} icon="⏰" color="yellow" />
        <KPI title="Unassigned" value={data?.unassignedTrips || 0} icon="❓" color="orange" />
        <KPI title="SOS Active" value={data?.sosActive || 0} icon="🚨" color="red" />
        <KPI title="Breakdowns" value={data?.breakdownsActive || 0} icon="🔧" color="red" />
      </div>

      {(data?.sosActive > 0 || data?.delayedTrips > 3) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          {data.sosActive > 0 && <p className="text-red-800 font-medium">🚨 {data.sosActive} SOS alert(s) active — immediate attention required</p>}
          {data.delayedTrips > 3 && <p className="text-red-700 text-sm">⏰ {data.delayedTrips} trip(s) delayed — review dispatch queue</p>}
        </div>
      )}

      {!data && !loading && (
        <div className="bg-white rounded-xl border p-8 text-center">
          <p className="text-gray-500">No active operations in your authorized scope.</p>
        </div>
      )}
    </DashboardWrapper>
  );
}

// ============================================================
// FINANCE — COST & BILLING DASHBOARD
// ============================================================
export function FinanceDashboard() {
  const { user } = useAuth();
  const { data, loading, error, requestId } = useDashboardData('/dashboards/finance');

  return (
    <DashboardWrapper
      title="Finance Overview"
      subtitle="Transport cost, invoices, and expenses"
      loading={loading}
      error={error}
      requestId={requestId}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI title="Transport Spend (30d)" value={`₹${(data?.transportSpend / 100 || 0).toLocaleString()}`} icon="💰" color="blue" />
        <KPI title="Vendor Invoices" value={data?.vendorInvoices?.count || 0} icon="📄" color="purple" />
        <KPI title="Pending Reconciliation" value={data?.pendingReconciliation || 0} icon="🔍" color="yellow" />
        <KPI title="Employee Expenses" value={data?.expenses?.count || 0} icon="💸" color="orange" />
      </div>

      {!data && !loading && (
        <div className="bg-white rounded-xl border p-8 text-center">
          <p className="text-gray-500">No finance data available in your authorized scope.</p>
        </div>
      )}
    </DashboardWrapper>
  );
}

// ============================================================
// SHARED COMPONENTS
// ============================================================
function KPI({ title, value, icon, color }: { title: string; value: any; icon: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100', green: 'bg-green-50 border-green-100',
    purple: 'bg-purple-50 border-purple-100', orange: 'bg-orange-50 border-orange-100',
    teal: 'bg-teal-50 border-teal-100', indigo: 'bg-indigo-50 border-indigo-100',
    yellow: 'bg-yellow-50 border-yellow-100', red: 'bg-red-50 border-red-100',
  };
  return (
    <div className={`p-4 rounded-xl border ${colors[color] || colors.blue}`}>
      <div className="flex justify-between items-start">
        <span className="text-xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 mt-2">{value ?? '—'}</div>
      <div className="text-xs text-gray-500 mt-1">{title}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: any; color: string }) {
  const colors: Record<string, string> = { blue: 'bg-blue-50', green: 'bg-green-50', purple: 'bg-purple-50', red: 'bg-red-50' };
  return (
    <div className={`text-center p-3 rounded-lg ${colors[color] || 'bg-gray-50'}`}>
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-8 text-center text-gray-500">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
      Loading dashboard...
    </div>
  );
}
