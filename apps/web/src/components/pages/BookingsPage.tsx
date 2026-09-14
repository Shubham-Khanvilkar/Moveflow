'use client';
import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api-client';


interface Booking {
  id: string;
  passengerId: string;
  passenger?: { name: string; email: string };
  origin: string;
  destination: string;
  scheduledTime: string;
  status: string;
  transportType: string;
  createdAt: string;
}

export default function BookingsPage({ token }: { token: string }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [form, setForm] = useState({ passengerId: '', origin: '', destination: '', scheduledTime: '', transportType: 'CAB' });
  const [creating, setCreating] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBookings();
    fetchEmployees();
    fetchLocations();
  }, [token]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<any>(`/trips/bookings`);
      setBookings(data?.bookings || data || []);
    } catch (e: any) { setError(e.message || 'Failed to load bookings'); }
    setLoading(false);
  };

  const fetchEmployees = async () => {
    try {
      const data = await apiRequest<any>('/admin/users');
      setEmployees(data?.users || data || []);
    } catch (e: any) { setError(e.message || 'Failed to load employees'); }
  };

  const fetchLocations = async () => {
    try {
      const data = await apiRequest<any>('/admin/locations');
      setLocations(data?.locations || data || []);
    } catch (e: any) { setError(e.message || 'Failed to load locations'); }
  };

  const createBooking = async () => {
    setCreating(true);
    setError('');
    try {
      const pickup = locations.find((location: any) => location.id === form.origin);
      const drop = locations.find((location: any) => location.id === form.destination);
      if (!form.scheduledTime || !pickup || !drop) {
        throw new Error('Select pickup, drop, and scheduled time before creating a booking');
      }

      const scheduled = new Date(form.scheduledTime);
      if (Number.isNaN(scheduled.getTime())) {
        throw new Error('Scheduled time is invalid');
      }

      await apiRequest('/trips/bookings', {
        method: 'POST',
        body: JSON.stringify({
          serviceType: form.transportType,
          date: scheduled.toISOString().slice(0, 10),
          pickupTime: scheduled.toTimeString().slice(0, 5),
          pickupLatitude: Number(pickup.latitude ?? pickup.lat),
          pickupLongitude: Number(pickup.longitude ?? pickup.lng),
          pickupAddress: pickup.address || pickup.name,
          dropLatitude: Number(drop.latitude ?? drop.lat),
          dropLongitude: Number(drop.longitude ?? drop.lng),
          dropAddress: drop.address || drop.name,
        }),
      });
      setShowCreate(false);
      setForm({ passengerId: '', origin: '', destination: '', scheduledTime: '', transportType: 'CAB' });
      await fetchBookings();
    } catch (e: any) { setError(e.message); }
    setCreating(false);
  };

  const approveBooking = async (id: string) => {
    setApproving(id);
    try {
      await apiRequest(`/trips/bookings/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approved: true }),
      });
      await fetchBookings();
    } catch (e: any) { setError(e.message || 'Failed to approve booking'); }
    finally { setApproving(null); }
  };

  const filtered = filter === 'ALL' ? bookings : bookings.filter(b => b.status === filter);
  const statusCounts = bookings.reduce((acc: Record<string, number>, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {});

  const statusColors: Record<string, string> = {
    PENDING: '#f59e0b', APPROVED: '#10b981', DISPATCHED: '#3b82f6', IN_TRANSIT: '#8b5cf6',
    COMPLETED: '#059669', CANCELLED: '#ef4444', NO_SHOW: '#dc2626', REJECTED: '#6b7280',
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Booking Management</h2>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{bookings.length} total bookings</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          + New Booking
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['ALL', 'PENDING', 'APPROVED', 'DISPATCHED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
            background: filter === s ? (statusColors[s] || '#2563eb') : '#f3f4f6',
            color: filter === s ? 'white' : '#374151',
          }}>{s.replace(/_/g, ' ')} {statusCounts[s] ? `(${statusCounts[s]})` : ''}</button>
        ))}
      </div>

      {/* Create Booking Modal */}
      {showCreate && (
        <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, border: '2px solid #2563eb', boxShadow: '0 4px 20px rgba(37,99,235,0.1)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Create New Booking</h3>
          {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: 10, borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Passenger</label>
              <select value={form.passengerId} onChange={e => setForm({ ...form, passengerId: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}>
                <option value="">Select employee...</option>
                {employees.map((e: any) => <option key={e.id} value={e.id}>{e.name} ({e.email})</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Transport Type</label>
              <select value={form.transportType} onChange={e => setForm({ ...form, transportType: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}>
                <option value="CAB">Cab</option>
                <option value="SHUTTLE">Shuttle</option>
                <option value="NODAL">Nodal</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Pickup Location</label>
              <select value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}>
                <option value="">Select pickup...</option>
                {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name || l.address}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Drop Location</label>
              <select value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}>
                <option value="">Select drop...</option>
                {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name || l.address}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Scheduled Time</label>
              <input type="datetime-local" value={form.scheduledTime} onChange={e => setForm({ ...form, scheduledTime: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={createBooking} disabled={creating}
              style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {creating ? 'Creating...' : 'Create Booking'}
            </button>
            <button onClick={() => setShowCreate(false)}
              style={{ padding: '10px 24px', background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bookings Table */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading bookings...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📅</div>
            <div style={{ fontSize: 14, color: '#6b7280' }}>No bookings found{filter !== 'ALL' ? ` with status ${filter}` : ''}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Create a new booking to get started</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                {['Booking ID', 'Passenger', 'Route', 'Scheduled', 'Type', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{b.id.slice(0, 12)}</td>
                  <td style={{ padding: '12px 16px' }}>{b.passenger?.name || b.passengerId}</td>
                  <td style={{ padding: '12px 16px' }}>{b.origin} → {b.destination}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>{new Date(b.scheduledTime).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}><span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, background: '#f3f4f6' }}>{b.transportType}</span></td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: `${statusColors[b.status] || '#6b7280'}20`, color: statusColors[b.status] || '#6b7280' }}>
                      {b.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {b.status === 'PENDING' && (
                       <button onClick={() => approveBooking(b.id)} disabled={approving === b.id} style={{ padding: '4px 12px', background: approving === b.id ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, cursor: approving === b.id ? 'wait' : 'pointer', fontWeight: 600 }}>
                         {approving === b.id ? 'Approving...' : 'Approve'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
