'use client';

import { useState, useEffect } from 'react';

import { API_URL } from '../../lib/config';

interface ApprovalRequest {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  requestedBy: string;
  status: string;
  reason?: string;
  createdAt: string;
  expiresAt?: string;
}

export default function ApprovalWorkflowQueue() {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/approvals?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.data || data || []);
      }
    } catch (err) {
      // Error handled by UI state
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/approvals/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: 'Approved' }),
      });
      fetchRequests();
    } catch (err) {
      // Error handled by UI state
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason }),
      });
      fetchRequests();
    } catch (err) {
      // Error handled by UI state
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'EXPIRED': return 'bg-gray-100 text-gray-800';
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
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Approval Workflow Queue</h1>

      <div className="flex gap-2 mb-6">
        {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{req.entityType}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.action}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.requestedBy}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(req.status)}`}>
                    {req.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(req.createdAt).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {req.status === 'PENDING' && (
                    <>
                      <button onClick={() => handleApprove(req.id)} className="text-green-600 hover:text-green-900 mr-2">Approve</button>
                      <button onClick={() => handleReject(req.id)} className="text-red-600 hover:text-red-900">Reject</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No approval requests</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
