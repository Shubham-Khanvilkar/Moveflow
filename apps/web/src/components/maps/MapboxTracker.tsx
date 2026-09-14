"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";

export interface VehiclePosition {
  id: string;
  registrationNo: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  status: string;
  driverName?: string;
  tripCode?: string;
  lastUpdate: string;
}

export interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  type?: string;
  isActive: boolean;
}

export interface MapRoute {
  id: string;
  coordinates: [number, number][];
  color?: string;
  label?: string;
}

interface MapboxTrackerProps {
  vehicles: VehiclePosition[];
  geofences?: Geofence[];
  routes?: MapRoute[];
  center?: [number, number];
  zoom?: number;
  onVehicleClick?: (vehicle: VehiclePosition) => void;
  onGeofenceClick?: (geofence: Geofence) => void;
  onMapClick?: (lat: number, lng: number) => void;
  height?: string;
  showTraffic?: boolean;
  followVehicle?: string;
}

let mapboxglModule: typeof import("mapbox-gl") | null = null;

async function getMapboxGL() {
  if (!mapboxglModule) {
    mapboxglModule = await import("mapbox-gl");
  }
  return mapboxglModule;
}

export default function MapboxTracker({
  vehicles = [],
  geofences = [],
  routes = [],
  center = [77.1025, 28.7041],
  zoom = 11,
  onVehicleClick,
  onGeofenceClick,
  onMapClick,
  height = "500px",
  showTraffic = false,
  followVehicle,
}: MapboxTrackerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markersRef = useRef<Map<string, import("mapbox-gl").Marker>>(new Map());
  const geofenceCirclesRef = useRef<Map<string, any>>(new Map());
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehiclePosition | null>(null);

  const getMarkerColor = (status: string) => {
    const colors: Record<string, string> = {
      IN_TRANSIT: "#3B82F6",
      AVAILABLE: "#22C55E",
      AT_PICKUP: "#F59E0B",
      ARRIVED_AT_PICKUP: "#22C55E",
      BREAKDOWN: "#EF4444",
      OFF_DUTY: "#9CA3AF",
      ON_BREAK: "#F97316",
    };
    return colors[status?.toUpperCase()] || "#6B7280";
  };

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapContainer.current || mapRef.current) return;
      if (!MAPBOX_TOKEN) return;

      const mapboxgl = await getMapboxGL();
      if (cancelled) return;

      mapboxgl.default.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.default.Map({
        container: mapContainer.current!,
        style: MAP_STYLE,
        center,
        zoom,
        attributionControl: true,
      });

      map.addControl(new mapboxgl.default.NavigationControl(), "top-right");
      map.addControl(new mapboxgl.default.FullscreenControl(), "top-right");

      if (showTraffic) {
        map.on("load", () => {
          map.addSource("traffic", {
            type: "vector",
            url: "mapbox://mapbox.mapbox-traffic-v1",
          });
          map.addLayer({
            id: "traffic-layer",
            type: "line",
            source: "traffic",
            "source-layer": "traffic",
            paint: {
              "line-color": [
                "match",
                ["get", "congestion"],
                "low", "#22C55E",
                "moderate", "#F59E0B",
                "heavy", "#EF4444",
                "severe", "#7C2D12",
                "#9CA3AF",
              ],
              "line-width": 3,
            },
          });
        });
      }

      map.on("load", () => setMapLoaded(true));

      if (onMapClick) {
        map.on("click", (e: any) => {
          onMapClick(e.lngLat.lat, e.lngLat.lng);
        });
      }

      mapRef.current = map;
    }

    initMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const updateMarkers = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const mapboxgl = await getMapboxGL();

    const currentIds = new Set(vehicles.map((v) => v.id));

    for (const [id, marker] of Array.from(markersRef.current.entries())) {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    vehicles.forEach((vehicle) => {
      const el = document.createElement("div");
      el.className = "vehicle-marker";
      el.style.cssText = `
        width: 32px; height: 32px; border-radius: 50%;
        background: ${getMarkerColor(vehicle.status)};
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        color: white; font-size: 14px; font-weight: bold;
        transition: transform 0.2s;
      `;
      el.textContent = "\uD83D\uDE97";
      el.title = `${vehicle.registrationNo} \u2014 ${vehicle.status}`;

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.2)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
      });

      const popup = new mapboxgl.default.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div style="padding: 8px; font-family: system-ui; min-width: 180px;">
          <p style="font-weight: 600; margin: 0 0 4px;">${vehicle.registrationNo}</p>
          <p style="margin: 0; color: #666; font-size: 12px;">Status: <strong>${vehicle.status?.replace(/_/g, " ")}</strong></p>
          ${vehicle.driverName ? `<p style="margin: 2px 0 0; color: #666; font-size: 12px;">Driver: ${vehicle.driverName}</p>` : ""}
          ${vehicle.tripCode ? `<p style="margin: 2px 0 0; color: #666; font-size: 12px;">Trip: ${vehicle.tripCode}</p>` : ""}
          ${vehicle.speed ? `<p style="margin: 2px 0 0; color: #666; font-size: 12px;">Speed: ${vehicle.speed} km/h</p>` : ""}
          <p style="margin: 4px 0 0; color: #999; font-size: 10px;">${new Date(vehicle.lastUpdate).toLocaleTimeString()}</p>
        </div>
      `);

      if (markersRef.current.has(vehicle.id)) {
        const existing = markersRef.current.get(vehicle.id)!;
        existing.setLngLat([vehicle.longitude, vehicle.latitude]);
        existing.setPopup(popup);
      } else {
        const marker = new mapboxgl.default.Marker({ element: el })
          .setLngLat([vehicle.longitude, vehicle.latitude])
          .setPopup(popup)
          .addTo(map);

        el.addEventListener("click", () => {
          setSelectedVehicle(vehicle);
          onVehicleClick?.(vehicle);
        });

        markersRef.current.set(vehicle.id, marker);
      }
    });
  }, [vehicles, mapLoaded, onVehicleClick]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  useEffect(() => {
    if (followVehicle && markersRef.current.has(followVehicle)) {
      const vehicle = vehicles.find((v) => v.id === followVehicle);
      if (vehicle) {
        mapRef.current?.flyTo({
          center: [vehicle.longitude, vehicle.latitude],
          zoom: 15,
          duration: 1000,
        });
      }
    }
  }, [followVehicle, vehicles]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    for (const [, circle] of Array.from(geofenceCirclesRef.current.entries())) {
      circle.remove();
    }
    geofenceCirclesRef.current.clear();

    geofences.forEach(async (gf) => {
      if (!gf.isActive) return;

      const mapboxgl = await getMapboxGL();
      const el = document.createElement("div");
      el.style.cssText = `
        width: ${gf.radius * 2}px; height: ${gf.radius * 2}px;
        border-radius: 50%;
        background: rgba(59, 130, 246, 0.15);
        border: 2px solid rgba(59, 130, 246, 0.5);
        transform: translate(-50%, -50%);
      `;

      const marker = new mapboxgl.default.Marker({ element: el, draggable: false })
        .setLngLat([gf.longitude, gf.latitude])
        .addTo(map);

      marker.getElement().addEventListener("click", () => {
        onGeofenceClick?.(gf);
      });

      geofenceCirclesRef.current.set(gf.id, marker);
    });
  }, [geofences, mapLoaded, onGeofenceClick]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const sourceId = "route-lines";
    if (map.getSource(sourceId)) {
      map.removeSource(sourceId);
    }
    if (map.getLayer("route-lines")) {
      map.removeLayer("route-lines");
    }

    if (routes.length === 0) return;

    const features = routes.map((route) => ({
      type: "Feature" as const,
      properties: { id: route.id, color: route.color || "#3B82F6" },
      geometry: {
        type: "LineString" as const,
        coordinates: route.coordinates,
      },
    }));

    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features,
      },
    });

    map.addLayer({
      id: "route-lines",
      type: "line",
      source: sourceId,
      paint: {
        "line-color": ["get", "color"],
        "line-width": 4,
        "line-opacity": 0.8,
      },
    });
  }, [routes, mapLoaded]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center" style={{ height }}>
        <div className="text-4xl mb-3">🗺️</div>
        <p className="text-gray-500 font-medium">Mapbox API key required</p>
        <p className="text-sm text-gray-400 mt-1">
          Set <code>NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> in your .env file
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border">
      <div ref={mapContainer} style={{ height, width: "100%" }} />
      {selectedVehicle && (
        <div className="absolute bottom-4 left-4 bg-white rounded-xl shadow-lg p-4 max-w-xs z-10">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">{selectedVehicle.registrationNo}</h4>
            <button
              onClick={() => setSelectedVehicle(null)}
              className="text-gray-400 hover:text-gray-600 text-lg"
            >
              &times;
            </button>
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            <p>Status: <strong>{selectedVehicle.status?.replace(/_/g, " ")}</strong></p>
            {selectedVehicle.driverName && <p>Driver: {selectedVehicle.driverName}</p>}
            {selectedVehicle.tripCode && <p>Trip: {selectedVehicle.tripCode}</p>}
            {selectedVehicle.speed !== undefined && <p>Speed: {selectedVehicle.speed} km/h</p>}
            <p className="text-gray-400">Last update: {new Date(selectedVehicle.lastUpdate).toLocaleTimeString()}</p>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                mapRef.current?.flyTo({
                  center: [selectedVehicle.longitude, selectedVehicle.latitude],
                  zoom: 15,
                });
              }}
              className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium"
            >
              Center
            </button>
            <button
              onClick={() => onVehicleClick?.(selectedVehicle)}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium"
            >
              Details
            </button>
          </div>
        </div>
      )}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow px-3 py-2 text-xs font-medium z-10">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Available
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> In Transit
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> At Pickup
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Breakdown
          </span>
        </div>
      </div>
    </div>
  );
}
