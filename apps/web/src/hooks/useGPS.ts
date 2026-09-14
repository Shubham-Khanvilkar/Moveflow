import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

interface GPSPoint {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp: string;
  vehicleId: string;
  tripId?: string;
}

interface VehicleLocation {
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

interface UseGPSOptions {
  token?: string;
  tripId?: string;
  vehicleId?: string;
  onLocationUpdate?: (data: GPSPoint) => void;
  onVehicleUpdate?: (vehicle: VehicleLocation) => void;
  onTripStatusUpdate?: (data: { tripId: string; status: string; eta?: number }) => void;
  onError?: (error: Error) => void;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useGPS({
  token,
  tripId,
  vehicleId,
  onLocationUpdate,
  onVehicleUpdate,
  onTripStatusUpdate,
  onError,
  reconnect = true,
  reconnectAttempts = 5,
  reconnectDelay = 1000,
}: UseGPSOptions) {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lastError, setLastError] = useState<Error | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!token) {
      setLastError(new Error('No auth token provided'));
      return;
    }

    if (socket?.connected) {
      return;
    }

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnection: reconnect,
      reconnectionAttempts: reconnectAttempts,
      reconnectionDelay: reconnectDelay,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      console.log('GPS Socket connected');
      setConnected(true);
      setLastError(null);
      setReconnectCount(0);

      if (tripId) {
        newSocket.emit('subscribe-trip', { tripId });
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('GPS Socket disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.log('GPS Socket connection error:', err.message);
      setLastError(err);
      setConnected(false);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('GPS Socket reconnect attempt:', attemptNumber);
      setReconnectCount(attemptNumber);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('GPS Socket reconnected after', attemptNumber, 'attempts');
      setConnected(true);
      setLastError(null);
      setReconnectCount(0);

      if (tripId) {
        newSocket.emit('subscribe-trip', { tripId });
      }
    });

    newSocket.on('driver-location', (data: GPSPoint & { tripId: string }) => {
      if (onLocationUpdate) {
        onLocationUpdate(data);
      }
    });

    newSocket.on('location-update', (data: GPSPoint) => {
      if (onLocationUpdate) {
        onLocationUpdate(data);
      }
    });

    newSocket.on('vehicle-location', (vehicle: VehicleLocation) => {
      if (onVehicleUpdate) {
        onVehicleUpdate(vehicle);
      }
    });

    newSocket.on('trip-status-change', (data: { tripId: string; status: string; eta?: number }) => {
      if (onTripStatusUpdate) {
        onTripStatusUpdate(data);
      }
    });

    setSocket(newSocket);
  }, [token, tripId, vehicleId, onLocationUpdate, onVehicleUpdate, onTripStatusUpdate, reconnect, reconnectAttempts, reconnectDelay, socket]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      setSocket(null);
    }
    setConnected(false);
  }, [socket]);

  const sendLocation = useCallback((data: Omit<GPSPoint, 'timestamp'>) => {
    if (socket?.connected) {
      socket.emit('driver-location-update', {
        tripId: data.tripId || data.vehicleId,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        heading: data.heading,
        timestamp: new Date().toISOString(),
      });
    }
  }, [socket]);

  const joinTrip = useCallback((tripId: string) => {
    if (socket?.connected) {
      socket.emit('subscribe-trip', { tripId });
    }
  }, [socket]);

  const leaveTrip = useCallback((tripId: string) => {
    if (socket?.connected) {
      socket.emit('unsubscribe-trip', { tripId });
    }
  }, [socket]);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connected,
    socket,
    lastError,
    reconnectCount,
    connect,
    disconnect,
    sendLocation,
    joinTrip,
    leaveTrip,
  };
}

export default useGPS;