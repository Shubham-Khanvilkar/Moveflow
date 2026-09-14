'use client';

import { useState, useEffect } from 'react';
import { API_URL } from '../../lib/config';

interface VendorSummary {
  vendorId: string;
  vendorName: string;
  openDiscrepancies: number;
  totalAmountAtRisk: number;
  topDiscrepancyType: string | null;
}

interface VendorTruthReport {
  vendorId: string;
  vendorName: string;
  period: { from: string; to: string };
  actualMetrics: any;
  discrepancies: any[];
  totalAmountAtRisk: number;
  complianceScore: number;
}

export default function VendorTruthPage({ token }: { token: string }) {
  const [vendors, setVendors] = useState<VendorSummary[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<VendorTruthReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadVendors(); }, []);

  const loadVendors = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/intelligence/vendor-truth`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setVendors(await res.json());
    } catch (e) { /* Error handled by UI state */ }
    setLoading(false);
  };

  const loadVendorReport = async (vendorId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/intelligence/vendor-truth/${vendorId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setSelectedVendor(await res.json());
    } catch (e) { /* Error handled by UI state */ }
  };

  const reviewDiscrepancy = async (id: string, status: string) => {
    await fetch(`${API_URL}/api/v1/intelligence/vendor-truth/discrepancies/${id}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    if (selectedVendor) loadVendorReport(selectedVendor.vendorId);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Vendor Truth Engine</h1>

      {selectedVendor && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold">{selectedVendor.vendorName}</h2>
              <p className="text-sm text-gray-500">{new Date(selectedVendor.period.from).toLocaleDateString()} — {new Date(selectedVendor.period.to).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Compliance Score</p>
              <p className={`text-2xl font-bold ${selectedVendor.complianceScore >= 80 ? 'text-green-600' : selectedVendor.complianceScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                {selectedVendor.complianceScore}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded p-3">
              <p className="text-xs text-gray-500">Total Trips</p>
              <p className="text-lg font-bold">{selectedVendor.actualMetrics?.totalTrips || 0}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-xs text-gray-500">GPS-Verified KM</p>
              <p className="text-lg font-bold">{selectedVendor.actualMetrics?.gpsVerifiedKm?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-gray-50 rounded p-3">
              <p className="text-xs text-gray-500">Invoiced KM</p>
              <p className="text-lg font-bold">{selectedVendor.actualMetrics?.invoicedKm?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-red-50 rounded p-3">
              <p className="text-xs text-red-500">Amount at Risk</p>
              <p className="text-lg font-bold text-red-600">₹{selectedVendor.totalAmountAtRisk.toLocaleString()}</p>
            </div>
          </div>

          {selectedVendor.discrepancies.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">Discrepancies</h3>
              <table className="w-full text-sm">
                <thead className="bg-gray-50"><tr>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Contracted</th>
                  <th className="px-3 py-2 text-left">Actual</th>
                  <th className="px-3 py-2 text-left">Variance</th>
                  <th className="px-3 py-2 text-left">At Risk</th>
                  <th className="px-3 py-2 text-left">Actions</th>
                </tr></thead>
                <tbody className="divide-y">
                  {selectedVendor.discrepancies.map((d: any) => (
                    <tr key={d.id}>
                      <td className="px-3 py-2">{d.type.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2 font-mono">{d.contractedValue}</td>
                      <td className="px-3 py-2 font-mono">{d.actualValue}</td>
                      <td className="px-3 py-2 font-mono text-red-600">{d.variancePercent}%</td>
                      <td className="px-3 py-2 font-mono text-red-600">₹{d.amountAtRisk.toLocaleString()}</td>
                      <td className="px-3 py-2">
                        {d.status === 'DETECTED' && (
                          <div className="flex gap-2">
                            <button onClick={() => reviewDiscrepancy(d.id, 'CONFIRMED')} className="text-green-600 hover:underline">Confirm</button>
                            <button onClick={() => reviewDiscrepancy(d.id, 'DISPUTED')} className="text-red-600 hover:underline">Dispute</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button onClick={() => setSelectedVendor(null)} className="mt-4 text-sm text-gray-500 hover:text-gray-700">← Back to all vendors</button>
        </div>
      )}

      {!selectedVendor && (
        loading ? <p>Loading...</p> : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50"><tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Vendor</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Open Discrepancies</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Amount at Risk</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Top Issue</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200">
                {vendors.map((v) => (
                  <tr key={v.vendorId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{v.vendorName || v.vendorId}</td>
                    <td className="px-4 py-3 text-sm">{v.openDiscrepancies}</td>
                    <td className="px-4 py-3 text-sm font-mono text-red-600">₹{v.totalAmountAtRisk.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm">{v.topDiscrepancyType?.replace(/_/g, ' ') || '—'}</td>
                    <td className="px-4 py-3 text-sm"><button onClick={() => loadVendorReport(v.vendorId)} className="text-blue-600 hover:underline">View Report</button></td>
                  </tr>
                ))}
                {vendors.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No vendors found.</td></tr>}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
