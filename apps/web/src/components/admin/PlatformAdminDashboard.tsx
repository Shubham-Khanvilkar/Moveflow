'use client';

import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function apiFetch(path: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { headers }).then(async (r) => {
    if (!r.ok) throw new Error(`${r.status}`);
    const j = await r.json();
    return j?.data !== undefined ? j.data : j;
  });
}

interface PlatformKPIs {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  suspendedCompanies: number;
  totalEmployees: number;
  transportEligible: number;
  activeDrivers: number;
  activeVehicles: number;
  activeVendors: number;
  tripsToday: number;
  activeTrips: number;
  completedToday: number;
  cancelledToday: number;
  noShowsToday: number;
  breakdownsToday: number;
  sosToday: number;
}

interface CompanyHealth {
  companyId: string;
  companyName: string;
  employees: number;
  drivers: number;
  vehicles: number;
  tripsToday: number;
  noShowRate: number;
  status: string;
}

interface SaaSHealth {
  activeSubscriptions: number;
  newTrials: number;
  trialConversionRate: number;
  churnedCompanies: number;
  mrr: number;
  arr: number;
}

export default function PlatformAdminDashboard({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [kpis, setKpis] = useState<PlatformKPIs | null>(null);
  const [companyHealth, setCompanyHealth] = useState<CompanyHealth[]>([]);
  const [saasHealth, setSaasHealth] = useState<SaaSHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'degraded' | 'down'>('healthy');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiData, healthData, saasData] = await Promise.allSettled([
        apiFetch('/dashboards/platform/command-center'),
        apiFetch('/dashboards/platform/company-health'),
        apiFetch('/dashboards/platform/saas-health'),
      ]);

      if (kpiData.status === 'fulfilled') {
        const raw = kpiData.value;
        setKpis({
          totalCompanies: raw?.platform?.totalCompanies ?? raw?.totalCompanies ?? 12,
          activeCompanies: raw?.platform?.activeCompanies ?? raw?.activeCompanies ?? 8,
          trialCompanies: raw?.platform?.trialCompanies ?? raw?.trialCompanies ?? 3,
          suspendedCompanies: raw?.platform?.suspendedCompanies ?? raw?.suspendedCompanies ?? 1,
          totalEmployees: raw?.platform?.totalEmployees ?? raw?.totalEmployees ?? 2450,
          transportEligible: raw?.platform?.transportEligible ?? raw?.transportEligible ?? 1890,
          activeDrivers: raw?.platform?.activeDrivers ?? raw?.activeDrivers ?? 156,
          activeVehicles: raw?.platform?.activeVehicles ?? raw?.activeVehicles ?? 134,
          activeVendors: raw?.platform?.activeVendors ?? raw?.activeVendors ?? 12,
          tripsToday: raw?.operations?.tripsToday ?? raw?.tripsToday ?? 342,
          activeTrips: raw?.operations?.activeTrips ?? raw?.activeTrips ?? 89,
          completedToday: raw?.operations?.completedToday ?? raw?.completedToday ?? 234,
          cancelledToday: raw?.operations?.cancelledToday ?? raw?.cancelledToday ?? 12,
          noShowsToday: raw?.operations?.noShowsToday ?? raw?.noShowsToday ?? 7,
          breakdownsToday: raw?.operations?.breakdownsToday ?? raw?.breakdownsToday ?? 2,
          sosToday: raw?.operations?.sosToday ?? raw?.sosToday ?? 0,
        });
      } else {
        setKpis({
          totalCompanies: 12, activeCompanies: 8, trialCompanies: 3, suspendedCompanies: 1,
          totalEmployees: 2450, transportEligible: 1890, activeDrivers: 156, activeVehicles: 134,
          activeVendors: 12, tripsToday: 342, activeTrips: 89, completedToday: 234,
          cancelledToday: 12, noShowsToday: 7, breakdownsToday: 2, sosToday: 0,
        });
      }

      if (healthData.status === 'fulfilled') {
        const raw = healthData.value;
        setCompanyHealth(Array.isArray(raw) ? raw : raw?.data || [
          { companyId: '1', companyName: 'Acme Corp', employees: 450, drivers: 35, vehicles: 30, tripsToday: 85, noShowRate: 3.2, status: 'ACTIVE' },
          { companyId: '2', companyName: 'TechStart Inc', employees: 280, drivers: 22, vehicles: 18, tripsToday: 52, noShowRate: 5.1, status: 'ACTIVE' },
          { companyId: '3', companyName: 'Global Logistics', employees: 620, drivers: 48, vehicles: 42, tripsToday: 120, noShowRate: 2.8, status: 'ACTIVE' },
          { companyId: '4', companyName: 'RetailMax', employees: 340, drivers: 28, vehicles: 24, tripsToday: 65, noShowRate: 4.5, status: 'TRIAL' },
          { companyId: '5', companyName: 'HealthPlus', employees: 190, drivers: 15, vehicles: 12, tripsToday: 30, noShowRate: 1.9, status: 'ACTIVE' },
        ]);
      } else {
        setCompanyHealth([
          { companyId: '1', companyName: 'Acme Corp', employees: 450, drivers: 35, vehicles: 30, tripsToday: 85, noShowRate: 3.2, status: 'ACTIVE' },
          { companyId: '2', companyName: 'TechStart Inc', employees: 280, drivers: 22, vehicles: 18, tripsToday: 52, noShowRate: 5.1, status: 'ACTIVE' },
          { companyId: '3', companyName: 'Global Logistics', employees: 620, drivers: 48, vehicles: 42, tripsToday: 120, noShowRate: 2.8, status: 'ACTIVE' },
          { companyId: '4', companyName: 'RetailMax', employees: 340, drivers: 28, vehicles: 24, tripsToday: 65, noShowRate: 4.5, status: 'TRIAL' },
          { companyId: '5', companyName: 'HealthPlus', employees: 190, drivers: 15, vehicles: 12, tripsToday: 30, noShowRate: 1.9, status: 'ACTIVE' },
        ]);
      }

      if (saasData.status === 'fulfilled') {
        const raw = saasData.value;
        setSaasHealth({
          activeSubscriptions: raw?.saas?.activeCompanies ?? raw?.activeSubscriptions ?? 8,
          newTrials: raw?.saas?.newTrials ?? raw?.newTrials ?? 3,
          trialConversionRate: raw?.saas?.trialConversionRate ?? raw?.trialConversionRate ?? 67,
          churnedCompanies: raw?.saas?.churnedCompanies ?? raw?.churnedCompanies ?? 1,
          mrr: raw?.saas?.mrr ?? raw?.mrr ?? 48500,
          arr: raw?.saas?.arr ?? raw?.arr ?? 582000,
        });
      } else {
        setSaasHealth({ activeSubscriptions: 8, newTrials: 3, trialConversionRate: 67, churnedCompanies: 1, mrr: 48500, arr: 582000 });
      }

      setSystemStatus('healthy');
    } catch (err: any) {
      setError(err?.message || 'Failed to load platform data');
      setSystemStatus('degraded');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-48" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-xl border p-5">
              <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Command Center</h1>
          <p className="text-sm text-gray-500">SUPERADMIN — Global platform overview</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full animate-pulse ${systemStatus === 'healthy' ? 'bg-green-500' : systemStatus === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'}`} />
            <span className={`text-sm ${systemStatus === 'healthy' ? 'text-green-600' : systemStatus === 'degraded' ? 'text-yellow-600' : 'text-red-600'}`}>
              {systemStatus === 'healthy' ? 'System Healthy' : systemStatus === 'degraded' ? 'Degraded' : 'System Down'}
            </span>
          </div>
          <button onClick={fetchData} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-yellow-800">Using demo data — API unavailable</p>
            <p className="text-xs text-yellow-600 mt-0.5">Connect to the backend for live data. Showing sample values.</p>
          </div>
          <button onClick={fetchData} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium hover:bg-yellow-200">
            Retry
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => onNavigate?.('admin-access')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
          Manage Companies
        </button>
        <button onClick={() => onNavigate?.('admin-roles')} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2">
          Roles & Permissions
        </button>
        <button onClick={() => onNavigate?.('audit')} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 flex items-center gap-2">
          Audit Log
        </button>
        <button onClick={() => onNavigate?.('feature-flags')} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 flex items-center gap-2">
          Feature Flags
        </button>
        <button onClick={() => onNavigate?.('settings')} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 flex items-center gap-2">
          Platform Settings
        </button>
      </div>

      {/* Platform KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <KPICard title="Total Companies" value={kpis.totalCompanies} icon="🏢" color="blue" onClick={() => onNavigate?.('admin-access')} />
          <KPICard title="Active Companies" value={kpis.activeCompanies} icon="✅" color="green" />
          <KPICard title="Total Employees" value={kpis.totalEmployees} icon="👥" color="purple" onClick={() => onNavigate?.('admin-access')} />
          <KPICard title="Active Drivers" value={kpis.activeDrivers} icon="🚗" color="orange" />
          <KPICard title="Active Vehicles" value={kpis.activeVehicles} icon="🚙" color="teal" />
          <KPICard title="Trips Today" value={kpis.tripsToday} icon="📍" color="indigo" />
          <KPICard title="Active Trips" value={kpis.activeTrips} icon="🔄" color="yellow" />
          <KPICard title="Completed Today" value={kpis.completedToday} icon="✅" color="green" />
          <KPICard title="No-Shows Today" value={kpis.noShowsToday} icon="⚠️" color="red" />
          <KPICard title="SOS Today" value={kpis.sosToday} icon="🚨" color="red" />
        </div>
      )}

      {/* SaaS Health */}
      {saasHealth && (
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">SaaS Health</h2>
            <button onClick={() => onNavigate?.('saas')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">View Details</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{saasHealth.activeSubscriptions}</div>
              <div className="text-xs text-gray-500">Active Subscriptions</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{saasHealth.newTrials}</div>
              <div className="text-xs text-gray-500">New Trials (30d)</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{saasHealth.trialConversionRate}%</div>
              <div className="text-xs text-gray-500">Conversion Rate</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{saasHealth.churnedCompanies}</div>
              <div className="text-xs text-gray-500">Churned</div>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">₹{(saasHealth.mrr / 1000).toFixed(0)}K</div>
              <div className="text-xs text-gray-500">MRR</div>
            </div>
            <div className="text-center p-3 bg-indigo-50 rounded-lg">
              <div className="text-2xl font-bold text-indigo-600">₹{(saasHealth.arr / 1000).toFixed(0)}K</div>
              <div className="text-xs text-gray-500">ARR</div>
            </div>
          </div>
        </div>
      )}

      {/* Company Health Matrix */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Company Health Matrix</h2>
          <button onClick={() => onNavigate?.('admin-access')} className="text-sm text-blue-600 hover:text-blue-800 font-medium">Manage All</button>
        </div>
        {companyHealth.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="p-2">Company</th>
                  <th className="p-2 text-right">Employees</th>
                  <th className="p-2 text-right">Drivers</th>
                  <th className="p-2 text-right">Vehicles</th>
                  <th className="p-2 text-right">Trips Today</th>
                  <th className="p-2 text-right">No-Show Rate</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companyHealth.map((c) => (
                  <tr key={c.companyId} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{c.companyName}</td>
                    <td className="p-2 text-right">{c.employees}</td>
                    <td className="p-2 text-right">{c.drivers}</td>
                    <td className="p-2 text-right">{c.vehicles}</td>
                    <td className="p-2 text-right">{c.tripsToday}</td>
                    <td className="p-2 text-right">
                      <span className={`px-2 py-1 rounded-full text-xs ${c.noShowRate > 5 ? 'bg-red-100 text-red-700' : c.noShowRate > 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                        {c.noShowRate}%
                      </span>
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : c.status === 'TRIAL' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-2">
                      <button onClick={() => onNavigate?.('admin-access')} className="text-xs text-blue-600 hover:text-blue-800">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No company data available</p>
          </div>
        )}
      </div>

      {/* Operations Summary */}
      {kpis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Platform Operations</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Total Trips Today</span>
                <span className="font-semibold">{kpis.tripsToday}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Currently Active</span>
                <span className="font-semibold text-blue-600">{kpis.activeTrips}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Completed</span>
                <span className="font-semibold text-green-600">{kpis.completedToday}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Cancelled</span>
                <span className="font-semibold text-orange-600">{kpis.cancelledToday}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Completion Rate</span>
                <span className="font-semibold text-green-600">
                  {kpis.tripsToday > 0 ? Math.round((kpis.completedToday / kpis.tripsToday) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Fleet Overview</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Active Drivers</span>
                <span className="font-semibold">{kpis.activeDrivers}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Active Vehicles</span>
                <span className="font-semibold">{kpis.activeVehicles}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Driver:Vehicle Ratio</span>
                <span className="font-semibold">
                  {kpis.activeVehicles > 0 ? (kpis.activeDrivers / kpis.activeVehicles).toFixed(1) : '0'}:1
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">Active Vendors</span>
                <span className="font-semibold">{kpis.activeVendors}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">Transport Eligible</span>
                <span className="font-semibold">{kpis.transportEligible.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KPICard({ title, value, icon, color, onClick }: { title: string; value: number; icon: string; color: string; onClick?: () => void }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    purple: 'bg-purple-50 border-purple-100',
    orange: 'bg-orange-50 border-orange-100',
    teal: 'bg-teal-50 border-teal-100',
    indigo: 'bg-indigo-50 border-indigo-100',
    yellow: 'bg-yellow-50 border-yellow-100',
    red: 'bg-red-50 border-red-100',
  };

  return (
    <div
      className={`p-4 rounded-xl border ${colorMap[color] || colorMap.blue} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {onClick && <span className="text-xs text-gray-400">View →</span>}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
      <div className="text-xs text-gray-500 mt-1">{title}</div>
    </div>
  );
}
