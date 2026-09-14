'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Spinner from '../Spinner';
import { API_URL } from '../../lib/config';

interface VehicleLocation {
  id: string;
  vehicleId: string;
  driverId: string | null;
  tripId: string | null;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  lastUpdated: string;
  status?: string;
  driverName?: string;
  registrationNo?: string;
}

interface ControlRoomData {
  activeTrips: number;
  delayedTrips: number;
  unassignedTrips: number;
  sosActive: number;
  breakdownsActive: number;
}

interface Activity {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
  message: string;
}

const STATUS_COLORS: Record<string, string> = {
  ONLINE: '#10b981',
  ON_TRIP: '#2563eb',
  BREAK: '#f59e0b',
  SLEEPY: '#ef4444',
  EMERGENCY: '#dc2626',
  UNAVAILABLE: '#6b7280',
  OFFLINE: '#d1d5db',
};

export default function ControlRoomPage({ token }: { token: string }) {
  const [controlRoom, setControlRoom] = useState<ControlRoomData | null>(null);
  const [vehicleLocations, setVehicleLocations] = useState<VehicleLocation[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLocation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const initMap = useCallback(async () => {
    if (!mapRef.current || mapInstanceRef.current) return;
    const L = (await import('leaflet')).default;
    await import('leaflet/dist/leaflet.css');

    const map = L.map(mapRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
  }, []);

  const updateMarkers = useCallback(async (locations: VehicleLocation[]) => {
    if (!mapInstanceRef.current) return;
    const L = (await import('leaflet')).default;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    locations.forEach(v => {
      const isOnline = (Date.now() - new Date(v.lastUpdated).getTime()) < 5 * 60 * 1000;
      const status = v.status || (isOnline ? 'ONLINE' : 'OFFLINE');
      const color = STATUS_COLORS[status] || '#6b7280';

      const icon = L.divIcon({
        className: 'vehicle-marker',
        html: `<div style="
          width: 28px; height: 28px; border-radius: 50%;
          background: ${color}; border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; color: white; font-weight: 700;
          cursor: pointer; transition: transform 0.2s;
        " onmouseover="this.style.transform='scale(1.3)'" onmouseout="this.style.transform='scale(1)'">🚐</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([v.latitude, v.longitude], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="font-family: system-ui; min-width: 200px;">
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px;">${v.registrationNo || v.vehicleId}</div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
              <strong>Status:</strong> <span style="color: ${color}; font-weight: 600;">${status}</span>
            </div>
            ${v.driverName ? `<div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;"><strong>Driver:</strong> ${v.driverName}</div>` : ''}
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
              <strong>Position:</strong> ${v.latitude.toFixed(5)}, ${v.longitude.toFixed(5)}
            </div>
            ${v.speed != null ? `<div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;"><strong>Speed:</strong> ${v.speed} km/h</div>` : ''}
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
              <strong>Last Update:</strong> ${new Date(v.lastUpdated).toLocaleTimeString()}
            </div>
            ${v.tripId ? `<div style="font-size: 12px; color: #2563eb; margin-top: 6px;"><strong>Trip ID:</strong> ${v.tripId}</div>` : ''}
          </div>
        `)
        .on('click', () => setSelectedVehicle(v));

      markersRef.current.push(marker);
    });

    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(v => [v.latitude, v.longitude] as [number, number]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    Promise.allSettled([
      fetch(`${API_URL}/api/dashboards/control-room`, { headers }).then(r => {
        if (!r.ok) throw new Error(`Control room: ${r.status}`);
        return r.json();
      }),
      fetch(`${API_URL}/api/v1/gps/vehicles`, { headers }).then(r => {
        if (!r.ok) throw new Error(`Vehicle locations: ${r.status}`);
        return r.json();
      }),
      fetch(`${API_URL}/api/dashboards/recent-activity?limit=10`, { headers }).then(r => {
        if (!r.ok) throw new Error(`Recent activity: ${r.status}`);
        return r.json();
      }),
    ]).then(([crResult, gpsResult, activityResult]) => {
      const errors: string[] = [];

      if (crResult.status === 'fulfilled') {
        const cr = crResult.value;
        setControlRoom(cr.data || cr);
      } else {
        errors.push(crResult.reason?.message || 'Failed to load control room data');
      }

      if (gpsResult.status === 'fulfilled') {
        const gps = gpsResult.value;
        const locs = Array.isArray(gps) ? gps : gps.data || [];
        setVehicleLocations(locs);
      } else {
        errors.push(gpsResult.reason?.message || 'Failed to load vehicle locations');
      }

      if (activityResult.status === 'fulfilled') {
        const act = activityResult.value;
        setRecentActivity(Array.isArray(act) ? act : act.data || []);
      } else {
        errors.push(activityResult.reason?.message || 'Failed to load recent activity');
      }

      if (errors.length > 0) setError(errors.join('; '));
    }).catch((err) => {
      setError(err.message || 'Failed to load dashboard');
    }).finally(() => {
      setLoading(false);
    });
  }, [token]);

  useEffect(() => {
    initMap();
  }, [initMap]);

  useEffect(() => {
    if (vehicleLocations.length > 0) {
      updateMarkers(statusFilter === 'ALL' ? vehicleLocations : vehicleLocations.filter(v => {
        const isOnline = (Date.now() - new Date(v.lastUpdated).getTime()) < 5 * 60 * 1000;
        const status = v.status || (isOnline ? 'ONLINE' : 'OFFLINE');
        return status === statusFilter;
      }));
    }
  }, [vehicleLocations, statusFilter, updateMarkers]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spinner />
      </div>
    );
  }

  if (error && !controlRoom) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#dc2626', marginBottom: 8 }}>Failed to load Control Room</div>
          <div style={{ fontSize: 13, color: '#991b1b' }}>{error}</div>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Retry</button>
        </div>
      </div>
    );
  }

  const activeTrips = controlRoom?.activeTrips ?? 0;
  const delayedTrips = controlRoom?.delayedTrips ?? 0;
  const unassignedTrips = controlRoom?.unassignedTrips ?? 0;
  const sosActive = controlRoom?.sosActive ?? 0;
  const breakdownsActive = controlRoom?.breakdownsActive ?? 0;
  const onlineVehicles = vehicleLocations.filter(v => (Date.now() - new Date(v.lastUpdated).getTime()) < 5 * 60 * 1000).length;

  const statusCounts = vehicleLocations.reduce((acc, v) => {
    const isOnline = (Date.now() - new Date(v.lastUpdated).getTime()) < 5 * 60 * 1000;
    const status = v.status || (isOnline ? 'ONLINE' : 'OFFLINE');
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredLocations = statusFilter === 'ALL' ? vehicleLocations : vehicleLocations.filter(v => {
    const isOnline = (Date.now() - new Date(v.lastUpdated).getTime()) < 5 * 60 * 1000;
    const status = v.status || (isOnline ? 'ONLINE' : 'OFFLINE');
    return status === statusFilter;
  });

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Control Room</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 24px' }}>Real-time operations overview with live map</p>

      {error && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: '#92400e' }}>
          Partial data loaded. Some sections may be incomplete.
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Active Trips', value: activeTrips, color: '#2563eb', icon: '🚐' },
          { label: 'Delayed Trips', value: delayedTrips, color: delayedTrips > 0 ? '#f59e0b' : '#10b981', icon: '⏰' },
          { label: 'Online Vehicles', value: `${onlineVehicles}/${vehicleLocations.length}`, color: '#8b5cf6', icon: '🚗' },
          { label: 'SOS Alerts', value: sosActive, color: sosActive > 0 ? '#ef4444' : '#10b981', icon: '🚨' },
          { label: 'Breakdowns', value: breakdownsActive, color: breakdownsActive > 0 ? '#ef4444' : '#10b981', icon: '⚠️' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${kpi.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>{kpi.label}</span>
              <span style={{ fontSize: 16 }}>{kpi.icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Map + Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Map */}
        <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>🗺️ Live Vehicle Map</h3>
            <div style={{ display: 'flex', gap: 4 }}>
              {['ALL', 'ONLINE', 'ON_TRIP', 'BREAK', 'UNAVAILABLE', 'OFFLINE'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  style={{ padding: '4px 8px', borderRadius: 6, border: 'none', fontSize: 10, fontWeight: 600, cursor: 'pointer',
                    background: statusFilter === s ? '#2563eb' : '#f3f4f6', color: statusFilter === s ? 'white' : '#6b7280' }}>
                  {s.replace('_', ' ')} {statusCounts[s] ? `(${statusCounts[s]})` : ''}
                </button>
              ))}
            </div>
          </div>
          <div ref={mapRef} style={{ height: 480, width: '100%' }} />
        </div>

        {/* Activity + Vehicle List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Vehicle List */}
          <div style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>🚗 Vehicles ({filteredLocations.length})</h3>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredLocations.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: 16 }}>No vehicles found</div>
              ) : (
                filteredLocations.map(v => {
                  const isOnline = (Date.now() - new Date(v.lastUpdated).getTime()) < 5 * 60 * 1000;
                  const status = v.status || (isOnline ? 'ONLINE' : 'OFFLINE');
                  const color = STATUS_COLORS[status] || '#6b7280';
                  return (
                    <div key={v.id} onClick={() => setSelectedVehicle(v)}
                      style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12,
                        background: selectedVehicle?.id === v.id ? '#eff6ff' : 'transparent', borderRadius: 4, paddingLeft: 4, paddingRight: 4 }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{v.registrationNo || v.vehicleId}</div>
                        <div style={{ color: '#6b7280', fontSize: 10 }}>{v.driverName || 'No driver'}</div>
                      </div>
                      <span style={{ padding: '2px 6px', borderRadius: 8, fontSize: 9, fontWeight: 600, background: color + '20', color }}>{status}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', maxHeight: 240, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 10px' }}>📋 Recent Activity</h3>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {recentActivity.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: 16 }}>No recent activity</div>
              ) : (
                recentActivity.slice(0, 6).map(e => (
                  <div key={e.id} style={{ padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: 11 }}>
                    <div style={{ fontWeight: 600 }}>{e.message || e.action}</div>
                    <div style={{ color: '#6b7280', fontSize: 10 }}>{new Date(e.createdAt).toLocaleTimeString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Vehicle Detail */}
      {selectedVehicle && (
        <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🚐 {selectedVehicle.registrationNo || selectedVehicle.vehicleId}</h3>
            <button onClick={() => setSelectedVehicle(null)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 12 }}>Close</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div><div style={{ fontSize: 11, color: '#6b7280' }}>Status</div><div style={{ fontSize: 14, fontWeight: 600, color: STATUS_COLORS[selectedVehicle.status || 'ONLINE'] }}>{selectedVehicle.status || 'ONLINE'}</div></div>
            <div><div style={{ fontSize: 11, color: '#6b7280' }}>Driver</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selectedVehicle.driverName || '—'}</div></div>
            <div><div style={{ fontSize: 11, color: '#6b7280' }}>Position</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selectedVehicle.latitude.toFixed(5)}, {selectedVehicle.longitude.toFixed(5)}</div></div>
            <div><div style={{ fontSize: 11, color: '#6b7280' }}>Speed</div><div style={{ fontSize: 14, fontWeight: 600 }}>{selectedVehicle.speed != null ? `${selectedVehicle.speed} km/h` : '—'}</div></div>
            <div><div style={{ fontSize: 11, color: '#6b7280' }}>Last Update</div><div style={{ fontSize: 14, fontWeight: 600 }}>{new Date(selectedVehicle.lastUpdated).toLocaleString()}</div></div>
            <div><div style={{ fontSize: 11, color: '#6b7280' }}>Trip ID</div><div style={{ fontSize: 14, fontWeight: 600, color: selectedVehicle.tripId ? '#2563eb' : '#9ca3af' }}>{selectedVehicle.tripId || '—'}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}
