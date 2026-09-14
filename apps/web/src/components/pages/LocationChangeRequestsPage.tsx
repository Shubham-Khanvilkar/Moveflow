'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../../hooks/useApi';
import { useAuth } from '../admin/AuthContext';

interface LocationChangeRequest {
  id: string;
  employeeId: string;
  requestedBy: string;
  oldLatitude: number;
  oldLongitude: number;
  oldAddress: string;
  newLatitude: number;
  newLongitude: number;
  newAddress: string;
  reason: string;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  effectiveDate: string | null;
  impactAnalysis: any;
  distanceChange: number | null;
  routeImpact: string | null;
  costImpact: number | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function LocationChangeRequestsPage() {
  const { user } = useAuth();
  const companyId = user?.companyId || user?.company?.id || '';

  const [requests, setRequests] = useState<LocationChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<LocationChangeRequest | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [confirmReject, setConfirmReject] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ companyId });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiFetch(`/platform/location-changes?${params}`);
      const list = Array.isArray(res) ? res : res?.data || [];
      setRequests(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load location change requests');
    } finally {
      setLoading(false);
    }
  }, [companyId, statusFilter]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleDecide = async (decision: 'APPROVED' | 'REJECTED') => {
    if (!selectedRequest) return;
    setDeciding(true);
    setError('');
    try {
      await apiFetch(`/platform/location-changes/${selectedRequest.id}/decide`, {
        method: 'PATCH',
        body: JSON.stringify({
          decision,
          rejectionReason: decision === 'REJECTED' ? rejectionReason : undefined,
          effectiveDate: effectiveDate || undefined,
        }),
      });
      setSelectedRequest(null);
      setRejectionReason('');
      setEffectiveDate('');
      setConfirmReject(false);
      fetchRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to process decision');
    } finally {
      setDeciding(false);
    }
  };

  const openRejectConfirm = () => {
    if (!rejectionReason.trim()) return;
    setConfirmReject(true);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Location Change Requests</h1>
          <p className="text-gray-600 mt-1">Review and approve employee pickup location changes</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 ml-2 text-sm font-medium">Dismiss</button>
        </div>
      )}

      {!companyId && !loading && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-4">
          No company context available. Please ensure you are logged in.
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <button onClick={fetchRequests} disabled={loading} className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Old Location</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">New Location</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Distance</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Impact</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading location change requests...
                  </div>
                </td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <div className="text-gray-400">
                    <svg className="mx-auto h-12 w-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm font-medium text-gray-600">No location change requests found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {statusFilter ? `No ${statusFilter.toLowerCase()} requests` : 'No requests have been submitted yet'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : requests.map(req => (
              <tr key={req.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono text-gray-600">{req.id.slice(0, 8)}...</td>
                <td className="px-4 py-3 text-sm">{req.employeeId.slice(0, 8)}...</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{req.oldAddress || 'No address'}</td>
                <td className="px-4 py-3 text-sm text-gray-600 max-w-[150px] truncate">{req.newAddress}</td>
                <td className="px-4 py-3 text-sm">{req.distanceChange != null ? `${req.distanceChange} km` : '-'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    req.routeImpact === 'HIGH' ? 'bg-red-100 text-red-700' :
                    req.routeImpact === 'MODERATE' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {req.routeImpact || 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[req.status] || ''}`}>
                    {req.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {new Date(req.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedRequest(req)}
                    className="text-blue-600 text-sm hover:underline"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold">Location Change Request</h2>
                <button onClick={() => { setSelectedRequest(null); setConfirmReject(false); }} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Old Location</h3>
                  <p className="text-sm">{selectedRequest.oldAddress || 'No address'}</p>
                  <p className="text-xs text-gray-400">{selectedRequest.oldLatitude}, {selectedRequest.oldLongitude}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">New Location</h3>
                  <p className="text-sm">{selectedRequest.newAddress}</p>
                  <p className="text-xs text-gray-400">{selectedRequest.newLatitude}, {selectedRequest.newLongitude}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Impact Analysis</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Distance Change:</span>
                    <p className="font-medium">{selectedRequest.distanceChange != null ? `${selectedRequest.distanceChange} km` : 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Route Impact:</span>
                    <p className={`font-medium ${
                      selectedRequest.routeImpact === 'HIGH' ? 'text-red-600' :
                      selectedRequest.routeImpact === 'MODERATE' ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>{selectedRequest.routeImpact || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Cost Impact:</span>
                    <p className="font-medium">{selectedRequest.costImpact != null ? `₹${selectedRequest.costImpact}` : 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Reason</h3>
                <p className="text-sm">{selectedRequest.reason}</p>
              </div>

              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[selectedRequest.status] || ''}`}>
                  {selectedRequest.status}
                </span>
              </div>

              {selectedRequest.status === 'PENDING' && (
                <div className="border-t pt-4 mt-4">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date (optional)</label>
                    <input
                      type="date"
                      value={effectiveDate}
                      onChange={e => setEffectiveDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason (required to reject)</label>
                    <textarea
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      rows={2}
                      placeholder="Enter reason for rejection..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDecide('APPROVED')}
                      disabled={deciding}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {deciding ? 'Processing...' : 'Approve Change'}
                    </button>
                    <button
                      onClick={openRejectConfirm}
                      disabled={deciding || !rejectionReason.trim()}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => { setSelectedRequest(null); setConfirmReject(false); }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {selectedRequest.status !== 'PENDING' && selectedRequest.approvedBy && (
                <div className="border-t pt-4 mt-4 text-sm text-gray-600">
                  <p>Decided by: {selectedRequest.approvedBy}</p>
                  {selectedRequest.approvedAt && <p>At: {new Date(selectedRequest.approvedAt).toLocaleString()}</p>}
                  {selectedRequest.rejectionReason && <p className="text-red-600 mt-1">Reason: {selectedRequest.rejectionReason}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Dialog */}
      {confirmReject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Rejection</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to reject this location change request? This action cannot be undone.
            </p>
            <div className="bg-red-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700"><span className="font-medium">Reason:</span> {rejectionReason}</p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmReject(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Go Back
              </button>
              <button
                onClick={() => handleDecide('REJECTED')}
                disabled={deciding}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deciding ? 'Processing...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
