import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tripsApi } from '../../services/api';
import { Badge, EmptyState, LoadingState } from '../../components/ui';

export default function EmployeeScheduleScreen({ navigation }: any) {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');

  const loadTrips = async () => {
    try {
      const data = await tripsApi.getMyTrips();
      const list = Array.isArray(data) ? data : (data as any)?.data || (data as any)?.trips || [];
      setTrips(list);
    } catch (error) {
      console.error('Failed to load schedule:', error);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadTrips(); }, []);

  const filteredTrips = trips.filter((t) => {
    if (filter === 'completed') return t.status === 'COMPLETED';
    if (filter === 'cancelled') return t.status === 'CANCELLED';
    return ['SCHEDULED', 'DISPATCHED', 'DRIVER_ACCEPTED', 'EN_ROUTE_TO_PICKUP'].includes(t.status);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'danger';
      case 'IN_TRANSIT': return 'info';
      default: return 'warning';
    }
  };

  if (loading) return <LoadingState message="Loading schedule..." />;

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {(['upcoming', 'completed', 'cancelled'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filteredTrips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTrips(); }} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.tripCard} onPress={() => navigation.navigate('EmployeeTracking', { tripId: item.id })}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripCode}>{item.tripCode || item.code}</Text>
              <Badge label={item.status.replace(/_/g, ' ')} variant={getStatusColor(item.status) as any} />
            </View>
            <Text style={styles.tripRoute}>{item.pickupAddress || item.pickupLocation} → {item.dropAddress || item.dropLocation}</Text>
            <View style={styles.tripMeta}>
              <Ionicons name="time" size={14} color="#6B7280" />
              <Text style={styles.tripMetaText}>{item.scheduledTime || item.scheduledPickupTime || 'N/A'}</Text>
              {item.driverName && (
                <>
                  <Ionicons name="person" size={14} color="#6B7280" style={{ marginLeft: 12 }} />
                  <Text style={styles.tripMetaText}>{item.driverName}</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState title={`No ${filter} trips`} message="Your scheduled trips will appear here" icon="calendar-outline" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  filterRow: { flexDirection: 'row', padding: 16, gap: 8 },
  filterBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#2563EB' },
  filterText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#FFFFFF' },
  tripCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tripCode: { fontSize: 16, fontWeight: '700', color: '#111827' },
  tripRoute: { fontSize: 14, color: '#374151', marginBottom: 8 },
  tripMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tripMetaText: { fontSize: 12, color: '#6B7280' },
});
