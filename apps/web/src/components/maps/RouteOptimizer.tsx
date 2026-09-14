"use client";

import { useState, useCallback } from "react";
import { apiFetch } from "../../hooks/useApi";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface RouteStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  arrivalTime?: string;
  departureTime?: string;
  waitTimeMinutes?: number;
}

interface RouteSegment {
  from: RouteStop;
  to: RouteStop;
  distance: number;
  duration: number;
  polyline: string;
}

interface OptimizedRoute {
  stops: RouteStop[];
  segments: RouteSegment[];
  totalDistance: number;
  totalDuration: number;
  savedDistance?: number;
  savedDuration?: number;
}

interface DistanceMatrixResult {
  origins: RouteStop[];
  destinations: RouteStop[];
  distances: number[][];
  durations: number[][];
}

interface RouteOptimizerProps {
  stops: RouteStop[];
  onOptimize?: (route: OptimizedRoute) => void;
  onDistanceCalculated?: (matrix: DistanceMatrixResult) => void;
  optimizeMode?: "time" | "distance";
  className?: string;
}

export default function RouteOptimizer({
  stops = [],
  onOptimize,
  onDistanceCalculated,
  optimizeMode = "time",
  className = "",
}: RouteOptimizerProps) {
  const [loading, setLoading] = useState(false);
  const [optimized, setOptimized] = useState<OptimizedRoute | null>(null);
  const [matrix, setMatrix] = useState<DistanceMatrixResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateDistanceMatrix = useCallback(async () => {
    if (stops.length < 2) return null;
    setLoading(true);
    setError(null);

    try {
      if (!GOOGLE_MAPS_API_KEY) {
        const data = await apiFetch("/maps/distance-matrix", {
          method: "POST",
          body: JSON.stringify({
            origins: stops.map((s) => ({ lat: s.latitude, lng: s.longitude })),
            destinations: stops.map((s) => ({ lat: s.latitude, lng: s.longitude })),
          }),
        });
        const result: DistanceMatrixResult = {
          origins: stops,
          destinations: stops,
          distances: data?.distances || [],
          durations: data?.durations || [],
        };
        setMatrix(result);
        onDistanceCalculated?.(result);
        return result;
      }

      const origins = stops.map((s) => `${s.latitude},${s.longitude}`).join("|");
      const destinations = origins;
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== "OK") {
        throw new Error(data.error_message || "Distance matrix request failed");
      }

      const distances: number[][] = [];
      const durations: number[][] = [];

      data.rows.forEach((row: any, i: number) => {
        distances[i] = [];
        durations[i] = [];
        row.elements.forEach((el: any, j: number) => {
          distances[i][j] = el.distance?.value || 0;
          durations[i][j] = el.duration?.value || 0;
        });
      });

      const result: DistanceMatrixResult = {
        origins: stops,
        destinations: stops,
        distances,
        durations,
      };
      setMatrix(result);
      onDistanceCalculated?.(result);
      return result;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [stops, onDistanceCalculated]);

  const optimizeRoute = useCallback(async () => {
    if (stops.length < 3) {
      setOptimized({
        stops,
        segments: [],
        totalDistance: 0,
        totalDuration: 0,
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let distMatrix = matrix;
      if (!distMatrix) {
        distMatrix = await calculateDistanceMatrix();
      }
      if (!distMatrix) throw new Error("Could not calculate distance matrix");

      const n = stops.length;
      const dist = distMatrix.durations;
      const routeDist = distMatrix.distances;

      const visited = new Set<number>([0]);
      const order = [0];

      let current = 0;
      while (visited.size < n) {
        let nearest = -1;
        let nearestCost = Infinity;

        for (let i = 0; i < n; i++) {
          if (visited.has(i)) continue;
          const cost = optimizeMode === "time" ? dist[current][i] : routeDist[current][i];
          if (cost < nearestCost) {
            nearestCost = cost;
            nearest = i;
          }
        }

        if (nearest === -1) break;
        visited.add(nearest);
        order.push(nearest);
        current = nearest;
      }

      const optimizedStops = order.map((i) => stops[i]);

      const segments: RouteSegment[] = [];
      let totalDist = 0;
      let totalDur = 0;

      for (let i = 0; i < order.length - 1; i++) {
        const fromIdx = order[i];
        const toIdx = order[i + 1];
        segments.push({
          from: stops[fromIdx],
          to: stops[toIdx],
          distance: routeDist[fromIdx][toIdx],
          duration: dist[fromIdx][toIdx],
          polyline: "",
        });
        totalDist += routeDist[fromIdx][toIdx];
        totalDur += dist[fromIdx][toIdx];
      }

      let origDist = 0;
      let origDur = 0;
      for (let i = 0; i < stops.length - 1; i++) {
        origDist += routeDist[i][i + 1];
        origDur += dist[i][i + 1];
      }

      const result: OptimizedRoute = {
        stops: optimizedStops,
        segments,
        totalDistance: totalDist,
        totalDuration: totalDur,
        savedDistance: origDist - totalDist,
        savedDuration: origDur - totalDur,
      };

      setOptimized(result);
      onOptimize?.(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [stops, optimizeMode, matrix, calculateDistanceMatrix, onOptimize]);

  const formatDistance = (meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
    return `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Route Optimizer</h3>
        <div className="flex gap-2">
          <button
            onClick={calculateDistanceMatrix}
            disabled={loading || stops.length < 2}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium"
          >
            {loading ? "Calculating..." : "📊 Distance Matrix"}
          </button>
          <button
            onClick={optimizeRoute}
            disabled={loading || stops.length < 3}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? "Optimizing..." : "⚡ Optimize Route"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs text-blue-600 font-medium">Total Stops</p>
          <p className="text-2xl font-bold text-blue-900">{stops.length}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-xs text-green-600 font-medium">Total Distance</p>
          <p className="text-2xl font-bold text-green-900">
            {optimized ? formatDistance(optimized.totalDistance) : matrix ? formatDistance(matrix.distances.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0)) : "-"}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <p className="text-xs text-purple-600 font-medium">Total Duration</p>
          <p className="text-2xl font-bold text-purple-900">
            {optimized ? formatDuration(optimized.totalDuration) : matrix ? formatDuration(matrix.durations.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0)) : "-"}
          </p>
        </div>
      </div>

      {optimized && optimized.savedDistance !== undefined && optimized.savedDistance > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-semibold text-green-800">Route Optimized!</p>
            <p className="text-xs text-green-600">
              Saved {formatDistance(optimized.savedDistance)} and {formatDuration(optimized.savedDuration || 0)}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2 font-medium text-gray-600">#</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Stop</th>
              <th className="text-left px-4 py-2 font-medium text-gray-600">Address</th>
              {matrix && (
                <>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Distance to Next</th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600">Time to Next</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {(optimized?.stops || stops).map((stop, idx) => (
              <tr key={stop.id} className="border-t">
                <td className="px-4 py-2">
                  <span
                    className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold"
                  >
                    {idx + 1}
                  </span>
                </td>
                <td className="px-4 py-2 font-medium">{stop.name}</td>
                <td className="px-4 py-2 text-gray-500">{stop.address || `${stop.latitude}, ${stop.longitude}`}</td>
                {matrix && idx < (optimized?.stops || stops).length - 1 && (
                  <>
                    <td className="px-4 py-2 text-right text-gray-600">
                      {formatDistance(matrix.distances[idx]?.[idx + 1] || 0)}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">
                      {formatDuration(matrix.durations[idx]?.[idx + 1] || 0)}
                    </td>
                  </>
                )}
                {matrix && idx === (optimized?.stops || stops).length - 1 && (
                  <>
                    <td className="px-4 py-2 text-right text-gray-400">-</td>
                    <td className="px-4 py-2 text-right text-gray-400">-</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type { RouteStop, OptimizedRoute, DistanceMatrixResult };
