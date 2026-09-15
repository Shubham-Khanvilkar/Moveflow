import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function DriverEarningsScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [earnings, setEarnings] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    totalTrips: 0,
    avgRating: 0,
  });

  const loadEarnings = async () => {
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadEarnings} />}
      contentContainerStyle={{ padding: 16 }}
    >
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>This Month</Text>
        <Text style={styles.summaryAmount}>₹{earnings.thisMonth.toLocaleString()}</Text>
        <Text style={styles.summarySub}>{earnings.totalTrips} trips completed</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Ionicons name="today" size={24} color="#2563EB" />
          <Text style={styles.statValue}>₹{earnings.today}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="calendar" size={24} color="#059669" />
          <Text style={styles.statValue}>₹{earnings.thisWeek}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="star" size={24} color="#F59E0B" />
          <Text style={styles.statValue}>{earnings.avgRating.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Earnings</Text>
        {[].map((item: any, index: number) => (
          <View key={index} style={styles.earningItem}>
            <View>
              <Text style={styles.earningTrip}>{item.tripCode}</Text>
              <Text style={styles.earningDate}>{item.date}</Text>
            </View>
            <Text style={styles.earningAmount}>₹{item.amount}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  summaryCard: { backgroundColor: '#D97706', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16 },
  summaryTitle: { fontSize: 14, color: '#FDE68A' },
  summaryAmount: { fontSize: 40, fontWeight: '800', color: '#FFF', marginTop: 8 },
  summarySub: { fontSize: 14, color: '#FDE68A', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  section: { backgroundColor: '#FFF', borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  earningItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  earningTrip: { fontSize: 14, fontWeight: '600', color: '#111827' },
  earningDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  earningAmount: { fontSize: 16, fontWeight: '700', color: '#059669' },
});
