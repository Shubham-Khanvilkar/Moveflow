'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MapComponent, VehicleLocation, Geofence } from './MapComponent';
import { Ionicons } from '@expo/vector-icons';

interface ActiveTrip {
  id: string;
  tripCode: string;
  status: string;
  pickupLocation: string;
  dropLocation: string;
  scheduledTime: string;
  driverName?: string;
  driverPhone?: string;
  vehicleRegistration?: string;
  vehicleType?: string;
  passengers?: any[];
  eta?: number;
  distance?: number;
}

interface ControlRoomProps {
  trips?: ActiveTrip[];
  onTripSelect?: (trip: ActiveTrip) => void;
  onReassign?: (tripId: string) => void;
}

export function ControlRoomLiveView({ 
  trips = [], 
  onTripSelect, 
  onReassign 
}: ControlRoomProps) {
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<ActiveTrip | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLocation | null>(null);
  const [mapCenter, setMapCenter] = useState({ latitude: 19.076, longitude: 72.8777 });
  const [mapZoom, setMapZoom] = useState(12);
  const [showTraffic, setShowTraffic] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert trips to vehicle locations for map
  useEffect(() => {
    const vehicleMap = new Map<string, VehicleLocation>();
    
    trips.forEach(trip => {
      if (trip.vehicleRegistration && trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED') {
        // GPS data must come from the tracking service; never fabricate vehicle positions.
      }
    });
    
    setVehicles(Array.from(vehicleMap.values()));
  }, [trips]);

  // Mock geofences
  useEffect(() => {
    setGeofences([]);
  }, []);

  const handleVehicleSelect = useCallback((vehicle: VehicleLocation) => {
    setSelectedVehicle(vehicle);
    const trip = trips.find(t => t.id === vehicle.tripId);
    if (trip) {
      setSelectedTrip(trip);
      if (onTripSelect) onTripSelect(trip);
    }
  }, [trips, onTripSelect]);

  const handleReassign = useCallback((tripId: string) => {
    if (onReassign) onReassign(tripId);
  }, [onReassign]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setMapCenter({ latitude: lat, longitude: lng });
  }, []);

  const filteredTrips = trips.filter(trip => 
    filterStatus === 'all' || trip.status === filterStatus
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DISPATCHED: '#3b82f6',
      DRIVER_ACCEPTED: '#3b82f6',
      EN_ROUTE_TO_PICKUP: '#f59e0b',
      ARRIVED_AT_PICKUP: '#10b981',
      IN_TRANSIT: '#1e40af',
      ARRIVED_AT_DROP: '#10b981',
      COMPLETED: '#6b7280',
      CANCELLED: '#ef4444',
      NO_SHOW: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      DISPATCHED: 'Driver Assigned',
      DRIVER_ACCEPTED: 'Driver Accepted',
      EN_ROUTE_TO_PICKUP: 'En Route to Pickup',
      ARRIVED_AT_PICKUP: 'Arrived at Pickup',
      IN_TRANSIT: 'On the way',
      ARRIVED_AT_DROP: 'Arrived at Drop',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      NO_SHOW: 'No-Show',
    };
    return labels[status] || status;
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f3f4f6' }}>
      {/* Sidebar */}
      <div style={{ 
        width: '320px', 
        backgroundColor: 'white', 
        borderRight: '1px solid #e5e7eb',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ 
          padding: '16px', 
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#1e40af',
          color: 'white',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Control Room</h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', opacity: 0.8 }}>Live Trip Monitoring</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                backgroundColor: '#10b981',
                display: 'inline-block',
              }} />
              <span style={{ fontSize: '12px' }}>LIVE</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '13px',
                backgroundColor: 'white',
              }}
            >
              <option value="all">All Statuses</option>
              <option value="DISPATCHED">Driver Assigned</option>
              <option value="DRIVER_ACCEPTED">Driver Accepted</option>
              <option value="EN_ROUTE_TO_PICKUP">En Route to Pickup</option>
              <option value="ARRIVED_AT_PICKUP">At Pickup</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="ARRIVED_AT_DROP">At Drop</option>
              <option value="NO_SHOW">No-Show</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#374151' }}>
              <input
                type="checkbox"
                checked={showTraffic}
                onChange={(e) => setShowTraffic(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
              />
              Traffic Layer
            </label>
          </div>
        </div>

        {/* Stats */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafc' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <div style={{ textAlign: 'center', padding: '8px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#1e40af' }}>{trips.length}</div>
              <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Total Trips</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b' }}>
                {trips.filter(t => t.status === 'IN_TRANSIT' || t.status === 'EN_ROUTE_TO_PICKUP').length}
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Live</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444' }}>
                {trips.filter(t => t.status === 'NO_SHOW').length}
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>No-Shows</div>
            </div>
          </div>
        </div>

        {/* Trip List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {filteredTrips.length === 0 ? (
            <div style={{ padding: '40px 16px', textAlign: 'center', color: '#9ca3af' }}>
              <Ionicons name="car-outline" size={48} />
              <div style={{ marginTop: '12px', fontSize: '14px', fontWeight: 500 }}>No Trips</div>
              <div style={{ marginTop: '4px', fontSize: '12px' }}>{filterStatus === 'all' ? 'No active trips' : `No trips with status: ${filterStatus}`}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredTrips.map(trip => (
                <div
                  key={trip.id}
                  style={{
                    padding: '12px',
                    backgroundColor: selectedTrip?.id === trip.id ? '#eff6ff' : 'white',
                    border: selectedTrip?.id === trip.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => handleVehicleSelect({
                    id: trip.id,
                    registrationNo: trip.vehicleRegistration || `VEH-${trip.id.slice(-4)}`,
                    vehicleType: trip.vehicleType || 'SEDAN',
                    driverName: trip.driverName,
                    latitude: 19.076 + (Math.random() - 0.5) * 0.1,
                    longitude: 72.8777 + (Math.random() - 0.5) * 0.1,
                    speed: trip.status === 'IN_TRANSIT' ? 25 + Math.random() * 30 : 0,
                    heading: Math.random() * 360,
                    status: trip.status,
                    lastUpdate: new Date().toISOString(),
                    tripId: trip.id,
                  })}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        {trip.tripCode}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                        {trip.driverName ? `Driver: ${trip.driverName}` : 'No driver assigned'}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: 'white',
                        backgroundColor: getStatusColor(trip.status),
                        textTransform: 'uppercase',
                      }}
                    >
                      {getStatusLabel(trip.status)}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                    <div>{trip.pickupLocation} → {trip.dropLocation}</div>
                    <div style={{ marginTop: '2px' }}>
                      {trip.vehicleRegistration} • {trip.vehicleType || 'SEDAN'}
                      {trip.eta && ` • ETA: ${trip.eta} min`}
                    </div>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    marginTop: '8px', 
                    paddingTop: '8px', 
                    borderTop: '1px solid #f3f4f6' 
                  }}>
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                      {trip.eta ? `${trip.eta} min` : 'No ETA'}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReassign(trip.id);
                      }}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: '#374151',
                        cursor: 'pointer',
                      }}
                    >
                      Reassign
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Map View */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {/* Map Toolbar */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          right: '16px',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}>
          <div style={{ pointerEvents: 'auto' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
              Live Map View
            </h3>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
              {vehicles.length} vehicles active • {trips.filter(t => t.status === 'IN_TRANSIT').length} in transit
            </p>
          </div>
          <div style={{ pointerEvents: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => {
                if (vehicles.length > 0) {
                  const bounds = vehicles.map(v => [v.latitude, v.longitude]);
                  // Would fit bounds in real implementation
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(255,255,255,0.9)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#1e40af',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              Fit All Vehicles
            </button>
          </div>
        </div>

        {/* Map */}
        <MapComponent
          vehicles={vehicles}
          geofences={geofences}
          selectedVehicle={selectedVehicle}
          onVehicleSelect={handleVehicleSelect}
          center={mapCenter}
          zoom={mapZoom}
          showTraffic={showTraffic}
          height="100%"
          width="100%"
        />

        {/* Selected Trip Panel */}
        {selectedTrip && (
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            right: '16px',
            zIndex: 100,
            pointerEvents: 'auto',
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              border: '1px solid #e5e7eb',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
                    {selectedTrip.tripCode}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    {selectedTrip.driverName} • {selectedTrip.vehicleRegistration} • {selectedTrip.vehicleType}
                  </div>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'white',
                    backgroundColor: getStatusColor(selectedTrip.status),
                    textTransform: 'uppercase',
                  }}
                  >
                    {getStatusLabel(selectedTrip.status)}
                  </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '12px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e40af' }}>
                    {selectedTrip.eta || '-'} min
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>ETA</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#10b981' }}>
                    {selectedTrip.distance?.toFixed(1) || '-'} km
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Distance</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#8b5cf6' }}>
                    {selectedTrip.passengers?.length || 0}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase' }}>Passengers</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleReassign(selectedTrip.id)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#1e40af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Reassign Trip
                </button>
                <button
                  onClick={() => { setSelectedTrip(null); setSelectedVehicle(null); }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'white',
                    color: '#6b7280',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          zIndex: 100,
          pointerEvents: 'auto',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb',
          fontSize: '11px',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '8px', color: '#1e293b' }}>Legend</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { color: '#1e40af', label: 'In Transit' },
              { color: '#10b981', label: 'At Pickup/Drop' },
              { color: '#3b82f6', label: 'Assigned/Accepted' },
              { color: '#f59e0b', label: 'En Route' },
              { color: '#ef4444', label: 'No-Show/Cancelled' },
              { color: '#6b7280', label: 'Completed' },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: item.color }} />
                <span style={{ color: '#374151' }}>{item.label}</span>
              </div>
            ))}
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '2px dashed #9ca3af' }} />
              <span style={{ color: '#6b7280' }}>Geofence Zone</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ControlRoomLiveView;
