'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../lib/api-client';

type DispatchTab = 'pending' | 'active' | 'completed';

export default function DispatchPage({ token }: { token: string }) {
  const [tab, setTab] = useState<DispatchTab>('pending');
  const [bookings, setBookings] = useState<any[]>([]);
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [completedTrips, setCompletedTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Record<string, string>>({});
  const [selectedVehicle, setSelectedVehicle] = useState<Record<string, string>>({});
  const [reassignTarget, setReassignTarget] = useState<string | null>(null);
  const [reassignDriver, setReassignDriver] = useState('');
  const [reassignVehicle, setReassignVehicle] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [b, d, v] = await Promise.all([
        apiRequest<any>('/trips/bookings?status=APPROVED').catch(() => ({ data: [] })),
        apiRequest<any>('/trips/drivers/available', { method: 'POST' }).catch(() => ({ data: [] })),
        apiRequest<any>('/trips/vehicles/available', { method: 'POST' }).catch(() => ({ data: [] })),
      ]);
      setBookings(b?.data || b || []);
      setDrivers(d?.data || d || []);
      setVehicles(v?.data || v || []);

      const [activeRes, completedRes] = await Promise.all([
        apiRequest<any>('/trips?status=DISPATCHED,IN_PROGRESS').catch(() => ({ data: [] })),
        apiRequest<any>('/trips?status=COMPLETED').catch(() => ({ data: [] })),
      ]);
      setActiveTrips(activeRes?.data || activeRes || []);
      setCompletedTrips(completedRes?.data || completedRes || []);
    } catch (e: any) {
      setBookings([]);
      setError(e.message || 'Failed to load dispatch data');
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDispatch = async (bookingId: string) => {
    const driverId = selectedDriver[bookingId];
    const vehicleId = selectedVehicle[bookingId];
    if (!driverId || !vehicleId) {
      setError('Select both a driver and a vehicle before dispatching');
      return;
    }
    setDispatching(bookingId);
    try {
      await apiRequest(`/trips/dispatch/${bookingId}`, { method: 'POST', body: JSON.stringify({ driverId, vehicleId }) });
      setSuccess('Trip dispatched successfully');
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Dispatch failed');
    } finally { setDispatching(null); }
  };

  const handleReassign = async (tripId: string) => {
    if (!reassignDriver || !reassignVehicle) {
      setError('Select both a driver and a vehicle for reassignment');
      return;
    }
    setDispatching(tripId);
    try {
      await apiRequest(`/trips/${tripId}/reassign`, { method: 'POST', body: JSON.stringify({ driverId: reassignDriver, vehicleId: reassignVehicle }) });
      setSuccess('Trip reassigned successfully');
      setReassignTarget(null);
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Reassignment failed');
    } finally { setDispatching(null); }
  };

  const handleCancelTrip = async (tripId: string) => {
    if (!confirm('Are you sure you want to cancel this trip?')) return;
    setDispatching(tripId);
    try {
      await apiRequest(`/trips/${tripId}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Cancelled by dispatcher' }) });
      setSuccess('Trip cancelled successfully');
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Cancellation failed');
    } finally { setDispatching(null); }
  };

  const handleEndTrip = async (tripId: string) => {
    setDispatching(tripId);
    try {
      await apiRequest(`/trips/${tripId}/end`, { method: 'POST' });
      setSuccess('Trip ended successfully');
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to end trip');
    } finally { setDispatching(null); }
  };

  const handleMarkNoShow = async (tripId: string) => {
    if (!confirm('Mark this employee as no-show?')) return;
    setDispatching(tripId);
    try {
      await apiRequest(`/trips/${tripId}/no-show`, { method: 'POST', body: JSON.stringify({ reason: 'Marked by dispatcher' }) });
      setSuccess('No-show recorded');
      await loadData();
    } catch (e: any) {
      setError(e.message || 'Failed to mark no-show');
    } finally { setDispatching(null); }
  };

  const clearMessages = () => { setError(''); setSuccess(''); };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>🚀 Dispatch Board</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Dispatch, reassign, and manage trips</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ padding: '8px 16px', background: '#dcfce7', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>🧑‍✈️ {drivers.length} Drivers</div>
          <div style={{ padding: '8px 16px', background: '#dbeafe', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>🚗 {vehicles.length} Vehicles</div>
        </div>
      </div>

      {error && <div style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>{error}<button onClick={clearMessages} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#b91c1c', fontWeight: 700 }}>X</button></div>}
      {success && <div style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>{success}<button onClick={clearMessages} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#16a34a', fontWeight: 700 }}>X</button></div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'white', padding: 4, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {[
          { key: 'pending', label: `📋 Pending Dispatch (${bookings.length})` },
          { key: 'active', label: `🚐 Active Trips (${activeTrips.length})` },
          { key: 'completed', label: `✅ Completed (${completedTrips.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as DispatchTab)}
            style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: tab === t.key ? 700 : 400,
              background: tab === t.key ? '#2563eb' : 'transparent', color: tab === t.key ? 'white' : '#6b7280', transition: 'all 0.2s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading dispatch board...</div> : (
        <>
          {/* Pending Dispatch Tab */}
          {tab === 'pending' && (bookings.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
              <div>No bookings pending dispatch.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {bookings.map(b => (
                <div key={b.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{b.bookingCode}</span>
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#16a34a' }}>APPROVED</span>
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, background: '#f3f4f6' }}>{b.serviceType}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#374151' }}>
                        👤 {b.requester?.name || 'Unknown'} · 📅 {new Date(b.date).toLocaleDateString()} · ⏰ {new Date(b.pickupTime).toLocaleTimeString()} · 👥 {b.passengerCount} pax
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>📍 {b.pickupAddress} → 🏁 {b.dropAddress}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select value={selectedDriver[b.id] || ''} onChange={e => setSelectedDriver({ ...selectedDriver, [b.id]: e.target.value })}
                        style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, minWidth: 160 }}>
                        <option value="">Select Driver</option>
                        {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.user?.name || d.id}</option>)}
                      </select>
                      <select value={selectedVehicle[b.id] || ''} onChange={e => setSelectedVehicle({ ...selectedVehicle, [b.id]: e.target.value })}
                        style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 12, minWidth: 160 }}>
                        <option value="">Select Vehicle</option>
                        {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.registrationNo || v.id}</option>)}
                      </select>
                      <button onClick={() => handleDispatch(b.id)} disabled={!selectedDriver[b.id] || !selectedVehicle[b.id] || dispatching === b.id}
                        style={{ padding: '8px 16px', background: selectedDriver[b.id] && selectedVehicle[b.id] ? '#2563eb' : '#d1d5db', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: selectedDriver[b.id] && selectedVehicle[b.id] ? 'pointer' : 'not-allowed' }}>
                        {dispatching === b.id ? '...' : '🚀 Dispatch'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Active Trips Tab */}
          {tab === 'active' && (activeTrips.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🚐</div>
              <div>No active trips.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {activeTrips.map((trip: any) => (
                <div key={trip.id} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{trip.tripCode || trip.id?.slice(0, 8)}</span>
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: trip.status === 'IN_PROGRESS' ? '#dbeafe' : '#fef3c7', color: trip.status === 'IN_PROGRESS' ? '#2563eb' : '#d97706' }}>{trip.status}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#374151' }}>
                        🧑‍✈️ {trip.driver?.name || trip.driverId || 'Unassigned'} · 🚗 {trip.vehicle?.registrationNo || trip.vehicleId || 'Unassigned'}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>📍 {trip.pickupAddress || 'N/A'} → 🏁 {trip.dropAddress || 'N/A'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {reassignTarget === trip.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: '#f8fafc', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                          <select value={reassignDriver} onChange={e => setReassignDriver(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11 }}>
                            <option value="">New Driver</option>
                            {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.user?.name || d.id}</option>)}
                          </select>
                          <select value={reassignVehicle} onChange={e => setReassignVehicle(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 11 }}>
                            <option value="">New Vehicle</option>
                            {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.registrationNo || v.id}</option>)}
                          </select>
                          <button onClick={() => handleReassign(trip.id)} disabled={!reassignDriver || !reassignVehicle}
                            style={{ padding: '6px 10px', background: reassignDriver && reassignVehicle ? '#2563eb' : '#d1d5db', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            Confirm
                          </button>
                          <button onClick={() => setReassignTarget(null)} style={{ padding: '6px 10px', background: '#f3f4f6', color: '#6b7280', border: 'none', borderRadius: 6, fontSize: 11, cursor: 'pointer' }}>Cancel</button>
                        </div>
                      ) : (
                        <>
                          <button onClick={() => { setReassignTarget(trip.id); setReassignDriver(''); setReassignVehicle(''); }}
                            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            🔄 Reassign
                          </button>
                          <button onClick={() => handleEndTrip(trip.id)} disabled={dispatching === trip.id}
                            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            ✅ End
                          </button>
                          <button onClick={() => handleMarkNoShow(trip.id)} disabled={dispatching === trip.id}
                            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #fef08a', background: '#fefce8', color: '#ca8a04', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            🚫 No-Show
                          </button>
                          <button onClick={() => handleCancelTrip(trip.id)} disabled={dispatching === trip.id}
                            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                            ✖ Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Completed Tab */}
          {tab === 'completed' && (completedTrips.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#6b7280' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📋</div>
              <div>No completed trips.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {completedTrips.map((trip: any) => (
                <div key={trip.id} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', opacity: 0.8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{trip.tripCode || trip.id?.slice(0, 8)}</span>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#16a34a', marginLeft: 8 }}>COMPLETED</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      🧑‍✈️ {trip.driver?.name || trip.driverId} · {trip.completedAt ? new Date(trip.completedAt).toLocaleString() : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
