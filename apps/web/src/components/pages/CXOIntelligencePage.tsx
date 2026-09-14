'use client';

import { useState, useEffect } from 'react';
import { API_URL } from '../../lib/config';

interface HealthScore {
  overallScore: number;
  breakdown: Record<string, number>;
  recommendations: string[];
}

interface DrillDown {
  level: string;
  entityName: string;
  totalCost: number;
  tripCount: number;
  costPerTrip: number;
  children: { id: string; name: string; cost: number; trips: number; costPerTrip: number; percentOfTotal: number }[];
  trends: { period: string; cost: number; trips: number }[];
}

interface CarbonMetrics {
  totalCo2Tonnes: number;
  co2PerEmployee: number;
  co2PerTrip: number;
  evUtilization: number;
  sharedTripPercent: number;
  emptySeatEmissions: number;
  byFuelType: Record<string, { trips: number; co2Kg: number }>;
}

interface SLACompliance {
  name: string;
  metric: string;
  targetValue: number;
  targetUnit: string;
  actualValue: number;
  compliancePercent: number;
  breachCount: number;
  status: string;
}

export default function CXOIntelligencePage() {
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);
  const [carbon, setCarbon] = useState<CarbonMetrics | null>(null);
  const [sla, setSla] = useState<SLACompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'health' | 'drilldown' | 'carbon' | 'sla'>('health');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [healthRes, drillRes, carbonRes, slaRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/intelligence/cxo/health-score/company/current`, { headers }),
        fetch(`${API_URL}/api/v1/intelligence/cxo/drill-down?level=company`, { headers }),
        fetch(`${API_URL}/api/v1/intelligence/carbon`, { headers }),
        fetch(`${API_URL}/api/v1/intelligence/sla/compliance`, { headers }),
      ]);
      if (healthRes.ok) setHealthScore(await healthRes.json());
      if (drillRes.ok) setDrillDown(await drillRes.json());
      if (carbonRes.ok) setCarbon(await carbonRes.json());
      if (slaRes.ok) setSla(await slaRes.json());
    } catch (e) { /* Error handled by UI state */ }
    setLoading(false);
  };

  const drillInto = async (level: string, id: string) => {
    const res = await fetch(`${API_URL}/api/v1/intelligence/cxo/drill-down?level=${level}&id=${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    if (res.ok) setDrillDown(await res.json());
  };

  const scoreColor = (score: number) => score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
  const scoreBg = (score: number) => score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500';

  if (loading) return <div className="p-6"><p>Loading intelligence data...</p></div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">CXO Intelligence Dashboard</h1>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b">
        {[['health', 'Health Score'], ['drilldown', 'Cost Drill-Down'], ['carbon', 'Carbon Intelligence'], ['sla', 'SLA Compliance']].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Health Score Tab */}
      {activeTab === 'health' && healthScore && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-6 mb-6">
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle cx="64" cy="64" r="56" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <circle cx="64" cy="64" r="56" fill="none" stroke={healthScore.overallScore >= 80 ? '#22c55e' : healthScore.overallScore >= 60 ? '#eab308' : '#ef4444'}
                    strokeWidth="8" strokeDasharray={`${healthScore.overallScore * 3.52} 352`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-3xl font-bold ${scoreColor(healthScore.overallScore)}`}>{healthScore.overallScore}</span>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold">Transport Health Score</h2>
                <p className="text-gray-500">Composite score across 7 dimensions</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {Object.entries(healthScore.breakdown).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-2">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                      <circle cx="32" cy="32" r="28" fill="none" className={scoreBg(value)}
                        strokeWidth="4" strokeDasharray={`${value * 1.76} 176`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-sm font-bold ${scoreColor(value)}`}>{value}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                </div>
              ))}
            </div>
          </div>

          {healthScore.recommendations.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="font-semibold mb-3">Recommendations</h3>
              <ul className="space-y-2">
                {healthScore.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-blue-500 mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Drill-Down Tab */}
      {activeTab === 'drilldown' && drillDown && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-semibold">{drillDown.entityName}</h2>
                <p className="text-sm text-gray-500 capitalize">{drillDown.level} Level</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">₹{drillDown.totalCost.toLocaleString()}</p>
                <p className="text-sm text-gray-500">{drillDown.tripCount} trips · ₹{drillDown.costPerTrip}/trip</p>
              </div>
            </div>

            {/* Trend Chart (simple bar) */}
            {drillDown.trends.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Monthly Trend</h3>
                <div className="flex items-end gap-1 h-24">
                  {drillDown.trends.map((t, i) => {
                    const maxCost = Math.max(...drillDown.trends.map(x => x.cost));
                    const height = maxCost > 0 ? (t.cost / maxCost) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-blue-500 rounded-t" style={{ height: `${height}%` }} title={`₹${t.cost.toLocaleString()}`} />
                        <p className="text-[9px] text-gray-400 mt-1">{t.period.split('-')[1]}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Children breakdown */}
            {drillDown.children.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-3">Breakdown</h3>
                <div className="space-y-2">
                  {drillDown.children.map((child) => (
                    <div key={child.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        const nextLevel = drillDown.level === 'company' ? 'site' : drillDown.level === 'site' ? 'process' : 'vendor';
                        drillInto(nextLevel, child.id);
                      }}>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{child.name}</p>
                        <p className="text-xs text-gray-500">{child.trips} trips · ₹{child.costPerTrip}/trip</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono">₹{child.cost.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{child.percentOfTotal}%</p>
                      </div>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${child.percentOfTotal}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Carbon Tab */}
      {activeTab === 'carbon' && carbon && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total CO₂</p>
              <p className="text-2xl font-bold">{carbon.totalCo2Tonnes} t</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Per Employee</p>
              <p className="text-2xl font-bold">{carbon.co2PerEmployee} kg</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">EV Utilization</p>
              <p className="text-2xl font-bold text-green-600">{carbon.evUtilization}%</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Shared Trips</p>
              <p className="text-2xl font-bold text-blue-600">{carbon.sharedTripPercent}%</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">Emissions by Fuel Type</h3>
            <div className="space-y-3">
              {Object.entries(carbon.byFuelType).map(([fuel, data]) => (
                <div key={fuel} className="flex items-center gap-4">
                  <span className="w-24 text-sm font-medium capitalize">{fuel.toLowerCase()}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div className={`h-4 rounded-full ${fuel === 'ELECTRIC' ? 'bg-green-500' : fuel === 'HYBRID' ? 'bg-yellow-500' : 'bg-gray-500'}`}
                      style={{ width: `${carbon.totalCo2Tonnes > 0 ? (data.co2Kg / (carbon.totalCo2Tonnes * 1000)) * 100 : 0}%` }} />
                  </div>
                  <span className="text-sm font-mono w-20 text-right">{Math.round(data.co2Kg)} kg</span>
                  <span className="text-xs text-gray-500 w-16 text-right">{data.trips} trips</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Empty Seat Emissions:</strong> {carbon.emptySeatEmissions} kg CO₂/month from underutilized seats.
              Increasing shared trips by 10% could reduce this by ~{Math.round(carbon.emptySeatEmissions * 0.3)} kg.
            </p>
          </div>
        </div>
      )}

      {/* SLA Tab */}
      {activeTab === 'sla' && (
        <div className="space-y-6">
          {sla.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No SLA definitions configured. Create SLA definitions to start tracking compliance.
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50"><tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">SLA</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Target</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Actual</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Compliance</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Breaches</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-200">
                  {sla.map((s, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-sm font-mono">{s.targetValue} {s.targetUnit}</td>
                      <td className="px-4 py-3 text-sm font-mono">{s.actualValue}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div className={`h-2 rounded-full ${s.compliancePercent >= 95 ? 'bg-green-500' : s.compliancePercent >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(100, s.compliancePercent)}%` }} />
                          </div>
                          <span className="text-sm font-mono">{s.compliancePercent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{s.breachCount}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.status === 'MET' ? 'bg-green-100 text-green-700' : s.status === 'WARNING' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
