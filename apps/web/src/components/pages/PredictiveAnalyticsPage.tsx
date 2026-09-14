'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiGet, ApiError } from '../../lib/api-client';

interface Prediction {
  id: string;
  type: string;
  entityId: string;
  entityType: string;
  riskScore: number;
  riskLevel: string;
  factors: { factor: string; weight: number; contribution: number }[];
  recommendation: string;
  confidence: number;
  createdAt: string;
}

interface PredictionSummary {
  total: number;
  byType: Record<string, number>;
  byRisk: Record<string, number>;
  highRiskCount: number;
}

const RISK_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-green-100 text-green-700',
};

export default function PredictiveAnalyticsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [summary, setSummary] = useState<PredictionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [entityId, setEntityId] = useState('');
  const [entityType, setEntityType] = useState('employee');
  const [newPrediction, setNewPrediction] = useState<any>(null);
  const [predictLoading, setPredictLoading] = useState(false);

  const loadPredictions = useCallback(async () => {
    try {
      setError(null);
      const params = typeFilter ? `?type=${typeFilter}` : '';
      const data = await apiGet<Prediction[]>(`/v1/intelligence/predictions${params}`);
      setPredictions(data);
    } catch (e: any) {
      setError(e instanceof ApiError ? e.message : 'Failed to load predictions');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  const loadSummary = useCallback(async () => {
    try {
      const data = await apiGet<PredictionSummary>('/v1/intelligence/predictions/summary');
      setSummary(data);
    } catch (e: any) {
      console.error('Failed to load summary:', e);
    }
  }, []);

  useEffect(() => {
    loadPredictions();
    loadSummary();
  }, [loadPredictions, loadSummary]);

  const runPrediction = async () => {
    if (!entityId) return;
    setPredictLoading(true);
    const endpoint =
      entityType === 'employee'
        ? `no-show/${entityId}`
        : entityType === 'vehicle'
          ? `breakdown/${entityId}`
          : `sla/${entityId}`;
    try {
      const data = await apiGet<any>(`/v1/intelligence/predictions/${endpoint}`);
      setNewPrediction(data);
      loadPredictions();
      loadSummary();
    } catch (e: any) {
      setError(e instanceof ApiError ? e.message : 'Prediction failed');
    } finally {
      setPredictLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Predictive Analytics</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={() => { setError(null); setLoading(true); loadPredictions(); loadSummary(); }}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {summary ? (
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Total Predictions</p>
            <p className="text-2xl font-bold">{summary.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">High Risk</p>
            <p className="text-2xl font-bold text-orange-600">{summary.highRiskCount}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">No-Show</p>
            <p className="text-lg font-bold">{summary.byType.NO_SHOW || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Breakdown Risk</p>
            <p className="text-lg font-bold">{summary.byType.BREAKDOWN_RISK || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">SLA Risk</p>
            <p className="text-lg font-bold">{summary.byType.SLA_RISK || 0}</p>
          </div>
        </div>
      ) : !loading && !error ? (
        <div className="grid grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-6 bg-gray-200 rounded w-12" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="font-semibold mb-3">Run New Prediction</h2>
        <div className="flex gap-4 items-end">
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setEntityId(''); }}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="employee">Employee (No-Show)</option>
            <option value="vehicle">Vehicle (Breakdown)</option>
            <option value="trip">Trip (SLA Risk)</option>
          </select>
          <input
            placeholder={`${entityType} ID`}
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm flex-1"
          />
          <button
            onClick={runPrediction}
            disabled={!entityId || predictLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {predictLoading ? 'Predicting...' : 'Predict'}
          </button>
        </div>
      </div>

      {newPrediction && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold">Prediction Result</h2>
            <button onClick={() => setNewPrediction(null)} className="text-gray-500 hover:text-gray-700">
              Close
            </button>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500">Risk Score</p>
              <p className={`text-3xl font-bold ${newPrediction.riskLevel === 'CRITICAL' || newPrediction.riskLevel === 'HIGH' ? 'text-red-600' : newPrediction.riskLevel === 'MEDIUM' ? 'text-yellow-600' : 'text-green-600'}`}>
                {newPrediction.riskScore}/100
              </p>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${RISK_COLORS[newPrediction.riskLevel]}`}>{newPrediction.riskLevel}</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Confidence</p>
              <p className="text-2xl font-bold">{Math.round(newPrediction.confidence * 100)}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Recommendation</p>
              <p className="text-sm">{newPrediction.recommendation}</p>
            </div>
          </div>
          {newPrediction.factors?.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-600 mb-2">Contributing Factors</p>
              <div className="space-y-1">
                {newPrediction.factors.map((f: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{f.factor}</span>
                    <span className="font-mono">+{f.contribution} (weight: {f.weight}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setLoading(true); }}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          <option value="NO_SHOW">No-Show</option>
          <option value="BREAKDOWN_RISK">Breakdown Risk</option>
          <option value="SLA_RISK">SLA Risk</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-16" />
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-4 bg-gray-200 rounded w-20" />
                <div className="h-4 bg-gray-200 rounded w-16" />
                <div className="h-4 bg-gray-200 rounded w-12" />
                <div className="h-4 bg-gray-200 rounded flex-1" />
                <div className="h-4 bg-gray-200 rounded w-20" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Risk</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Entity</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Score</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Confidence</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Recommendation</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {predictions.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${RISK_COLORS[p.riskLevel]}`}>
                      {p.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{p.type.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 text-sm font-mono">{p.entityId}</td>
                  <td className="px-4 py-3 text-sm font-mono">{p.riskScore}/100</td>
                  <td className="px-4 py-3 text-sm">{Math.round(p.confidence * 100)}%</td>
                  <td className="px-4 py-3 text-sm max-w-sm truncate">{p.recommendation}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {predictions.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center text-gray-500">
                      <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="font-medium">No predictions yet</p>
                      <p className="text-sm mt-1">Run a prediction above to get started</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
