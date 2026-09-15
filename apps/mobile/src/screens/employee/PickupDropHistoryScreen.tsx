import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { employeesApi } from '../../services/api';
import { Badge, EmptyState, LoadingState } from '../../components/ui';

export default function PickupDropHistoryScreen() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = async () => {
    try {
      const data = await employeesApi.getTripHistory();
      setHistory(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadHistory(); }, []);

  if (loading) return <LoadingState message="Loading history..." />;

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadHistory(); }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.date}>{new Date(item.date || item.createdAt).toLocaleDateString()}</Text>
              <Badge label={item.status} variant={item.status === 'COMPLETED' ? 'success' : 'neutral'} />
            </View>
            <View style={styles.route}>
              <Ionicons name="radio-button-on" size={12} color="#059669" />
              <Text style={styles.routeText}>{item.pickupAddress || item.pickupLocation}</Text>
            </View>
            <View style={styles.route}>
              <Ionicons name="radio-button-on" size={12} color="#EF4444" />
              <Text style={styles.routeText}>{item.dropAddress || item.dropLocation}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState title="No trip history" message="Your completed trips will appear here" icon="time-outline" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  date: { fontSize: 14, fontWeight: '600', color: '#111827' },
  route: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  routeText: { fontSize: 14, color: '#374151', flex: 1 },
});
