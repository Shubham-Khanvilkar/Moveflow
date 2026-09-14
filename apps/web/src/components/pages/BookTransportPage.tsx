'use client';
import React, { useState, useEffect } from 'react';
import { API_URL } from '../../lib/config';

export default function BookTransportPage({ token }: { token: string }) {
  const [form, setForm] = useState({
    serviceType: 'CAB', date: '', pickupTime: '07:30',
    pickupAddress: '', pickupLatitude: 19.0760, pickupLongitude: 72.8777,
    dropAddress: '', dropLatitude: 19.0596, dropLongitude: 72.8295,
    passengerCount: 1, returnTrip: false, returnTime: '', specialRequirements: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.date || !form.pickupTime || !form.pickupAddress || !form.dropAddress) {
      setError('Please fill all required fields');
      return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/trips/bookings`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) { setSuccess(data); setForm({ ...form, pickupAddress: '', dropAddress: '' }); }
      else setError(data.message || 'Booking failed');
    } catch { setError('Network error'); }
    setLoading(false);
  };

  if (success) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 32, textAlign: 'center', border: '2px solid #bbf7d0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#16a34a', margin: '0 0 8px' }}>Booking Created Successfully!</h2>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>Booking Code: <strong>{success.bookingCode || success.data?.bookingCode}</strong></p>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px' }}>
            Status: {success.status || success.data?.status} · Approval: {success.approvalStatus || success.data?.approvalStatus}
          </p>
          <button onClick={() => setSuccess(null)} style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Book Another</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 700 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>🎫 Book Transport</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Request a cab, shuttle, or bus for your commute</p>

      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {/* Service Type */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>Transport Type *</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['CAB', 'SHUTTLE', 'BUS'].map(t => (
              <button key={t} onClick={() => setForm({ ...form, serviceType: t })}
                style={{ flex: 1, padding: '14px', borderRadius: 10, border: `2px solid ${form.serviceType === t ? '#2563eb' : '#e5e7eb'}`, background: form.serviceType === t ? '#eff6ff' : 'white', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 24 }}>{t === 'CAB' ? '🚗' : t === 'SHUTTLE' ? '🚐' : '🚌'}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: form.serviceType === t ? '#2563eb' : '#374151', marginTop: 4 }}>{t}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Date & Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Date *</label>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Pickup Time *</label>
            <input type="time" value={form.pickupTime} onChange={e => setForm({ ...form, pickupTime: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* Pickup Address */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Pickup Address *</label>
          <input value={form.pickupAddress} onChange={e => setForm({ ...form, pickupAddress: e.target.value })} placeholder="e.g. Andheri East, Mumbai"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
        </div>

        {/* Drop Address */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Drop Address *</label>
          <input value={form.dropAddress} onChange={e => setForm({ ...form, dropAddress: e.target.value })} placeholder="e.g. BKC, Mumbai"
            style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
        </div>

        {/* Passengers & Return */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Passengers</label>
            <select value={form.passengerCount} onChange={e => setForm({ ...form, passengerCount: parseInt(e.target.value) })}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}>
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} passenger{n > 1 ? 's' : ''}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Return Trip?</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={() => setForm({ ...form, returnTrip: false })}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: `2px solid ${!form.returnTrip ? '#2563eb' : '#e5e7eb'}`, background: !form.returnTrip ? '#eff6ff' : 'white', cursor: 'pointer', fontSize: 13 }}>One Way</button>
              <button onClick={() => setForm({ ...form, returnTrip: true })}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: `2px solid ${form.returnTrip ? '#2563eb' : '#e5e7eb'}`, background: form.returnTrip ? '#eff6ff' : 'white', cursor: 'pointer', fontSize: 13 }}>Round Trip</button>
            </div>
          </div>
        </div>

        {form.returnTrip && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Return Time</label>
            <input type="time" value={form.returnTime} onChange={e => setForm({ ...form, returnTime: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
          </div>
        )}

        {/* Special Requirements */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Special Requirements</label>
          <textarea value={form.specialRequirements} onChange={e => setForm({ ...form, specialRequirements: e.target.value })} placeholder="e.g. Wheelchair accessible, child seat needed"
            rows={3} style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }} />
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading}
          style={{ width: '100%', padding: '14px', background: loading ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer' }}>
          {loading ? 'Submitting...' : '🎫 Submit Booking Request'}
        </button>
      </div>
    </div>
  );
}
