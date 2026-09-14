'use client';
import React, { useState, useEffect, useCallback } from 'react';

import { API_URL } from '../../lib/config';

interface Vehicle {
  id: string;
  registrationNo: string;
  vehicleType: string;
  capacity: number;
  status?: string;
}

interface QRRecord {
  id: string;
  vehicleId: string;
  status: string;
  qrCode?: string;
  qrType?: string;
  shiftId?: string;
  validFrom?: string;
  validUntil?: string;
  createdAt: string;
  reason?: string;
  generatedBy?: string;
}

async function apiFetch<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init?.headers },
  });
  const json = await res.json();
  if (!res.ok || json.statusCode) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return (json.data ?? json) as T;
}

export default function VehicleQRPage({ token }: { token: string }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [qrMap, setQrMap] = useState<Record<string, QRRecord[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<{ vehicleId: string; qrCode: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch<any>(`${API_URL}/api/vehicles`, token);
      const list: Vehicle[] = data?.data || data || [];
      setVehicles(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e.message || 'Unable to connect to server');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const fetchHistory = async (vehicleId: string) => {
    try {
      const data = await apiFetch<any>(`${API_URL}/api/vehicles/${vehicleId}/qr/history`, token);
      const list: QRRecord[] = data?.data || data || [];
      setQrMap(prev => ({ ...prev, [vehicleId]: Array.isArray(list) ? list : [] }));
    } catch {
      setQrMap(prev => ({ ...prev, [vehicleId]: [] }));
    }
  };

  const generateQR = async (vehicle: Vehicle) => {
    setBusyId(vehicle.id);
    setError('');
    setLastGenerated(null);
    try {
      const qr = await apiFetch<any>(`${API_URL}/api/vehicles/${vehicle.id}/qr/generate`, token, {
        method: 'POST',
        body: JSON.stringify({ vehicleId: vehicle.id }),
      });
      if (qr.qrCode) {
        setLastGenerated({ vehicleId: vehicle.id, qrCode: qr.qrCode });
      }
      setExpanded(vehicle.id);
      fetchHistory(vehicle.id);
    } catch (e: any) {
      setError(e.message || 'QR generation failed');
    }
    setBusyId(null);
  };

  const revokeQR = async (vehicleId: string, qrId: string) => {
    const reason = window.prompt('Revocation reason (required):');
    if (!reason) return;
    setBusyId(qrId);
    try {
      await apiFetch<any>(`${API_URL}/api/qr/${qrId}/revoke`, token, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      fetchHistory(vehicleId);
    } catch (e: any) {
      setError(e.message || 'Revoke failed');
    }
    setBusyId(null);
  };

  const regenerateQR = async (vehicleId: string, qrId: string) => {
    setBusyId(qrId);
    try {
      const qr = await apiFetch<any>(`${API_URL}/api/qr/${qrId}/regenerate`, token, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (qr.qrCode) {
        setLastGenerated({ vehicleId, qrCode: qr.qrCode });
      }
      fetchHistory(vehicleId);
    } catch (e: any) {
      setError(e.message || 'Regenerate failed');
    }
    setBusyId(null);
  };

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>🔳 Vehicle QR</h1>
      <p style={{ color: '#6b7280', marginBottom: 20 }}>
        Vehicle QR generation is Transport Admin authority per V13 §101. Generate, regenerate, or revoke duty-bound QR codes; every action is audited.
      </p>

      {error && (
        <div style={{ background: '#fef2f2', color: '#b91c1c', padding: 12, borderRadius: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 700, fontSize: 16 }}>×</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 32, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</div>
          <p style={{ color: '#6b7280', marginTop: 12 }}>Loading vehicles…</p>
        </div>
      ) : vehicles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>🚐</div>
          <h3 style={{ color: '#374151', marginTop: 12 }}>No vehicles in your scope</h3>
          <p style={{ color: '#6b7280' }}>Add vehicles first, then generate QR codes for them.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {vehicles.map(v => (
            <div key={v.id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#111827', fontSize: 16 }}>{v.registrationNo}</span>
                  <span style={{ marginLeft: 10, color: '#6b7280', fontSize: 13 }}>{v.vehicleType} · {v.capacity} seats</span>
                  {v.status && (
                    <span style={{
                      marginLeft: 10, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: v.status === 'AVAILABLE' ? '#dcfce7' : v.status === 'BLOCKED' ? '#fee2e2' : '#f3f4f6',
                      color: v.status === 'AVAILABLE' ? '#166534' : v.status === 'BLOCKED' ? '#991b1b' : '#374151',
                    }}>{v.status}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { if (expanded === v.id) setExpanded(null); else { setExpanded(v.id); if (!qrMap[v.id]) fetchHistory(v.id); } }} style={btnSecondary}>
                    {expanded === v.id ? 'Hide QR History' : 'QR History'}
                  </button>
                  <button onClick={() => generateQR(v)} disabled={busyId === v.id}
                    style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, opacity: busyId === v.id ? 0.6 : 1 }}>
                    {busyId === v.id ? 'Generating…' : 'Generate QR'}
                  </button>
                </div>
              </div>

              {lastGenerated && lastGenerated.vehicleId === v.id && (
                <div style={{ marginTop: 14, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e40af', marginBottom: 6 }}>QR Code Generated</div>
                  <code style={{ display: 'block', background: 'white', padding: '8px 12px', borderRadius: 6, fontSize: 12, wordBreak: 'break-all', border: '1px solid #dbeafe' }}>
                    {lastGenerated.qrCode}
                  </code>
                  <p style={{ fontSize: 11, color: '#6b7280', marginTop: 6, margin: '6px 0 0' }}>Copy this code — it is shown only once.</p>
                </div>
              )}

              {expanded === v.id && (
                <div style={{ marginTop: 14, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                  {(qrMap[v.id] || []).length === 0 ? (
                    <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>No QR codes generated for this vehicle yet.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr style={{ textAlign: 'left', color: '#6b7280' }}>
                        <th style={thStyle}>QR Code</th>
                        <th style={thStyle}>Type</th>
                        <th style={thStyle}>Status</th>
                        <th style={thStyle}>Valid From</th>
                        <th style={thStyle}>Valid Until</th>
                        <th style={thStyle}>Actions</th>
                      </tr></thead>
                      <tbody>
                        {(qrMap[v.id] || []).map(q => (
                          <tr key={q.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                            <td style={tdStyle}>
                              <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                                {q.qrCode ? q.qrCode.length > 20 ? q.qrCode.slice(0, 20) + '…' : q.qrCode : q.id.slice(0, 8)}
                              </code>
                            </td>
                            <td style={tdStyle}>{q.qrType || '—'}</td>
                            <td style={tdStyle}>
                              <span style={{
                                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                                background: q.status === 'ACTIVE' ? '#dcfce7' : q.status === 'REVOKED' ? '#fee2e2' : q.status === 'REGENERATED' ? '#dbeafe' : '#f3f4f6',
                                color: q.status === 'ACTIVE' ? '#166534' : q.status === 'REVOKED' ? '#991b1b' : q.status === 'REGENERATED' ? '#1e40af' : '#374151',
                              }}>{q.status}</span>
                              {q.reason && <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 2 }}>"{q.reason}"</div>}
                            </td>
                            <td style={tdStyle}>{q.validFrom ? new Date(q.validFrom).toLocaleString() : '—'}</td>
                            <td style={tdStyle}>{q.validUntil ? new Date(q.validUntil).toLocaleString() : '—'}</td>
                            <td style={tdStyle}>
                              {q.status === 'ACTIVE' ? (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => regenerateQR(v.id, q.id)} disabled={busyId === q.id} style={{ ...btnSecondary, fontSize: 12, padding: '4px 10px' }}>Regenerate</button>
                                  <button onClick={() => revokeQR(v.id, q.id)} disabled={busyId === q.id} style={{ ...btnSecondary, fontSize: 12, padding: '4px 10px', color: '#b91c1c' }}>Revoke</button>
                                </div>
                              ) : <span style={{ color: '#9ca3af' }}>—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: '6px 6px', fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: '8px 6px', color: '#374151' };
const btnSecondary: React.CSSProperties = { background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 };
