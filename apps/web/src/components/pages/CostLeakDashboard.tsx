'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost, apiRequest } from '../../lib/api-client';

interface CostLeak {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  estimatedMonthlyImpact: number;
  status: string;
  detectedAt: string;
}

interface LeakSummary {
  totalLeaks: number;
  totalMonthlyImpact: number;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-blue-100 text-blue-700',
};

const STATUS_COLORS: Record<string, string> = {
  DETECTED: 'bg-red-100 text-red-700',
  ACKNOWLEDGED: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  DISMISSED: 'bg-gray-100 text-gray-500',
};

export default function CostLeakDashboard() {
  const [leaks, setLeaks] = useState<CostLeak[]>([]);
  const [summary, setSummary] = useState<LeakSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [filter, setFilter] = useState({ status: '', severity: '' });

  useEffect(() => { loadLeaks(); loadSummary(); }, [filter]);

  const loadLeaks = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.severity) params.set('severity', filter.severity);
      setLeaks(await apiGet<CostLeak[]>(`/v1/intelligence/cost-leaks?${params}`));
    } catch (e) { /* Error handled by UI state */ }
    setLoading(false);
  };

  const loadSummary = async () => {
    try {
      setSummary(await apiGet<LeakSummary>('/v1/intelligence/cost-leaks/summary'));
    } catch (e) { /* Error handled by UI state */ }
  };

  const detectLeaks = async () => {
    setDetecting(true);
    try {
      await apiPost('/v1/intelligence/cost-leaks/detect');
      await Promise.all([loadLeaks(), loadSummary()]);
    } catch (e) { /* Error handled by UI state */ }
    setDetecting(false);
  };

  const handleLeak = async (id: string, action: string) => {
    await apiRequest(`/v1/intelligence/cost-leaks/${id}/${action}`, { method: 'PATCH' });
    await Promise.all([loadLeaks(), loadSummary()]);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Cost Leak Detector</h1>
        <button onClick={detectLeaks} disabled={detecting} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50">
          {detecting ? 'Scanning...' : '🔍 Run Detection'}
        </button>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Leaks</p>
            <p className="text-2xl font-bold">{summary.totalLeaks}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Monthly Impact</p>
            <p className="text-2xl font-bold text-red-600">₹{summary.totalMonthlyImpact.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Critical/High</p>
            <p className="text-2xl font-bold text-orange-600">{(summary.bySeverity.CRITICAL || 0) + (summary.bySeverity.HIGH || 0)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Detected</p>
            <p className="text-2xl font-bold text-blue-600">{summary.byStatus.DETECTED || 0}</p>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <select value={filter.severity} onChange={(e) => setFilter({ ...filter, severity: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          <option value="DETECTED">Detected</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </select>
      </div>

      {loading ? <p>Loading...</p> : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Severity</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Monthly Impact</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200">
              {leaks.map((leak) => (
                <tr key={leak.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${SEVERITY_COLORS[leak.severity] || ''}`}>{leak.severity}</span></td>
                  <td className="px-4 py-3 text-sm">{leak.type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-sm max-w-md truncate">{leak.title}</td>
                  <td className="px-4 py-3 text-sm font-mono text-red-600">₹{leak.estimatedMonthlyImpact.toLocaleString()}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[leak.status] || ''}`}>{leak.status}</span></td>
                  <td className="px-4 py-3 text-sm">
                    {leak.status === 'DETECTED' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleLeak(leak.id, 'acknowledge')} className="text-yellow-600 hover:underline">Ack</button>
                        <button onClick={() => handleLeak(leak.id, 'resolve')} className="text-green-600 hover:underline">Resolve</button>
                        <button onClick={() => handleLeak(leak.id, 'dismiss')} className="text-gray-500 hover:underline">Dismiss</button>
                      </div>
                    )}
                    {leak.status === 'ACKNOWLEDGED' && (
                      <button onClick={() => handleLeak(leak.id, 'resolve')} className="text-green-600 hover:underline">Resolve</button>
                    )}
                  </td>
                </tr>
              ))}
              {leaks.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No cost leaks detected. Run detection to scan.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
