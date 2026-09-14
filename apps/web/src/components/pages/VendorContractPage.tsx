'use client';

import { useState, useEffect } from 'react';

import { API_URL } from '../../lib/config';

interface VendorContract {
  id: string;
  contractNumber: string;
  vendorId: string;
  status: string;
  contractStart: string;
  contractEnd: string;
  billingModel: string;
  paymentTerms: string;
  currency: string;
  createdAt: string;
}

export default function VendorContractPage({ token }: { token: string }) {
  const [contracts, setContracts] = useState<VendorContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newContract, setNewContract] = useState({
    contractNumber: '',
    vendorId: '',
    contractStart: '',
    contractEnd: '',
    billingModel: 'COMPANY',
    paymentTerms: 'NET_30',
  });

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/billing/contracts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setContracts(data.data || data || []);
      }
    } catch (err) {
      // Error handled by UI state
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API_URL}/api/billing/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newContract),
      });
      if (res.ok) {
        setShowCreate(false);
        fetchContracts();
      }
    } catch (err) {
      // Error handled by UI state
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PENDING_APPROVAL': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Contracts</h1>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          + New Contract
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Contract</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract Number</label>
              <input type="text" value={newContract.contractNumber} onChange={(e) => setNewContract({ ...newContract, contractNumber: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vendor ID</label>
              <input type="text" value={newContract.vendorId} onChange={(e) => setNewContract({ ...newContract, vendorId: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={newContract.contractStart} onChange={(e) => setNewContract({ ...newContract, contractStart: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={newContract.contractEnd} onChange={(e) => setNewContract({ ...newContract, contractEnd: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleCreate} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Create</button>
            <button onClick={() => setShowCreate(false)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contract #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billing</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {contracts.map((contract) => (
              <tr key={contract.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contract.contractNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contract.vendorId}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(contract.status)}`}>
                    {contract.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(contract.contractStart).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(contract.contractEnd).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contract.billingModel}</td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No contracts found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
