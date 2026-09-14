import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { tripsApi } from '../../services/api';

export default function GuardHomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [activeTrips, setActiveTrips] = useState<any[]>([]);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [stats, setStats] = useState({ monitored: 0, alerts: 0, boarded: 0 });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const data = await tripsApi.list({ status: 'IN_TRANSIT' });
      const trips = data?.data || [];
      setActiveTrips(trips);
      setStats({
        monitored: trips.length,
        alerts: 0,
        boarded: trips.reduce((sum: number, t: any) => sum + (t.boardedCount || 0), 0),
      });
    } catch (error) {
      console.error('Failed to load trips:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  };

  const toggleDuty = () => {
    setIsOnDuty(!isOnDuty);
    Alert.alert(
      isOnDuty ? 'Going Off-Duty' : 'Going On-Duty',
      isOnDuty ? 'You will stop monitoring trips.' : 'You are now monitoring active trips.',
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Guard: {user?.name?.split(' ')[0] || 'Security'}</Text>
          <Text style={styles.role}>Trip Monitoring & Safety</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Duty Toggle */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.dutyToggle, { backgroundColor: isOnDuty ? '#10b981' : '#e5e7eb' }]}
          onPress={toggleDuty}
        >
          <View style={[styles.dutyDot, { backgroundColor: isOnDuty ? 'white' : '#9ca3af' }]} />
          <Text style={[styles.dutyText, { color: isOnDuty ? 'white' : '#6b7280' }]}>
            {isOnDuty ? 'ON DUTY - MONITORING' : 'OFF DUTY'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monitoring Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.monitored}</Text>
            <Text style={styles.statLabel}>Active Trips</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.boarded}</Text>
            <Text style={styles.statLabel}>Boarded</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: stats.alerts > 0 ? '#ef4444' : '#10b981' }]}>{stats.alerts}</Text>
            <Text style={styles.statLabel}>Alerts</Text>
          </View>
        </View>
      </View>

      {/* Active Trips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Trips to Monitor</Text>
        {activeTrips.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🛡️</Text>
            <Text style={styles.emptyText}>No active trips to monitor</Text>
          </View>
        ) : (
          activeTrips.map((trip, index) => (
            <View key={index} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <Text style={styles.tripCode}>{trip.tripCode}</Text>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              </View>
              <Text style={styles.tripRoute}>
                {trip.pickupAddress} → {trip.dropAddress}
              </Text>
              <View style={styles.tripDetails}>
                <Text style={styles.tripDetail}>👥 {trip.passengerCount} passengers</Text>
                <Text style={styles.tripDetail}>✅ {trip.boardedCount || 0} boarded</Text>
                {trip.vehicle && <Text style={styles.tripDetail}>🚗 {trip.vehicle.registrationNo}</Text>}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('GuardDuty')}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionTitle}>Duty Log</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('QRScanner')}>
            <Text style={styles.actionIcon}>📱</Text>
            <Text style={styles.actionTitle}>Scan QR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: '#fef2f2' }]}
            onPress={() => Alert.alert('SOS Alert', 'Emergency alert sent to command center.')}
          >
            <Text style={styles.actionIcon}>🚨</Text>
            <Text style={[styles.actionTitle, { color: '#dc2626' }]}>SOS Alert</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => Alert.alert('Report', 'Incident report form coming soon.')}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionTitle}>Report</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#b45309' },
  greeting: { fontSize: 24, fontWeight: '700', color: 'white' },
  role: { fontSize: 14, color: '#fde68a', marginTop: 4 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: 'white', fontWeight: '600' },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  dutyToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8 },
  dutyDot: { width: 12, height: 12, borderRadius: 6 },
  dutyText: { fontSize: 16, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#b45309' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  emptyCard: { backgroundColor: 'white', borderRadius: 12, padding: 32, alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9ca3af', fontSize: 14 },
  tripCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tripCode: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10b981' },
  liveText: { fontSize: 10, fontWeight: '700', color: '#10b981' },
  tripRoute: { fontSize: 13, color: '#4b5563', marginBottom: 8 },
  tripDetails: { flexDirection: 'row', gap: 12 },
  tripDetail: { fontSize: 12, color: '#6b7280' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: '47%', backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  actionIcon: { fontSize: 32, marginBottom: 8 },
  actionTitle: { fontSize: 13, fontWeight: '600', color: '#374151' },
});
