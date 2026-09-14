'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../lib/api-client';

interface CapacityOpportunity {
  id: string;
  vehicleId: string;
  tripId: string;
  availableSeats: number;
  departureTime: string;
  matchedDemand: { employeeId: string; employeeName: string; routeMatch: number; deviationMinutes: number; estimatedSaving: number }[];
  status: string;
}

interface CapacitySummary {
  totalOpportunities: number;
  totalAvailableSeats: number;
  totalPotentialSaving: number;
  byStatus: Record<string, number>;
}

export default function CapacityExchangePage() {
  const [opportunities, setOpportunities] = useState<CapacityOpportunity[]>([]);
  const [summary, setSummary] = useState<CapacitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => { loadOpportunities(); loadSummary(); }, []);

  const loadOpportunities = async () => {
    try {
      setOpportunities(await apiGet<CapacityOpportunity[]>('/v1/intelligence/capacity-opportunities'));
    } catch (e) { /* Error handled by UI state */ }
    setLoading(false);
  };

  const loadSummary = async () => {
    try {
      setSummary(await apiGet<CapacitySummary>('/v1/intelligence/capacity-opportunities/summary'));
    } catch (e) { /* Error handled by UI state */ }
  };

  const detectOpportunities = async () => {
    setDetecting(true);
    try {
      await apiPost('/v1/intelligence/capacity-opportunities/detect');
      await Promise.all([loadOpportunities(), loadSummary()]);
    } catch (e) { /* Error handled by UI state */ }
    setDetecting(false);
  };

  const acceptOpportunity = async (id: string) => {
    await apiPost(`/v1/intelligence/capacity-opportunities/${id}/accept`);
    await Promise.all([loadOpportunities(), loadSummary()]);
  };

  const declineOpportunity = async (id: string) => {
    await apiPost(`/v1/intelligence/capacity-opportunities/${id}/decline`);
    await Promise.all([loadOpportunities(), loadSummary()]);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Capacity Exchange</h1>
        <button onClick={detectOpportunities} disabled={detecting} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {detecting ? 'Scanning...' : '🔍 Detect Opportunities'}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Open Opportunities</p>
            <p className="text-2xl font-bold">{summary.totalOpportunities}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Available Seats</p>
            <p className="text-2xl font-bold text-blue-600">{summary.totalAvailableSeats}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Potential Saving</p>
            <p className="text-2xl font-bold text-green-600">₹{summary.totalPotentialSaving.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Accepted</p>
            <p className="text-2xl font-bold">{summary.byStatus.ACCEPTED || 0}</p>
          </div>
        </div>
      )}

      {loading ? <p>Loading...</p> : (
        <div className="space-y-4">
          {opportunities.map((opp) => (
            <div key={opp.id} className="bg-white rounded-lg shadow p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-medium">Vehicle {opp.vehicleId} — Trip {opp.tripId}</p>
                  <p className="text-sm text-gray-500">{opp.availableSeats} seats available · Departure: {new Date(opp.departureTime).toLocaleString()}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${opp.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : opp.status === 'DETECTED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  {opp.status}
                </span>
              </div>

              {opp.matchedDemand?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Compatible Demand</p>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50"><tr>
                      <th className="px-3 py-2 text-left">Employee</th>
                      <th className="px-3 py-2 text-left">Route Match</th>
                      <th className="px-3 py-2 text-left">Deviation</th>
                      <th className="px-3 py-2 text-left">Saving</th>
                    </tr></thead>
                    <tbody className="divide-y">
                      {opp.matchedDemand.map((d, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2">{d.employeeName}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${d.routeMatch}%` }} /></div>
                              <span className="font-mono">{d.routeMatch}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono">+{d.deviationMinutes} min</td>
                          <td className="px-3 py-2 font-mono text-green-600">₹{d.estimatedSaving.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {opp.status === 'DETECTED' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => acceptOpportunity(opp.id)} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">Accept & Match</button>
                  <button onClick={() => declineOpportunity(opp.id)} className="text-gray-500 px-3 py-1 rounded text-sm hover:text-gray-700">Decline</button>
                </div>
              )}
            </div>
          ))}
          {opportunities.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No capacity opportunities found. Run detection to scan for available seats with compatible demand.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
