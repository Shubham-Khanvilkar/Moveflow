import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tripsApi } from '../../services/api';
import { Badge, LoadingState } from '../../components/ui';
import { useGPS } from '../../hooks';

interface TripDetail {
  id: string;
  tripCode: string;
  status: string;
  pickupAddress: string;
  dropAddress: string;
  scheduledTime: string;
  driverName: string;
  driverPhone: string;
  vehicleReg: string;
  vehicleType: string;
  passengerCount: number;
  boardedCount: number;
  passengers: any[];
}

export default function DriverTripDetailsScreen({ navigation, route }: any) {
  const { tripId } = route?.params || {};
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { location, getCurrentLocation } = useGPS();

  const loadTrip = useCallback(async () => {
    if (!tripId) {
      setLoading(false);
      return;
    }
    try {
      const data = await tripsApi.get(tripId);
      setTrip(data);
    } catch (error) {
      console.error('Failed to load trip:', error);
    }
    setLoading(false);
    setRefreshing(false);
  }, [tripId]);

  React.useEffect(() => { loadTrip(); }, [loadTrip]);

  const updateStatus = async (action: string) => {
    if (!trip) return;
    try {
      await tripsApi.transition(trip.id, action);
      loadTrip();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update status');
    }
  };

  const getStatusActions = () => {
    if (!trip) return [];
    switch (trip.status) {
      case 'DISPATCHED':
        return [{ label: 'Accept Trip', action: 'DRIVER_ACCEPTED', color: '#10B981', icon: 'checkmark-circle' }];
      case 'DRIVER_ACCEPTED':
        return [{ label: 'Start En Route', action: 'EN_ROUTE_TO_PICKUP', color: '#8B5CF6', icon: 'navigate' }];
      case 'EN_ROUTE_TO_PICKUP':
        return [{ label: 'Mark Arrived', action: 'ARRIVED_AT_PICKUP', color: '#F59E0B', icon: 'location' }];
      case 'ARRIVED_AT_PICKUP':
        return [
          { label: 'Start Boarding', action: 'BOARDING', color: '#10B981', icon: 'people' },
          { label: 'No Show', action: 'NO_SHOW', color: '#EF4444', icon: 'close-circle' },
        ];
      case 'BOARDING':
        return [{ label: 'Start Trip', action: 'IN_TRANSIT', color: '#2563EB', icon: 'play' }];
      case 'IN_TRANSIT':
        return [{ label: 'Complete Trip', action: 'COMPLETED', color: '#10B981', icon: 'checkmark-done' }];
      default:
        return [];
    }
  };

  if (loading) return <LoadingState message="Loading trip details..." />;

  if (!trip) {
    return (
      <View style={styles.center}>
        <Ionicons name="car-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyText}>Select a trip to view details</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTrip(); }} />}
    >
      <View style={[styles.statusBanner, { backgroundColor: getStatusColor(trip.status) }]}>
        <Text style={styles.statusBannerText}>{trip.status.replace(/_/g, ' ')}</Text>
        <Text style={styles.tripCode}>{trip.tripCode}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Route</Text>
        <View style={styles.routeRow}>
          <View style={styles.routeDot}><Ionicons name="radio-button-on" size={12} color="#059669" /></View>
          <Text style={styles.routeText}>{trip.pickupAddress}</Text>
        </View>
        <View style={styles.routeConnector} />
        <View style={styles.routeRow}>
          <View style={styles.routeDot}><Ionicons name="radio-button-on" size={12} color="#EF4444" /></View>
          <Text style={styles.routeText}>{trip.dropAddress}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trip Info</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons name="time" size={20} color="#6B7280" />
            <Text style={styles.infoValue}>{trip.scheduledTime ? new Date(trip.scheduledTime).toLocaleTimeString() : 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="people" size={20} color="#6B7280" />
            <Text style={styles.infoValue}>{trip.boardedCount || 0}/{trip.passengerCount || 0}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="car" size={20} color="#6B7280" />
            <Text style={styles.infoValue}>{trip.vehicleReg || 'N/A'}</Text>
          </View>
        </View>
      </View>

      {trip.driverName && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Driver</Text>
          <View style={styles.driverRow}>
            <Text style={styles.driverName}>{trip.driverName}</Text>
            {trip.driverPhone && (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${trip.driverPhone}`)}>
                <Ionicons name="call" size={20} color="#2563EB" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        {getStatusActions().map((action, index) => (
          <TouchableOpacity key={index} style={[styles.actionBtn, { backgroundColor: action.color }]} onPress={() => updateStatus(action.action)}>
            <Ionicons name={action.icon as any} size={22} color="#FFF" />
            <Text style={styles.actionBtnText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => Linking.openURL('tel:112')}>
          <Ionicons name="alert-circle" size={22} color="#FFF" />
          <Text style={styles.actionBtnText}>SOS Emergency</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    DISPATCHED: '#8B5CF6', DRIVER_ACCEPTED: '#3B82F6', EN_ROUTE_TO_PICKUP: '#F59E0B',
    ARRIVED_AT_PICKUP: '#10B981', BOARDING: '#10B981', IN_TRANSIT: '#2563EB', COMPLETED: '#059669',
  };
  return colors[status] || '#6B7280';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12 },
  statusBanner: { padding: 20 },
  statusBannerText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  tripCode: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  section: { backgroundColor: '#FFF', margin: 16, marginTop: 0, padding: 16, borderRadius: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeDot: { width: 20, alignItems: 'center' },
  routeText: { flex: 1, fontSize: 14, color: '#374151' },
  routeConnector: { width: 2, height: 20, backgroundColor: '#D1D5DB', marginLeft: 9, marginVertical: 4 },
  infoGrid: { flexDirection: 'row', gap: 16 },
  infoItem: { flex: 1, alignItems: 'center', gap: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  driverRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  driverName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, gap: 8, marginBottom: 8 },
  actionBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
