'use client';
import React, { useState } from 'react';
import Spinner from '../Spinner';
import { useApi, useMutation } from '../../hooks/useApi';

interface KpiData {
  employees?: { total: number };
  drivers?: { total: number; available: number };
  vehicles?: { total: number; active: number; utilization: number | string };
  trips?: { total: number; active: number; today: number };
  bookings?: { total: number };
  vendors?: { total: number };
  routes?: { total: number };
  incidents?: { total: number; open: number };
  documents?: { total: number; expiringSoon: number };
  recentAudit?: Array<{ action: string; entity: string; createdAt: string; userId: string }>;
  tripStatuses?: Array<{ status: string; count: number }>;
  bookingStatuses?: Array<{ status: string; count: number }>;
}

interface PendingApproval {
  id: string;
  entityType: string;
  entityLabel: string;
  requestReason?: string;
  priority?: string;
  status: string;
  createdAt: string;
  requestedBy?: { name?: string; email?: string };
}

interface RecentActivity {
  id: string;
  action: string;
  entity: string;
  message: string;
  createdAt: string;
}

interface DashboardResponse {
  kpis: {
    totalEmployees: number;
    transportEligible: number;
    activeDrivers: number;
    activeVehicles: number;
    pendingBookings: number;
    todayTrips: number;
    activeTrips: number;
    completedTrips: number;
    noShows: number;
    incidents: number;
    pendingApprovals: number;
    activeBans: number;
    noShowRate: number;
  };
  trends: { dailyTrips: Array<{ date: string; count: number }> };
}

export default function DirectorDashboard({ token, user, onNavigate }: { token: string; user: any; onNavigate?: (id: string) => void }) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data: kpiData, loading: kpiLoading, error: kpiError } = useApi<KpiData>('/dashboard/kpi');
  const { data: transportData, loading: transportLoading, error: transportError } = useApi<DashboardResponse>('/dashboards/transport');
  const { data: approvalsData, loading: approvalsLoading, error: approvalsError, refetch: refetchApprovals } = useApi<PendingApproval[]>('/dashboard/approvals/pending');
  const { data: recentActivity, loading: activityLoading } = useApi<RecentActivity[]>('/dashboards/recent-activity?limit=8');

  const { mutate, loading: mutating } = useMutation();

  const loading = kpiLoading || transportLoading;
  const error = kpiError || transportError;

  const handleApprove = async (approvalId: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await mutate(`/dashboard/approvals/${approvalId}/decide`, 'POST', { decision: 'APPROVED' });
      setActionSuccess('Approval granted successfully');
      refetchApprovals();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve');
      setTimeout(() => setActionError(null), 5000);
    }
  };

  const handleReject = async (approvalId: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await mutate(`/dashboard/approvals/${approvalId}/decide`, 'POST', { decision: 'REJECTED', reason: 'Rejected by director' });
      setActionSuccess('Request rejected');
      refetchApprovals();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject');
      setTimeout(() => setActionError(null), 5000);
    }
  };

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>&#x26a0;&#xfe0f;</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#991b1b', margin: '0 0 8px' }}>Failed to load dashboard</h3>
          <p style={{ fontSize: 13, color: '#b91c1c', margin: '0 0 16px' }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    );
  }

  const kpi = kpiData || {} as KpiData;
  const tkpi = transportData?.kpis || {} as DashboardResponse['kpis'];
  const approvals = Array.isArray(approvalsData) ? approvalsData : [];
  const activity = Array.isArray(recentActivity) ? recentActivity : [];

  const kpis = [
    { label: 'Total Employees', value: tkpi.totalEmployees ?? kpi.employees?.total ?? 0, color: '#2563eb', icon: '\u{1f465}' },
    { label: 'Active Vehicles', value: tkpi.activeVehicles ?? kpi.vehicles?.active ?? 0, color: '#10b981', icon: '\u{1f697}' },
    { label: 'Live Trips', value: tkpi.activeTrips ?? kpi.trips?.active ?? 0, color: '#f59e0b', icon: '\u{1f690}' },
    { label: 'Today\'s Trips', value: tkpi.todayTrips ?? kpi.trips?.today ?? 0, color: '#3b82f6', icon: '\u{1f4c5}' },
    { label: 'Pending Approvals', value: tkpi.pendingApprovals ?? approvals.length, color: '#ef4444', icon: '\u{23f3}\ufe0f' },
    { label: 'Open Incidents', value: tkpi.incidents ?? kpi.incidents?.open ?? 0, color: '#dc2626', icon: '\u{1f6a8}' },
    { label: 'Total Routes', value: kpi.routes?.total ?? 0, color: '#8b5cf6', icon: '\u{1f6e3}\ufe0f' },
    { label: 'Active Bans', value: tkpi.activeBans ?? 0, color: '#f97316', icon: '\u{1f6ab}' },
  ];

  return (
    <div style={{ padding: 24 }}>
      {actionError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#991b1b' }}>
          {actionError}
        </div>
      )}
      {actionSuccess && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#166534' }}>
          {actionSuccess}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Executive Transport Overview</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Cross-site operational visibility and approvals &mdash; {user?.name || 'Director'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {kpis.map((kpi, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderTop: `3px solid ${kpi.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{kpi.label}</span>
              <span style={{ fontSize: 16 }}>{kpi.icon}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Pending Approvals</h3>
          {approvalsLoading ? (
            <Spinner size={18} />
          ) : approvals.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No pending approvals</div>
          ) : (
            approvals.slice(0, 5).map((a) => (
              <div key={a.id} style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{a.entityLabel || a.requestedBy?.name || a.entityType}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {a.entityType} &middot; {a.requestReason || 'No reason'}
                    {a.priority && <span style={{ marginLeft: 4, padding: '2px 6px', background: a.priority === 'HIGH' ? '#fef3c7' : '#f3f4f6', borderRadius: 4, fontSize: 10 }}>{a.priority}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    disabled={mutating}
                    onClick={() => handleApprove(a.id)}
                    style={{ padding: '5px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, cursor: mutating ? 'not-allowed' : 'pointer', opacity: mutating ? 0.6 : 1 }}
                  >
                    Approve
                  </button>
                  <button
                    disabled={mutating}
                    onClick={() => handleReject(a.id)}
                    style={{ padding: '5px 10px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11, cursor: mutating ? 'not-allowed' : 'pointer', opacity: mutating ? 0.6 : 1 }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Recent Activity</h3>
          {activityLoading ? (
            <Spinner size={18} />
          ) : activity.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13, padding: 16, textAlign: 'center' }}>No recent activity</div>
          ) : (
            activity.slice(0, 6).map((a) => (
              <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{a.message}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(a.createdAt).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Approve Bookings', nav: 'approvals' },
            { label: 'Driver Management', nav: 'drivers' },
            { label: 'Vehicle Fleet', nav: 'vehicles' },
            { label: 'Route Management', nav: 'routes' },
            { label: 'Vendor Overview', nav: 'vendors' },
            { label: 'Reports & Analytics', nav: 'reports' },
          ].map((a, i) => (
            <button key={i} onClick={() => onNavigate?.(a.nav)} style={{ padding: '10px 16px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>{a.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
