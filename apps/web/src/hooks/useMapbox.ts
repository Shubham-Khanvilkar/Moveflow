"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

let mapboxglModule: typeof import("mapbox-gl") | null = null;

async function getMapboxGL() {
  if (!mapboxglModule) {
    mapboxglModule = await import("mapbox-gl");
  }
  return mapboxglModule;
}

interface MapboxHookOptions {
  center?: [number, number];
  zoom?: number;
  style?: string;
  interactive?: boolean;
}

interface GeoResult {
  latitude: number;
  longitude: number;
  address: string;
  placeName?: string;
}

interface RouteResult {
  coordinates: [number, number][];
  distance: number;
  duration: number;
  steps: { instruction: string; distance: number; duration: number }[];
}

interface DistanceResult {
  distance: number;
  duration: number;
}

export function useMapbox(options: MapboxHookOptions = {}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapContainer.current || mapRef.current) return;
      if (!MAPBOX_TOKEN) {
        setError("Mapbox access token not configured");
        return;
      }

      try {
        const mapboxgl = await getMapboxGL();
        if (cancelled) return;

        mapboxgl.default.accessToken = MAPBOX_TOKEN;

        const map = new mapboxgl.default.Map({
          container: mapContainer.current!,
          style: options.style || "mapbox://styles/mapbox/streets-v12",
          center: options.center || [77.1025, 28.7041],
          zoom: options.zoom || 11,
          interactive: options.interactive !== false,
        });

        map.addControl(new mapboxgl.default.NavigationControl(), "top-right");

        map.on("load", () => {
          if (!cancelled) setIsLoaded(true);
        });

        map.on("error", (e: any) => {
          if (!cancelled) setError(e.error?.message || "Map error");
        });

        mapRef.current = map;
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      }
    }

    initMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  const flyTo = useCallback((lng: number, lat: number, zoom?: number) => {
    mapRef.current?.flyTo({
      center: [lng, lat],
      zoom: zoom || 15,
      duration: 1000,
    });
  }, []);

  const fitBounds = useCallback((bounds: [[number, number], [number, number]]) => {
    mapRef.current?.fitBounds(bounds, { padding: 50 });
  }, []);

  const addMarker = useCallback(
    (id: string, lng: number, lat: number, options?: { color?: string; popup?: string; draggable?: boolean }) => {
      if (!mapRef.current || !isLoaded) return null;

      const markerPromise = getMapboxGL().then((mapboxgl) => {
        const el = document.createElement("div");
        el.style.cssText = `
          width: 24px; height: 24px; border-radius: 50%;
          background: ${options?.color || "#3B82F6"};
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        `;

        const marker = new mapboxgl.default.Marker({ element: el, draggable: options?.draggable })
          .setLngLat([lng, lat])
          .addTo(mapRef.current!);

        if (options?.popup) {
          const popup = new mapboxgl.default.Popup({ offset: 25 }).setHTML(options.popup);
          marker.setPopup(popup);
        }

        return {
          id,
          marker,
          setPosition: (newLng: number, newLat: number) => marker.setLngLat([newLng, newLat]),
          remove: () => marker.remove(),
        };
      });

      return markerPromise;
    },
    [isLoaded]
  );

  const addLine = useCallback(
    (id: string, coordinates: [number, number][], options?: { color?: string; width?: number }) => {
      if (!mapRef.current || !isLoaded) return;

      const sourceId = `line-${id}`;
      if (mapRef.current.getSource(sourceId)) {
        mapRef.current.removeSource(sourceId);
        mapRef.current.removeLayer(`line-layer-${id}`);
      }

      mapRef.current.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates },
        },
      });

      mapRef.current.addLayer({
        id: `line-layer-${id}`,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": options?.color || "#3B82F6",
          "line-width": options?.width || 3,
        },
      });
    },
    [isLoaded]
  );

  const addCircle = useCallback(
    (id: string, center: [number, number], radiusMeters: number, options?: { color?: string; opacity?: number }) => {
      if (!mapRef.current || !isLoaded) return;

      const sourceId = `circle-${id}`;
      if (mapRef.current.getSource(sourceId)) {
        mapRef.current.removeSource(sourceId);
        mapRef.current.removeLayer(`circle-layer-${id}`);
      }

      const points = 64;
      const coords: [number, number][] = [];
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * 2 * Math.PI;
        const latOffset = (radiusMeters / 111320) * Math.cos(angle);
        const lngOffset = (radiusMeters / (111320 * Math.cos((center[1] * Math.PI) / 180))) * Math.sin(angle);
        coords.push([center[0] + lngOffset, center[1] + latOffset]);
      }
      coords.push(coords[0]);

      mapRef.current.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [coords] },
        },
      });

      mapRef.current.addLayer({
        id: `circle-layer-${id}`,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": options?.color || "#3B82F6",
          "fill-opacity": options?.opacity || 0.15,
        },
      });
    },
    [isLoaded]
  );

  const removeLayer = useCallback((id: string) => {
    if (!mapRef.current) return;
    ["line", "circle"].forEach((type) => {
      const layerId = `${type}-layer-${id}`;
      const sourceId = `${type}-${id}`;
      if (mapRef.current!.getLayer(layerId)) mapRef.current!.removeLayer(layerId);
      if (mapRef.current!.getSource(sourceId)) mapRef.current!.removeSource(sourceId);
    });
  }, []);

  return {
    mapContainer,
    map: mapRef.current,
    isLoaded,
    error,
    flyTo,
    fitBounds,
    addMarker,
    addLine,
    addCircle,
    removeLayer,
  };
}

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError("Google Maps API key not configured");
      return;
    }

    if (typeof window !== "undefined" && (window as any).google?.maps) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,directions`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setError("Failed to load Google Maps");
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  const getDirections = useCallback(
    async (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }): Promise<RouteResult | null> => {
      try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status !== "OK" || !data.routes?.length) return null;

        const route = data.routes[0];
        const leg = route.legs[0];

        const steps: RouteResult["steps"] = [];
        const coordinates: [number, number][] = [];

        leg.steps.forEach((step: any) => {
          steps.push({
            instruction: step.html_instructions?.replace(/<[^>]+>/g, "") || "",
            distance: step.distance?.value || 0,
            duration: step.duration?.value || 0,
          });

          const decoded = decodePolyline(step.polyline.points);
          coordinates.push(...decoded);
        });

        return {
          coordinates,
          distance: leg.distance?.value || 0,
          duration: leg.duration?.value || 0,
          steps,
        };
      } catch {
        return null;
      }
    },
    []
  );

  const getDistanceMatrix = useCallback(
    async (
      origins: { lat: number; lng: number }[],
      destinations: { lat: number; lng: number }[]
    ): Promise<{ distances: number[][]; durations: number[][] } | null> => {
      try {
        const o = origins.map((p) => `${p.lat},${p.lng}`).join("|");
        const d = destinations.map((p) => `${p.lat},${p.lng}`).join("|");
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${o}&destinations=${d}&key=${GOOGLE_MAPS_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.status !== "OK") return null;

        const distances = data.rows.map((row: any) =>
          row.elements.map((el: any) => el.distance?.value || 0)
        );
        const durations = data.rows.map((row: any) =>
          row.elements.map((el: any) => el.duration?.value || 0)
        );

        return { distances, durations };
      } catch {
        return null;
      }
    },
    []
  );

  return {
    isLoaded,
    error,
    getDirections,
    getDistanceMatrix,
  };
}

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lng / 1e5, lat / 1e5]);
  }

  return points;
}

export type { GeoResult, RouteResult, DistanceResult };
