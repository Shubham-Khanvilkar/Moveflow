import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { tripsApi, gpsApi } from '../services/api';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://10.0.2.2:3001';
const { width } = Dimensions.get('window');

interface TripLocation {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  timestamp: string;
}

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

export default function TrackingScreen({ navigation, route }: any) {
  const { user, token } = useAuth();
  const [activeTrip, setActiveTrip] = useState<ActiveTrip | null>(null);
  const [driverLocation, setDriverLocation] = useState<TripLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const fetchActiveTrip = useCallback(async () => {
    try {
      setError(null);
      const response = await tripsApi.getMyTrips();
      
      let trips = Array.isArray(response) ? response : (response as any).data || (response as any).trips || [];
      
      const active = trips.find((t: any) => 
        ['DISPATCHED', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'IN_TRANSIT', 'ARRIVED_AT_DROP'].includes(t.status)
      );
      
      if (active) {
        setActiveTrip({
          id: active.id,
          tripCode: active.tripCode || active.code,
          status: active.status,
          pickupLocation: active.pickupAddress || active.pickupLocation,
          dropLocation: active.dropAddress || active.dropLocation,
          scheduledTime: active.scheduledTime || active.startTime,
          driverName: active.driverName,
          driverPhone: active.driverPhone,
          vehicleRegistration: active.vehicleRegistration || active.vehicle?.registrationNo,
          vehicleType: active.vehicleType || active.vehicle?.vehicleType,
          passengers: active.passengers || [],
          eta: active.etaMinutes,
          distance: active.distanceKm,
        });
      } else {
        setActiveTrip(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch active trip:', err);
      setError(err.message || 'Failed to load trip');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const connectSocket = useCallback(() => {
    if (!token || socketRef.current?.connected) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      setSocketConnected(true);
      
      if (activeTrip?.id) {
        socket.emit('join_trip', { tripId: activeTrip.id });
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setSocketConnected(false);
    });

    socket.on('trip_location_update', (data: TripLocation & { tripId: string }) => {
      if (activeTrip?.id && data.tripId === activeTrip.id) {
        setDriverLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          speed: data.speed,
          heading: data.heading,
          timestamp: data.timestamp || new Date().toISOString(),
        });
      }
    });

    socket.on('trip_status_update', (data: { tripId: string; status: string; eta?: number }) => {
      if (activeTrip?.id && data.tripId === activeTrip.id) {
        setActiveTrip(prev => prev ? { ...prev, status: data.status, eta: data.eta || prev.eta } : null);
      }
    });

    socket.on('connect_error', (err) => {
      console.log('Socket connection error:', err.message);
      setSocketConnected(false);
    });

    socketRef.current = socket;
  }, [token, activeTrip?.id]);

  useEffect(() => {
    fetchActiveTrip();
  }, [fetchActiveTrip]);

  useEffect(() => {
    connectSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connectSocket]);

  useEffect(() => {
    if (activeTrip && socketConnected && socketRef.current) {
      socketRef.current.emit('join_trip', { tripId: activeTrip.id });
    }
  }, [activeTrip, socketConnected]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveTrip();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DISPATCHED: '#3b82f6',
      DRIVER_ACCEPTED: '#3b82f6',
      EN_ROUTE_TO_PICKUP: '#f59e0b',
      ARRIVED_AT_PICKUP: '#10b981',
      IN_TRANSIT: '#1e40af',
      ARRIVED_AT_DROP: '#10b981',
      COMPLETED: '#6b7280',
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
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Loading your trip...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchActiveTrip}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!activeTrip) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Ionicons name="car-outline" size={64} color="#9ca3af" />
        <Text style={styles.emptyTitle}>No Active Trip</Text>
        <Text style={styles.emptyText}>You don't have any active trips right now.</Text>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => navigation.navigate('BookRide')}
        >
          <Text style={styles.bookButtonText}>Book a Ride</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={[styles.statusBar, { backgroundColor: getStatusColor(activeTrip.status) }]}>
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.statusLabel}>{getStatusLabel(activeTrip.status)}</Text>
            <Text style={styles.tripCode}>{activeTrip.tripCode}</Text>
          </View>
          <View style={styles.connectionStatus}>
            <View style={[styles.connectionDot, { backgroundColor: socketConnected ? '#10b981' : '#ef4444' }]} />
            <Text style={styles.connectionText}>{socketConnected ? 'Live' : 'Offline'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.mapPlaceholder}>
        <Ionicons name="map-outline" size={48} color="#9ca3af" />
        <Text style={styles.mapTitle}>Live Trip Map</Text>
        {driverLocation ? (
          <View style={styles.locationInfo}>
            <Text style={styles.locationText}>
              Driver at: {driverLocation.latitude.toFixed(4)}, {driverLocation.longitude.toFixed(4)}
            </Text>
            {driverLocation.speed ? (
              <Text style={styles.locationText}>Speed: {Math.round(driverLocation.speed)} km/h</Text>
            ) : null}
            <Text style={styles.locationTime}>
              Updated: {new Date(driverLocation.timestamp).toLocaleTimeString()}
            </Text>
          </View>
        ) : (
          <Text style={styles.mapSubtitle}>Waiting for driver location...</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.timelineRow}>
          <View style={styles.timelineIcon}>
            <Ionicons name="location" size={20} color="#1e40af" />
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.timelineLabel}>Pickup</Text>
            <Text style={styles.timelineAddress}>{activeTrip.pickupLocation}</Text>
          </View>
        </View>

        <View style={styles.timelineConnector} />

        <View style={styles.timelineRow}>
          <View style={styles.timelineIcon}>
            <Ionicons name="flag" size={20} color="#10b981" />
          </View>
          <View style={styles.timelineContent}>
            <Text style={styles.timelineLabel}>Drop</Text>
            <Text style={styles.timelineAddress}>{activeTrip.dropLocation}</Text>
          </View>
        </View>
      </View>

      {activeTrip.driverName && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver Details</Text>
          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Ionicons name="person" size={32} color="#1e40af" />
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{activeTrip.driverName}</Text>
              <Text style={styles.driverVehicle}>
                {activeTrip.vehicleRegistration} • {activeTrip.vehicleType}
              </Text>
            </View>
            {activeTrip.driverPhone && (
              <TouchableOpacity
                style={styles.callButton}
                onPress={() => Alert.alert('Call Driver', `Calling ${activeTrip.driverPhone}`)}
              >
                <Ionicons name="call" size={20} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {activeTrip.eta !== undefined && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{activeTrip.eta}</Text>
            <Text style={styles.statLabel}>min ETA</Text>
          </View>
          {activeTrip.distance !== undefined && (
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{activeTrip.distance.toFixed(1)}</Text>
              <Text style={styles.statLabel}>km away</Text>
            </View>
          )}
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {new Date(activeTrip.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.statLabel}>Scheduled</Text>
          </View>
        </View>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert('SOS', 'Emergency services have been notified.')}
        >
          <Ionicons name="alert-circle" size={20} color="#ef4444" />
          <Text style={[styles.actionText, { color: '#ef4444' }]}>SOS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => Alert.alert('Share Trip', 'Trip sharing link copied to clipboard.')}
        >
          <Ionicons name="share-social" size={20} color="#1e40af" />
          <Text style={styles.actionText}>Share Trip</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
  errorText: { marginTop: 12, fontSize: 14, color: '#ef4444', textAlign: 'center' },
  retryButton: { marginTop: 20, backgroundColor: '#1e40af', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: 'white', fontWeight: '600' },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, minHeight: 400 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8 },
  bookButton: { marginTop: 24, backgroundColor: '#1e40af', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 10 },
  bookButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  
  statusBar: { padding: 20, paddingTop: 50 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { fontSize: 18, fontWeight: '700', color: 'white' },
  tripCode: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  connectionStatus: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  connectionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  connectionText: { color: 'white', fontSize: 12, fontWeight: '600' },
  
  mapPlaceholder: { backgroundColor: '#e5e7eb', height: 200, justifyContent: 'center', alignItems: 'center', margin: 16, borderRadius: 12 },
  mapTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 8 },
  mapSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  locationInfo: { marginTop: 12, alignItems: 'center' },
  locationText: { fontSize: 13, color: '#374151' },
  locationTime: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  
  section: { backgroundColor: 'white', margin: 16, marginTop: 0, padding: 16, borderRadius: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  
  timelineRow: { flexDirection: 'row', alignItems: 'center' },
  timelineIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  timelineConnector: { width: 2, height: 24, backgroundColor: '#d1d5db', marginLeft: 17, marginVertical: 4 },
  timelineContent: { marginLeft: 12, flex: 1 },
  timelineLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  timelineAddress: { fontSize: 14, color: '#1e293b', marginTop: 2, fontWeight: '500' },
  
  driverCard: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  driverInfo: { flex: 1, marginLeft: 12 },
  driverName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  driverVehicle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  callButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  
  statsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 0, marginBottom: 16, gap: 12 },
  statBox: { flex: 1, backgroundColor: 'white', padding: 16, borderRadius: 12, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '700', color: '#1e40af' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 4, textTransform: 'uppercase' },
  
  actionsRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 24, gap: 12 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', padding: 14, borderRadius: 10, gap: 8 },
  actionText: { fontWeight: '600' },
});
