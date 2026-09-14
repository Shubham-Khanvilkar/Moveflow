'use client';
import { useState, useEffect } from 'react';

import { API_URL } from '../../lib/config';

const TITLES: Record<string, {icon: string, title: string, desc: string}> = {
  PassengersPage: { icon: '👥', title: 'Passenger List', desc: 'View and contact passengers on your trip' },
  BoardingPage: { icon: '✅', title: 'Boarding Verification', desc: 'OTP/QR verification for passenger boarding' },
  BreakdownPage: { icon: '🔧', title: 'Vehicle Breakdown', desc: 'Report vehicle issues and request replacement' },
  SOSPage: { icon: '🚨', title: 'Emergency SOS', desc: 'Trigger emergency alert and notify control room' },
  VehicleCheckPage: { icon: '🔍', title: 'Pre-Trip Vehicle Check', desc: 'Complete vehicle inspection before trip' }
};

export default function BreakdownPage({ token }: { token: string }) {
  const info = TITLES['BreakdownPage'];
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/trips?status=IN_TRANSIT,DISPATCHED,DRIVER_ACCEPTED,EN_ROUTE_TO_PICKUP,ARRIVED_AT_PICKUP,BOARDING`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.json()).then(d => {
      const list = Array.isArray(d) ? d : d.data || [];
      setData(list[0] || null);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{info.icon} {info.title}</h1>
      <p style={{ color: '#6b7280', marginBottom: 20 }}>{info.desc}</p>
      {loading ? <p style={{ color: '#6b7280' }}>Loading...</p> : !data ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>{info.icon}</div>
          <h3 style={{ color: '#374151', marginTop: 12 }}>No active trip</h3>
          <p style={{ color: '#6b7280' }}>Accept a trip to access this feature.</p>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Active Trip: {data.tripCode || data.code || data.id?.slice(0,8)}</h3>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Status</span><span style={{ fontWeight: 600 }}>{data.status}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Passengers</span><span style={{ fontWeight: 600 }}>{data.passengerCount || data._count?.passengers || 0}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#6b7280' }}>Vehicle</span><span style={{ fontWeight: 600 }}>{data.vehicle?.registration || 'Not assigned'}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
