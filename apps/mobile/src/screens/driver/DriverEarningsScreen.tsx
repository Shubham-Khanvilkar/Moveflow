import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DriverEarningsScreen({ navigation }: any) {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');

  const earnings = {
    today: { total: 125.50, trips: 5, distance: 45.2, hours: 6.5 },
    week: { total: 875.25, trips: 35, distance: 312.8, hours: 42 },
    month: { total: 3520.00, trips: 140, distance: 1250.5, hours: 168 },
  };

  const breakdown = [
    { date: 'Mon', trips: 6, earnings: 145.00 },
    { date: 'Tue', trips: 5, earnings: 125.50 },
    { date: 'Wed', trips: 7, earnings: 175.25 },
    { date: 'Thu', trips: 5, earnings: 130.00 },
    { date: 'Fri', trips: 6, earnings: 150.00 },
    { date: 'Sat', trips: 4, earnings: 95.00 },
    { date: 'Sun', trips: 2, earnings: 54.50 },
  ];

  const current = earnings[period];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['today', 'week', 'month'] as const).map(p => (
            <TouchableOpacity key={p} style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}>
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Earnings */}
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Total Earnings</Text>
          <Text style={styles.earningsValue}>${current.total.toFixed(2)}</Text>
          <View style={styles.earningsStats}>
            <View style={styles.earningsStat}>
              <Ionicons name="car" size={20} color="#2563EB" />
              <Text style={styles.earningsStatValue}>{current.trips}</Text>
              <Text style={styles.earningsStatLabel}>Trips</Text>
            </View>
            <View style={styles.earningsStat}>
              <Ionicons name="map" size={20} color="#059669" />
              <Text style={styles.earningsStatValue}>{current.distance}km</Text>
              <Text style={styles.earningsStatLabel}>Distance</Text>
            </View>
            <View style={styles.earningsStat}>
              <Ionicons name="time" size={20} color="#8B5CF6" />
              <Text style={styles.earningsStatValue}>{current.hours}h</Text>
              <Text style={styles.earningsStatLabel}>Hours</Text>
            </View>
          </View>
        </View>

        {/* Daily Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Breakdown</Text>
          {breakdown.map((day, i) => (
            <View key={i} style={styles.dayRow}>
              <Text style={styles.dayName}>{day.date}</Text>
              <Text style={styles.dayTrips}>{day.trips} trips</Text>
              <Text style={styles.dayEarnings}>${day.earnings.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="document-text" size={24} color="#2563EB" />
            <Text style={styles.actionText}>Payslips</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="trending-up" size={24} color="#059669" />
            <Text style={styles.actionText}>Analytics</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="wallet" size={24} color="#8B5CF6" />
            <Text style={styles.actionText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },
  periodSelector: { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 10, padding: 4, marginBottom: 16 },
  periodBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  periodBtnActive: { backgroundColor: '#FFF' },
  periodText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  periodTextActive: { color: '#111827' },
  earningsCard: { backgroundColor: '#059669', borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center' },
  earningsLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  earningsValue: { fontSize: 42, fontWeight: '800', color: '#FFF', marginVertical: 8 },
  earningsStats: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 16 },
  earningsStat: { alignItems: 'center' },
  earningsStatValue: { fontSize: 16, fontWeight: '700', color: '#FFF', marginTop: 4 },
  earningsStatLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dayName: { fontSize: 14, fontWeight: '600', color: '#374151', width: 50 },
  dayTrips: { fontSize: 14, color: '#6B7280', flex: 1, textAlign: 'center' },
  dayEarnings: { fontSize: 14, fontWeight: '700', color: '#059669', width: 80, textAlign: 'right' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  actionBtn: { flex: 1, alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginHorizontal: 4 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 8 },
});
