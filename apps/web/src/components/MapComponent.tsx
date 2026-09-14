'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface GPSPoint {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

export interface VehicleLocation {
  id: string;
  registrationNo: string;
  vehicleType: string;
  driverName?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  status: string;
  lastUpdate: string;
  tripId?: string;
}

export interface Geofence {
  id: string;
  name: string;
  coordinates: { latitude: number; longitude: number }[];
  color: string;
}

interface MapComponentProps {
  vehicles?: VehicleLocation[];
  geofences?: Geofence[];
  selectedVehicle?: VehicleLocation | null;
  onVehicleSelect?: (vehicle: VehicleLocation) => void;
  center?: { latitude: number; longitude: number };
  zoom?: number;
  showTraffic?: boolean;
  height?: string;
  width?: string;
  className?: string;
}

const DEFAULT_CENTER = { latitude: 19.076, longitude: 72.8777 };
const DEFAULT_ZOOM = 12;

export function MapComponent({
  vehicles = [],
  geofences = [],
  selectedVehicle,
  onVehicleSelect,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  showTraffic = false,
  height = '400px',
  width = '100%',
  className = '',
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const polylinesRef = useRef<Map<string, any>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      try {
        const L = await import('leaflet');
        
        // Fix default marker icon
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        const map = L.map(mapRef.current!, {
          center: [center.latitude, center.longitude],
          zoom,
          zoomControl: true,
          attributionControl: true,
        });

        // Base tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        // Traffic layer if enabled
        if (showTraffic) {
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            opacity: 0.7,
          }).addTo(map);
        }

        mapInstanceRef.current = map;
        setMapLoaded(true);
        setMapError(null);

        // Add vehicles
        vehicles.forEach(addVehicleMarker);

        // Add geofences
        geofences.forEach(addGeofence);

        // Fit bounds if vehicles exist
        if (vehicles.length > 0) {
          const group = L.featureGroup(Array.from(markersRef.current.values()));
          map.fitBounds(group.getBounds(), { padding: [50, 50] });
        }

        // Handle map click
        map.on('click', (e: any) => {
          console.log('Map clicked at:', e.latlng);
        });

      } catch (err) {
        console.error('Failed to initialize map:', err);
        setMapError('Failed to load map');
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markersRef.current.clear();
      polylinesRef.current.clear();
      setMapLoaded(false);
    };
  }, [center, zoom, showTraffic, vehicles, geofences, selectedVehicle]);

  const createVehicleIcon = (vehicle: VehicleLocation) => {
    const color = vehicle.status === 'IN_TRANSIT' ? '#1e40af' : 
                  vehicle.status === 'ARRIVED_AT_PICKUP' ? '#10b981' :
                  vehicle.status === 'DISPATCHED' ? '#3b82f6' : '#6b7280';
    
    return L.divIcon({
      className: 'vehicle-marker',
      html: `
        <div style="
          width: 40px; 
          height: 40px; 
          border-radius: 50%; 
          background: ${color}; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          border: 3px solid white; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          font-size: 16px;
        ">
          ${vehicle.vehicleType === 'BUS' || vehicle.vehicleType === 'SHUTTLE' ? '🚌' : '🚗'}
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  const addVehicleMarker = (vehicle: VehicleLocation) => {
    if (!mapInstanceRef.current) return;
    
    // Remove existing marker if any
    if (markersRef.current.has(vehicle.id)) {
      mapInstanceRef.current.removeLayer(markersRef.current.get(vehicle.id));
    }

    const marker = L.marker([vehicle.latitude, vehicle.longitude], {
      icon: createVehicleIcon(vehicle),
      title: `${vehicle.registrationNo} - ${vehicle.driverName || 'No driver'}`,
    });

    const popupContent = `
      <div style="min-width: 200px; padding: 8px;">
        <h4 style="margin: 0 0 8px 0; color: #1e293b;">${vehicle.registrationNo}</h4>
        <p style="margin: 4px 0; color: #6b7280;">${vehicle.driverName || 'No driver assigned'}</p>
        <p style="margin: 4px 0; color: #6b7280;">${vehicle.vehicleType}</p>
        <p style="margin: 4px 0; color: #6b7280;">Speed: ${vehicle.speed ? Math.round(vehicle.speed) + ' km/h' : 'N/A'}</p>
        <p style="margin: 4px 0; color: #6b7280;">Status: ${vehicle.status}</p>
        <p style="margin: 4px 0; color: #9ca3af; font-size: 12px;">Updated: ${new Date(vehicle.lastUpdate).toLocaleTimeString()}</p>
      </div>
    `;

    marker.bindPopup(popupContent);
    
    marker.on('click', () => {
      if (onVehicleSelect) {
        onVehicleSelect(vehicle);
      }
    });

    marker.addTo(mapInstanceRef.current);
    markersRef.current.set(vehicle.id, marker);
  };

  const addGeofence = (geofence: Geofence) => {
    if (!mapInstanceRef.current || geofence.coordinates.length < 3) return;
    
    if (polylinesRef.current.has(geofence.id)) {
      mapInstanceRef.current.removeLayer(polylinesRef.current.get(geofence.id));
    }

    const latLngs = geofence.coordinates.map(c => [c.latitude, c.longitude] as L.LatLngTuple);
    latLngs.push(latLngs[0]); // Close the polygon

    const polygon = L.polygon(latLngs, {
      color: geofence.color,
      weight: 2,
      fillColor: geofence.color,
      fillOpacity: 0.15,
      dashArray: '5, 10',
    });

    polygon.bindPopup(`<strong>${geofence.name}</strong><br>Geofence Zone`);
    polygon.addTo(mapInstanceRef.current);
    polylinesRef.current.set(geofence.id, polygon);
  };

  // Update vehicle positions when they change
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    vehicles.forEach(vehicle => {
      const existingMarker = markersRef.current.get(vehicle.id);
      if (existingMarker) {
        existingMarker.setLatLng([vehicle.latitude, vehicle.longitude]);
        existingMarker.setIcon(createVehicleIcon(vehicle));
        
        // Update popup
        const popupContent = `
          <div style="min-width: 200px; padding: 8px;">
            <h4 style="margin: 0 0 8px 0; color: #1e293b;">${vehicle.registrationNo}</h4>
            <p style="margin: 4px 0; color: #6b7280;">${vehicle.driverName || 'No driver assigned'}</p>
            <p style="margin: 4px 0; color: #6b7280;">${vehicle.vehicleType}</p>
            <p style="margin: 4px 0; color: #6b7280;">Speed: ${vehicle.speed ? Math.round(vehicle.speed) + ' km/h' : 'N/A'}</p>
            <p style="margin: 4px 0; color: #6b7280;">Status: ${vehicle.status}</p>
            <p style="margin: 4px 0; color: #9ca3af; font-size: 12px;">Updated: ${new Date(vehicle.lastUpdate).toLocaleTimeString()}</p>
          </div>
        `;
        existingMarker.setPopupContent(popupContent);
      } else {
        addVehicleMarker(vehicle);
      }
    });

    // Remove markers for vehicles no longer in list
    const currentIds = new Set(vehicles.map(v => v.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        mapInstanceRef.current?.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });
  }, [vehicles, mapLoaded]);

  if (mapError) {
    return (
      <div 
        style={{ 
          height, 
          width, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          ...(className ? { className } : {})
        }}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Ionicons name="map-outline" size={48} color="#9ca3af" />
          <div style={{ marginTop: '12px', color: '#ef4444', fontWeight: 500 }}>{mapError}</div>
          <div style={{ marginTop: '8px', color: '#6b7280', fontSize: '14px' }}>Retrying...</div>
        </div>
      </div>
    );
  }

  if (!mapLoaded) {
    return (
      <div 
        style={{ 
          height, 
          width, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          ...(className ? { className } : {})
        }}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>🗺️</div>
          <div style={{ color: '#6b7280' }}>Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mapRef} 
      style={{ 
        height, 
        width, 
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        ...(className ? { className } : {})
      }} 
    />
  );
}

export default MapComponent;