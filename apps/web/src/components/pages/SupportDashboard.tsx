'use client';
import React, { useState } from 'react';
import Spinner from '../Spinner';
import { useApi, useMutation } from '../../hooks/useApi';

interface KpiData {
  employees?: { total: number };
  drivers?: { total: number; available: number };
  vehicles?: { total: number; active: number };
  trips?: { total: number; active: number; today: number };
  incidents?: { total: number; open: number };
  vendors?: { total: number };
  documents?: { total: number; expiringSoon: number };
  recentAudit?: Array<{ action: string; entity: string; createdAt: string; userId: string }>;
}

interface Incident {
  id: string;
  incidentType: string;
  severity: string;
  status: string;
  description: string;
  reportedBy?: string;
  createdAt: string;
  updatedAt?: string;
  vehicleId?: string;
  tripId?: string;
}

interface TransportKpis {
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
}

interface TransportData {
  kpis: TransportKpis;
}

interface CompanyHealth {
  companies?: Array<{
    id: string;
    name: string;
    code?: string;
    status: string;
    employeeCount?: number;
    activeDrivers?: number;
    complianceScore?: number;
  }>;
}

export default function SupportDashboard({ token, user }: { token: string; user: any }) {
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data: kpiData, loading: kpiLoading, error: kpiError } = useApi<KpiData>('/api/dashboard/kpi');
  const { data: transportData, loading: transportLoading, error: transportError } = useApi<TransportData>('/dashboards/transport');
  const { data: incidentsData, loading: incidentsLoading, refetch: refetchIncidents } = useApi<Incident[]>('/safety/incidents');
  const { data: companyHealth, loading: companyLoading } = useApi<CompanyHealth>('/dashboards/platform/company-health');

  const { mutate, loading: mutating } = useMutation();

  const loading = kpiLoading || transportLoading;
  const error = kpiError || transportError;

  const handleUpdateIncidentStatus = async (incidentId: string, newStatus: string) => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await mutate(`/safety/incidents/${incidentId}/status`, 'PUT', { status: newStatus });
      setActionSuccess(`Incident ${newStatus.toLowerCase()} successfully`);
      refetchIncidents();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update incident');
      setTimeout(() => setActionError(null), 5000);
    }
  };

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#991b1b', margin: '0 0 8px' }}>Failed to load dashboard</h3>
          <p style={{ fontSize: 13, color: '#b91c1c', margin: '0 0 16px' }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>Retry</button>
        </div>
      </div>
    );
  }

  const kpi = kpiData || {} as KpiData;
  const tkpi = (transportData as TransportData)?.kpis || {} as TransportKpis;
  const incidents = Array.isArray(incidentsData) ? incidentsData : [];
  const companyList = (companyHealth as CompanyHealth)?.companies || [];

  const openIncidents = incidents.filter((i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS');
  const resolvedToday = incidents.filter((i) => {
    if (i.status !== 'RESOLVED' && i.status !== 'CLOSED') return false;
    const d = new Date(i.updatedAt || i.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const kpis = [
    { label: 'Open Incidents', value: openIncidents.length, color: openIncidents.length > 0 ? '#ef4444' : '#10b981', icon: '🚨' },
    { label: 'Resolved Today', value: resolvedToday.length, color: '#10b981', icon: '✅' },
    { label: 'Total Incidents', value: kpi.incidents?.total ?? incidents.length, color: '#f59e0b', icon: '📋' },
    { label: 'Active Companies', value: companyList.length || tkpi.totalEmployees || 0, color: '#0891b2', icon: '🏢' },
    { label: 'Active Drivers', value: tkpi.activeDrivers ?? kpi.drivers?.available ?? 0, color: '#7c3aed', icon: '🚗' },
    { label: 'Active Vehicles', value: tkpi.activeVehicles ?? kpi.vehicles?.active ?? 0, color: '#2563eb', icon: '🚘' },
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
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Support Operations</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Ticket management, company triage, issue resolution — {user?.name || 'Support Engineer'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        {kpis.map((kpi, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${kpi.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>{kpi.label}</span>
              <span style={{ fontSize: 16 }}>{kpi.icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Open Incidents</h3>
          {incidentsLoading ? (
            <Spinner size={18} />
          ) : openIncidents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 13 }}>No open incidents</div>
            </div>
          ) : (
            openIncidents.slice(0, 8).map((incident) => (
              <div key={incident.id} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{incident.incidentType || 'Incident'}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{incident.description?.slice(0, 60) || ''}{(incident.description?.length || 0) > 60 ? '...' : ''}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{incident.createdAt ? new Date(incident.createdAt).toLocaleDateString() : ''}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                      background: incident.severity === 'CRITICAL' ? '#fee2e2' : incident.severity === 'HIGH' ? '#fef3c7' : '#f0f9ff',
                      color: incident.severity === 'CRITICAL' ? '#dc2626' : incident.severity === 'HIGH' ? '#d97706' : '#2563eb'
                    }}>{incident.severity || 'NORMAL'}</span>
                    <button
                      disabled={mutating}
                      onClick={() => handleUpdateIncidentStatus(incident.id, 'RESOLVED')}
                      style={{ padding: '3px 8px', background: '#10b981', color: 'white', border: 'none', borderRadius: 4, fontSize: 10, cursor: mutating ? 'not-allowed' : 'pointer', opacity: mutating ? 0.6 : 1 }}
                    >Resolve</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Incident History</h3>
          {incidentsLoading ? (
            <Spinner size={18} />
          ) : incidents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 13 }}>No incidents reported yet</div>
            </div>
          ) : (
            incidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').slice(0, 8).map((incident) => (
              <div key={incident.id} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{incident.incidentType || 'Incident'}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{incident.description?.slice(0, 60) || ''}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                      Resolved {incident.updatedAt ? new Date(incident.updatedAt).toLocaleDateString() : ''}
                    </div>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
                    background: '#dcfce7', color: '#16a34a'
                  }}>{incident.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Company Health</h3>
          {companyLoading ? (
            <Spinner size={18} />
          ) : companyList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div>
              <div style={{ fontSize: 13 }}>No company data available</div>
            </div>
          ) : (
            companyList.slice(0, 6).map((company) => (
              <div key={company.id} style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{company.name}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{company.code || ''}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {company.complianceScore != null && (
                      <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                        background: company.complianceScore >= 80 ? '#dcfce7' : company.complianceScore >= 50 ? '#fef3c7' : '#fee2e2',
                        color: company.complianceScore >= 80 ? '#16a34a' : company.complianceScore >= 50 ? '#d97706' : '#dc2626'
                      }}>{company.complianceScore}%</span>
                    )}
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                      background: company.status === 'ACTIVE' ? '#dcfce7' : '#dbeafe',
                      color: company.status === 'ACTIVE' ? '#16a34a' : '#2563eb'
                    }}>{company.status || 'ACTIVE'}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>Recent Audit Activity</h3>
          {kpi.recentAudit && kpi.recentAudit.length > 0 ? (
            kpi.recentAudit.slice(0, 8).map((audit, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{audit.action}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{audit.entity} · {audit.createdAt ? new Date(audit.createdAt).toLocaleString() : ''}</div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
              <div style={{ fontSize: 13 }}>No recent activity</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
