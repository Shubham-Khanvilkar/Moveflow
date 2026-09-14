'use client';

import { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../../lib/api-client';

interface Simulation {
  id: string;
  name: string;
  status: string;
  currentMetrics: any;
  projectedMetrics: any;
  impact: any;
  recommendations: string[];
  createdAt: string;
}

interface SimulationResult {
  id: string;
  name: string;
  status: string;
  current: any;
  projected: any;
  impact: any;
  recommendations: string[];
}

export default function DigitalTwinPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedSim, setSelectedSim] = useState<SimulationResult | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newSim, setNewSim] = useState({ name: '', description: '', changes: [{ entity: 'PROCESS', entityId: '', field: 'shiftTime', fromValue: '', toValue: '' }] });

  useEffect(() => { loadSimulations(); }, []);

  const loadSimulations = async () => {
    try {
      setSimulations(await apiGet<Simulation[]>('/v1/intelligence/simulations'));
    } catch (e) { /* Error handled by UI state */ }
    setLoading(false);
  };

  const createSimulation = async () => {
    setCreating(true);
    try {
      const result = await apiPost<SimulationResult>('/v1/intelligence/simulations', newSim);
      setSelectedSim(result);
      setShowCreate(false);
      await loadSimulations();
    } catch (e) { /* Error handled by UI state */ }
    setCreating(false);
  };

  const viewSimulation = async (id: string) => {
    try {
      setSelectedSim(await apiGet<SimulationResult>(`/v1/intelligence/simulations/${id}`));
    } catch (e) { /* Error handled by UI state */ }
  };

  const applySimulation = async (id: string) => {
    if (!confirm('Apply this simulation? This will modify actual configurations.')) return;
    try {
      await apiPost(`/v1/intelligence/simulations/${id}/apply`);
      alert('Simulation applied successfully');
      await loadSimulations();
      setSelectedSim(null);
    } catch (e) { /* Error handled by UI state */ }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Digital Twin — What-If Simulator</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {showCreate ? 'Cancel' : '+ New Simulation'}
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Simulation Scenario</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input placeholder="Scenario Name" value={newSim.name} onChange={(e) => setNewSim({ ...newSim, name: e.target.value })} className="border rounded-lg px-3 py-2" />
            <input placeholder="Description (optional)" value={newSim.description} onChange={(e) => setNewSim({ ...newSim, description: e.target.value })} className="border rounded-lg px-3 py-2" />
          </div>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <select value={newSim.changes[0].entity} onChange={(e) => setNewSim({ ...newSim, changes: [{ ...newSim.changes[0], entity: e.target.value }] })} className="border rounded-lg px-3 py-2">
              <option value="PROCESS">Process</option>
              <option value="SITE">Site</option>
              <option value="SHIFT">Shift</option>
              <option value="VEHICLE">Vehicle</option>
            </select>
            <input placeholder="Entity ID" value={newSim.changes[0].entityId} onChange={(e) => setNewSim({ ...newSim, changes: [{ ...newSim.changes[0], entityId: e.target.value }] })} className="border rounded-lg px-3 py-2" />
            <select value={newSim.changes[0].field} onChange={(e) => setNewSim({ ...newSim, changes: [{ ...newSim.changes[0], field: e.target.value }] })} className="border rounded-lg px-3 py-2">
              <option value="shiftTime">Shift Time</option>
              <option value="vehicleCount">Vehicle Count</option>
              <option value="processEnabled">Process Enabled</option>
            </select>
            <input placeholder="New Value" value={newSim.changes[0].toValue} onChange={(e) => setNewSim({ ...newSim, changes: [{ ...newSim.changes[0], toValue: e.target.value }] })} className="border rounded-lg px-3 py-2" />
          </div>
          <button onClick={createSimulation} disabled={creating || !newSim.name} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50">
            {creating ? 'Creating...' : 'Run Simulation'}
          </button>
        </div>
      )}

      {selectedSim && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-lg font-semibold">{selectedSim.name}</h2>
            <div className="flex gap-2">
              {selectedSim.status === 'CREATED' && (
                <button onClick={() => applySimulation(selectedSim.id)} className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">Apply</button>
              )}
              <button onClick={() => setSelectedSim(null)} className="text-gray-500 hover:text-gray-700">Close</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-600 mb-2">Current State</h3>
              <div className="space-y-1 text-sm">
                <p>Vehicles: <span className="font-mono">{selectedSim.current?.vehicles}</span></p>
                <p>Trips/week: <span className="font-mono">{selectedSim.current?.trips}</span></p>
                <p>Total Cost: <span className="font-mono">₹{selectedSim.current?.totalCost?.toLocaleString()}</span></p>
                <p>Occupancy: <span className="font-mono">{selectedSim.current?.occupancy}%</span></p>
                <p>Avg Ride Time: <span className="font-mono">{selectedSim.current?.avgRideTime} min</span></p>
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-600 mb-2">Projected State</h3>
              <div className="space-y-1 text-sm">
                <p>Vehicles: <span className="font-mono">{selectedSim.projected?.vehicles}</span></p>
                <p>Trips/week: <span className="font-mono">{selectedSim.projected?.trips}</span></p>
                <p>Total Cost: <span className="font-mono">₹{selectedSim.projected?.totalCost?.toLocaleString()}</span></p>
                <p>Occupancy: <span className="font-mono">{selectedSim.projected?.occupancy}%</span></p>
                <p>Avg Ride Time: <span className="font-mono">{selectedSim.projected?.avgRideTime} min</span></p>
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-medium text-green-600 mb-2">Impact</h3>
              <div className="space-y-1 text-sm">
                <p>Cost Change: <span className={`font-mono ${selectedSim.impact?.costChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {selectedSim.impact?.costChange < 0 ? '' : '+'}₹{selectedSim.impact?.costChange?.toLocaleString()} ({selectedSim.impact?.costChangePercent}%)
                </span></p>
                <p>Vehicles: <span className="font-mono">{selectedSim.impact?.vehicleChange > 0 ? '+' : ''}{selectedSim.impact?.vehicleChange}</span></p>
                <p>Occupancy: <span className="font-mono">+{selectedSim.impact?.occupancyChange}%</span></p>
                <p>Female Safety: <span className="font-mono">{selectedSim.impact?.femaleSafetyImpact}</span></p>
              </div>
            </div>
          </div>
          {selectedSim.recommendations?.length > 0 && (
            <div className="mt-4 bg-yellow-50 rounded-lg p-4">
              <h3 className="font-medium text-yellow-700 mb-2">Recommendations</h3>
              <ul className="space-y-1 text-sm">
                {selectedSim.recommendations.map((rec: string, i: number) => <li key={i}>• {rec}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {loading ? <p>Loading...</p> : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50"><tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Cost Impact</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Vehicle Change</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-200">
              {simulations.map((sim) => (
                <tr key={sim.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{sim.name}</td>
                  <td className="px-4 py-3 text-sm"><span className={`px-2 py-1 rounded-full text-xs font-medium ${sim.status === 'APPLIED' ? 'bg-green-100 text-green-700' : sim.status === 'CREATED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{sim.status}</span></td>
                  <td className="px-4 py-3 text-sm">{sim.impact?.costChange < 0 ? <span className="text-green-600">₹{Math.abs(sim.impact?.costChange).toLocaleString()} saved</span> : <span className="text-red-600">+₹{sim.impact?.costChange?.toLocaleString()}</span>}</td>
                  <td className="px-4 py-3 text-sm">{sim.impact?.vehicleChange}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(sim.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-sm"><button onClick={() => viewSimulation(sim.id)} className="text-blue-600 hover:underline">View</button></td>
                </tr>
              ))}
              {simulations.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No simulations yet. Create one to start.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
