import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { gpsService } from '../services/gps';

interface UseGPSReturn {
  location: { latitude: number; longitude: number } | null;
  address: string | null;
  loading: boolean;
  error: string | null;
  getCurrentLocation: () => Promise<{ latitude: number; longitude: number } | null>;
  reverseGeocode: (lat: number, lng: number) => Promise<string | null>;
  startTracking: (tripId: string, vehicleId: string) => Promise<boolean>;
  stopTracking: () => Promise<void>;
  isTracking: boolean;
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => number;
}

export function useGPS(): UseGPSReturn {
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const getCurrentLocation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loc = await gpsService.getCurrentLocation();
      if (loc) {
        setLocation(loc);
        const addr = await gpsService.reverseGeocode(loc.latitude, loc.longitude);
        setAddress(addr);
      }
      return loc;
    } catch (err: any) {
      setError(err.message || 'Failed to get location');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    return gpsService.reverseGeocode(lat, lng);
  }, []);

  const startTracking = useCallback(async (tripId: string, vehicleId: string) => {
    const started = await gpsService.startTracking(tripId, vehicleId);
    setIsTracking(started);
    return started;
  }, []);

  const stopTracking = useCallback(async () => {
    await gpsService.stopTracking();
    setIsTracking(false);
  }, []);

  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number) => {
      return gpsService.calculateDistance(lat1, lon1, lat2, lon2);
    },
    []
  );

  return {
    location,
    address,
    loading,
    error,
    getCurrentLocation,
    reverseGeocode,
    startTracking,
    stopTracking,
    isTracking,
    calculateDistance,
  };
}
