'use client';
import React, { useEffect, useRef } from 'react';

interface NodalPoint {
  id: string;
  nodalCode: string;
  nodalName: string;
  latitude: number;
  longitude: number;
  currentOccupancy: number;
  capacity: number;
  billingZone?: string;
  isActive: boolean;
  address?: string;
  site?: { id: string; name: string };
}

interface NodalPointsMapProps {
  nodalPoints: NodalPoint[];
  onMapClick?: (lat: number, lng: number) => void;
  height?: string;
}

export default function NodalPointsMap({ nodalPoints, onMapClick, height = '350px' }: NodalPointsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const [mapError, setMapError] = React.useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = React.useState(false);

  useEffect(() => {
    const initMap = async () => {
      if (!mapRef.current) return;

      try {
        const L = (await import('leaflet')).default;

        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        const defaultCenter: [number, number] = [28.6139, 77.2090];
        const pointsWithCoords = nodalPoints.filter(np => np.latitude != null && np.longitude != null);

        const center = pointsWithCoords.length > 0
          ? [
              pointsWithCoords.reduce((sum, p) => sum + p.latitude, 0) / pointsWithCoords.length,
              pointsWithCoords.reduce((sum, p) => sum + p.longitude, 0) / pointsWithCoords.length,
            ] as [number, number]
          : defaultCenter;

        const map = L.map(mapRef.current!, {
          center,
          zoom: pointsWithCoords.length > 1 ? 11 : 13,
          zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        if (onMapClick) {
          map.on('click', (e: any) => {
            onMapClick(e.latlng.lat, e.latlng.lng);
          });
        }

        mapInstanceRef.current = map;
        setMapLoaded(true);
        setMapError(null);

        if (pointsWithCoords.length > 0) {
          const group = L.featureGroup();
          pointsWithCoords.forEach(np => {
            const marker = createMarker(L, np);
            marker.addTo(map);
            group.addLayer(marker);
            markersRef.current.set(np.id, marker);
          });
          map.fitBounds(group.getBounds().pad(0.1));
        }
      } catch (err) {
        console.error('Map init failed:', err);
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
      setMapLoaded(false);
    };
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    const L = require('leaflet');
    const pointsWithCoords = nodalPoints.filter(np => np.latitude != null && np.longitude != null);
    const currentIds = new Set(pointsWithCoords.map(np => np.id));

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        mapInstanceRef.current.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });

    pointsWithCoords.forEach(np => {
      if (markersRef.current.has(np.id)) {
        const marker = markersRef.current.get(np.id);
        const popup = createPopup(np);
        marker.setPopupContent(popup);
        if (np.isActive) {
          marker.setLatLng([np.latitude, np.longitude]);
        }
      } else {
        const marker = createMarker(L, np);
        marker.addTo(mapInstanceRef.current);
        markersRef.current.set(np.id, marker);
      }
    });
  }, [nodalPoints, mapLoaded]);

  const createPopup = (np: NodalPoint) => {
    const pct = np.capacity > 0 ? Math.round((np.currentOccupancy / np.capacity) * 100) : 0;
    return `
      <div style="min-width: 200px; padding: 8px; font-family: system-ui;">
        <h4 style="margin: 0 0 4px; font-size: 14px; color: #111827;">${np.nodalName}</h4>
        <p style="margin: 0 0 4px; font-size: 12px; color: #6B7280; font-family: monospace;">${np.nodalCode}</p>
        ${np.address ? `<p style="margin: 2px 0; font-size: 12px; color: #374151;">${np.address}</p>` : ''}
        ${np.billingZone ? `<p style="margin: 2px 0; font-size: 12px; color: #374151;">Zone: ${np.billingZone}</p>` : ''}
        ${np.site?.name ? `<p style="margin: 2px 0; font-size: 12px; color: #374151;">Site: ${np.site.name}</p>` : ''}
        <div style="margin-top: 6px; background: #E5E7EB; border-radius: 4px; height: 6px; overflow: hidden;">
          <div style="width: ${pct}%; height: 100%; background: ${pct < 60 ? '#059669' : pct < 85 ? '#D97706' : '#DC2626'}; border-radius: 4px;"></div>
        </div>
        <p style="margin: 4px 0 0; font-size: 11px; color: #6B7280;">${np.currentOccupancy}/${np.capacity} (${pct}%)</p>
        <span style="display: inline-block; margin-top: 4px; padding: 1px 6px; border-radius: 8px; font-size: 10px; font-weight: 600; background: ${np.isActive ? '#D1FAE5' : '#FEE2E2'}; color: ${np.isActive ? '#065F46' : '#991B1B'};">
          ${np.isActive ? 'ACTIVE' : 'INACTIVE'}
        </span>
      </div>
    `;
  };

  const createMarker = (L: any, np: NodalPoint) => {
    const color = !np.isActive ? '#9CA3AF' :
      np.capacity > 0 && (np.currentOccupancy / np.capacity) >= 0.85 ? '#DC2626' :
      np.capacity > 0 && (np.currentOccupancy / np.capacity) >= 0.6 ? '#D97706' : '#059669';

    const icon = L.divIcon({
      className: 'nodal-point-marker',
      html: `
        <div style="
          width: 30px; height: 30px; border-radius: 50%;
          background: ${color}; border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; color: white; font-weight: 700;
          cursor: pointer; transition: transform 0.15s;
        " onmouseenter="this.style.transform='scale(1.15)'" onmouseleave="this.style.transform='scale(1)'">
          📍
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    const marker = L.marker([np.latitude, np.longitude], { icon });
    marker.bindPopup(createPopup(np));
    return marker;
  };

  if (mapError) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🗺️</div>
          <div style={{ color: '#ef4444', fontWeight: 500 }}>{mapError}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div ref={mapRef} style={{ height, width: '100%', borderRadius: '8px' }} />
      {mapLoaded && (
        <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'white', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', fontWeight: 500, color: '#374151', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', zIndex: 10 }}>
          {nodalPoints.length} nodal point{nodalPoints.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
