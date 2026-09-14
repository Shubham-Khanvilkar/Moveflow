'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../lib/config';

interface NoShowRecord {
  id: string;
  employeeId: string;
  tripId: string;
  driverId: string;
  reason: string;
  recordedAt: string;
  overturned?: boolean;
  employee?: { name: string; email: string };
  trip?: { id: string; status: string; date: string; pickupAddress?: string };
  driver?: { firstName?: string; lastName?: string };
}

interface Appeal {
  id: string;
  employeeId: string;
  noShowRecordId: string;
  tripId: string;
  reason: string;
  supportingEvidence?: string;
  status: 'SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'ESCALATED' | 'SLA_BREACHED' | 'DECIDED';
  decision?: 'APPROVED' | 'REJECTED';
  decisionReason?: string;
  submittedAt: string;
  reviewedAt?: string;
  slaDeadline?: string;
  escalationLevel?: number;
  employee?: { name: string; email: string };
}

interface PolicyConfig {
  id: string;
  requiredCallAttempts: number;
  minimumMinutesBetweenCalls: number;
  gracePeriodMinutes: number;
  callScreenshotRequired: boolean;
  controlRoomConfirmation: boolean;
  acceptedMimeTypes: string;
  maxScreenshotSizeMB: number;
}

interface SLAStatus {
  totalPending: number;
  slaBreaches: number;
  slaHours: number;
  overdueAppeals: { id: string; userId: string; createdAt: string; hoursElapsed: number }[];
}

type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

export default function NoShowPage({ token }: { token: string }) {
  const [noShows, setNoShows] = useState<NoShowRecord[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [policy, setPolicy] = useState<PolicyConfig | null>(null);
  const [slaStatus, setSlaStatus] = useState<SLAStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [decidingAppealId, setDecidingAppealId] = useState<string | null>(null);
  const [decideModal, setDecideModal] = useState<{ appealId: string; action: 'APPROVED' | 'REJECTED' } | null>(null);
  const [decideReason, setDecideReason] = useState('');
  const [activeTab, setActiveTab] = useState<'records' | 'appeals'>('records');

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [noShowRes, appealsRes, policyRes, slaRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/trips?status=NO_SHOW`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/advanced/appeals`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/no-show/policy`, { headers: authHeaders() }),
        fetch(`${API_URL}/api/advanced/appeals/sla`, { headers: authHeaders() }),
      ]);

      if (noShowRes.status === 'fulfilled' && noShowRes.value.ok) {
        const d = await noShowRes.value.json();
        setNoShows(d.data || []);
      }

      if (appealsRes.status === 'fulfilled' && appealsRes.value.ok) {
        const d = await appealsRes.value.json();
        setAppeals(d.data || []);
      }

      if (policyRes.status === 'fulfilled' && policyRes.value.ok) {
        setPolicy(await policyRes.value.json());
      }

      if (slaRes.status === 'fulfilled' && slaRes.value.ok) {
        setSlaStatus(await slaRes.value.json());
      }

      const hasFailure = [noShowRes, appealsRes, policyRes, slaRes].some(
        r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)
      );
      if (hasFailure) {
        showToast('Some data failed to load', 'error');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [authHeaders, showToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const decideAppeal = async (appealId: string, decision: 'APPROVED' | 'REJECTED') => {
    setDecidingAppealId(appealId);
    try {
      const res = await fetch(`${API_URL}/api/advanced/appeal/${appealId}/decide`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ decision, reason: decideReason || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to decide appeal');
      }
      showToast(`Appeal ${decision === 'APPROVED' ? 'approved' : 'rejected'}`, 'success');
      setDecideModal(null);
      setDecideReason('');
      fetchAll();
    } catch (e: any) {
      showToast(e.message || 'Failed to decide appeal', 'error');
    } finally {
      setDecidingAppealId(null);
    }
  };

  const escalateAppeal = async (appealId: string) => {
    setDecidingAppealId(appealId);
    try {
      const res = await fetch(`${API_URL}/api/advanced/appeal/${appealId}/escalate`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to escalate appeal');
      showToast('Appeal escalated', 'success');
      fetchAll();
    } catch (e: any) {
      showToast(e.message || 'Failed to escalate', 'error');
    } finally {
      setDecidingAppealId(null);
    }
  };

  const retry = () => fetchAll();

  if (loading) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 16 }}>Loading no-show data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>Something went wrong</p>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', textAlign: 'center' }}>{error}</p>
        <button onClick={retry} style={{ padding: '8px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Retry</button>
      </div>
    );
  }

  const p = policy || { requiredCallAttempts: 3, minimumMinutesBetweenCalls: 2, gracePeriodMinutes: 10 };

  return (
    <div style={{ padding: 24, position: 'relative' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 1000,
          padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: toast.type === 'success' ? '#f0fdf4' : toast.type === 'error' ? '#fef2f2' : '#eff6ff',
          color: toast.type === 'success' ? '#15803d' : toast.type === 'error' ? '#dc2626' : '#2563eb',
          border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : toast.type === 'error' ? '#fecaca' : '#bfdbfe'}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>
          {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'} {toast.message}
        </div>
      )}

      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>No-Show Management</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Evidence tracking, call attempts, and appeal workflow</p>

      {/* Policy Requirements */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Required Call Attempts', value: p.requiredCallAttempts, icon: '📞', desc: 'Before marking NO_SHOW' },
          { label: 'Minimum Call Gap', value: `${p.minimumMinutesBetweenCalls} min`, icon: '⏱️', desc: 'Between each attempt' },
          { label: 'Grace Period', value: `${p.gracePeriodMinutes} min`, icon: '⏳', desc: 'After arrival at pickup' },
        ].map((item, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#2563eb' }}>{item.value}</div>
            <div style={{ fontSize: 12, color: '#374151', fontWeight: 600, marginTop: 4 }}>{item.label}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.desc}</div>
          </div>
        ))}
      </div>

      {/* SLA Alert Banner */}
      {slaStatus && slaStatus.slaBreaches > 0 && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#991b1b' }}>{slaStatus.slaBreaches} appeal(s) past SLA deadline</span>
            <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>({slaStatus.slaHours}h window)</span>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Total No-Shows', value: noShows.length, color: '#dc2626' },
          { label: 'Pending Appeals', value: appeals.filter(a => a.status === 'SUBMITTED' || a.status === 'PENDING').length, color: '#f59e0b' },
          { label: 'Approved Appeals', value: appeals.filter(a => a.status === 'APPROVED' || a.status === 'DECIDED').length, color: '#16a34a' },
          { label: 'SLA Breaches', value: slaStatus?.slaBreaches || 0, color: '#9333ea' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tab Toggle */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
        {([
          { key: 'records' as const, label: `No-Show Records (${noShows.length})` },
          { key: 'appeals' as const, label: `Appeals (${appeals.length})` },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '8px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: activeTab === tab.key ? 'white' : 'transparent',
              color: activeTab === tab.key ? '#111827' : '#6b7280',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* No-Show Records Tab */}
      {activeTab === 'records' && (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>No-Show Records</h3>
          </div>
          {noShows.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <div style={{ fontSize: 14, color: '#6b7280' }}>No no-show records</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>No shows will appear here once recorded</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Employee', 'Trip', 'Reason', 'Recorded', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {noShows.map((ns) => (
                  <tr key={ns.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{ns.employee?.name || ns.employeeId?.slice(0, 12)}</div>
                      {ns.employee?.email && <div style={{ fontSize: 11, color: '#9ca3af' }}>{ns.employee.email}</div>}
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 11 }}>
                      {ns.trip?.id?.slice(0, 10) || ns.tripId?.slice(0, 10) || '-'}
                      {ns.trip?.pickupAddress && <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'inherit' }}>{ns.trip.pickupAddress}</div>}
                    </td>
                    <td style={{ padding: '10px 16px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ns.reason || '-'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12 }}>
                      {ns.recordedAt ? new Date(ns.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: ns.overturned ? '#f0fdf4' : '#fef2f2',
                        color: ns.overturned ? '#15803d' : '#dc2626',
                      }}>
                        {ns.overturned ? 'OVERTURNED' : 'NO_SHOW'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Appeals Tab */}
      {activeTab === 'appeals' && (
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>No-Show Appeals</h3>
          </div>
          {appeals.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
              <div style={{ fontSize: 14, color: '#6b7280' }}>No appeals currently</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Appeals from employees will appear here</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['ID', 'Employee', 'Trip', 'Reason', 'Status', 'Submitted', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appeals.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 11 }}>{a.id?.slice(0, 12)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{a.employee?.name || a.employeeId?.slice(0, 12)}</div>
                      {a.employee?.email && <div style={{ fontSize: 11, color: '#9ca3af' }}>{a.employee.email}</div>}
                    </td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 11 }}>{a.tripId?.slice(0, 10) || '-'}</td>
                    <td style={{ padding: '10px 16px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.reason || '-'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                        background: a.status === 'SUBMITTED' || a.status === 'PENDING' ? '#fef3c7'
                          : a.status === 'APPROVED' || a.status === 'DECIDED' ? '#f0fdf4'
                          : a.status === 'REJECTED' ? '#fef2f2'
                          : a.status === 'ESCALATED' || a.status === 'SLA_BREACHED' ? '#fdf4ff' : '#f1f5f9',
                        color: a.status === 'SUBMITTED' || a.status === 'PENDING' ? '#92400e'
                          : a.status === 'APPROVED' || a.status === 'DECIDED' ? '#15803d'
                          : a.status === 'REJECTED' ? '#dc2626'
                          : a.status === 'ESCALATED' || a.status === 'SLA_BREACHED' ? '#7e22ce' : '#374151',
                      }}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12 }}>
                      {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td style={{ padding: '10px 16px', display: 'flex', gap: 6 }}>
                      {(a.status === 'SUBMITTED' || a.status === 'PENDING') && (
                        <>
                          <button
                            onClick={() => setDecideModal({ appealId: a.id, action: 'APPROVED' })}
                            disabled={decidingAppealId === a.id}
                            style={{ padding: '4px 10px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', opacity: decidingAppealId === a.id ? 0.6 : 1 }}
                          >Approve</button>
                          <button
                            onClick={() => setDecideModal({ appealId: a.id, action: 'REJECTED' })}
                            disabled={decidingAppealId === a.id}
                            style={{ padding: '4px 10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', opacity: decidingAppealId === a.id ? 0.6 : 1 }}
                          >Reject</button>
                          <button
                            onClick={() => escalateAppeal(a.id)}
                            disabled={decidingAppealId === a.id}
                            style={{ padding: '4px 10px', background: '#7e22ce', color: 'white', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', opacity: decidingAppealId === a.id ? 0.6 : 1 }}
                          >Escalate</button>
                        </>
                      )}
                      {a.status === 'ESCALATED' && (
                        <span style={{ fontSize: 11, color: '#7e22ce', fontStyle: 'italic' }}>Escalated</span>
                      )}
                      {(a.status === 'APPROVED' || a.status === 'DECIDED') && a.decision && (
                        <span style={{ fontSize: 11, color: a.decision === 'APPROVED' ? '#16a34a' : '#dc2626' }}>{a.decision}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Decide Appeal Modal */}
      {decideModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 24, width: 400, maxWidth: '90vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px' }}>
              {decideModal.action === 'APPROVED' ? 'Approve Appeal' : 'Reject Appeal'}
            </h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
              {decideModal.action === 'APPROVED'
                ? 'This will overturn the no-show record and restore the employee\'s attendance.'
                : 'This will uphold the no-show record. The employee\'s appeal will be denied.'}
            </p>
            <textarea
              value={decideReason}
              onChange={(e) => setDecideReason(e.target.value)}
              placeholder={`Reason for ${decideModal.action.toLowerCase()}ing (optional)`}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setDecideModal(null); setDecideReason(''); }}
                style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={() => decideAppeal(decideModal.appealId, decideModal.action)}
                disabled={decidingAppealId === decideModal.appealId}
                style={{
                  padding: '8px 16px',
                  background: decideModal.action === 'APPROVED' ? '#16a34a' : '#dc2626',
                  color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  opacity: decidingAppealId === decideModal.appealId ? 0.6 : 1,
                }}
              >
                {decidingAppealId === decideModal.appealId ? 'Processing...' : decideModal.action === 'APPROVED' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
