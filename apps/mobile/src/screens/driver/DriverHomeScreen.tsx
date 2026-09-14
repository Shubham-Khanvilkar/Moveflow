import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { tripsApi } from '../../services/api';

export default function DriverHomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [todayTrips, setTodayTrips] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [stats, setStats] = useState({ completed: 0, pending: 0, earnings: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const data = await tripsApi.list({ date: new Date().toISOString().split('T')[0] });
      const trips = data?.data || [];
      setTodayTrips(trips);
      setStats({
        completed: trips.filter((t: any) => t.status === 'COMPLETED').length,
        pending: trips.filter((t: any) => ['SCHEDULED', 'DISPATCHED'].includes(t.status)).length,
        earnings: trips.filter((t: any) => t.status === 'COMPLETED').reduce((sum: number, t: any) => sum + (t.actualCost || 0), 0),
      });
    } catch (error) {
      console.error('Failed to load trips:', error);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTrips();
    setRefreshing(false);
  };

  const toggleOnline = () => {
    setIsOnline(!isOnline);
    Alert.alert(
      isOnline ? 'Going Off-Duty' : 'Going On-Duty',
      isOnline ? 'You will not receive new trip requests.' : 'You are now available for trips.',
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '#10b981';
      case 'IN_TRANSIT': return '#3b82f6';
      case 'SCHEDULED': return '#f59e0b';
      case 'DISPATCHED': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Driver'}</Text>
          <Text style={styles.role}>Driver</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Online Toggle */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.onlineToggle, { backgroundColor: isOnline ? '#10b981' : '#e5e7eb' }]}
          onPress={toggleOnline}
        >
          <View style={[styles.onlineDot, { backgroundColor: isOnline ? 'white' : '#9ca3af' }]} />
          <Text style={[styles.onlineText, { color: isOnline ? 'white' : '#6b7280' }]}>
            {isOnline ? 'ON DUTY' : 'OFF DUTY'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{stats.earnings.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
        </View>
      </View>

      {/* Today's Trips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Trips</Text>
        {todayTrips.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🚗</Text>
            <Text style={styles.emptyText}>No trips scheduled today</Text>
          </View>
        ) : (
          todayTrips.map((trip, index) => (
            <TouchableOpacity
              key={index}
              style={styles.tripCard}
              onPress={() => navigation.navigate('TripDetails', { tripId: trip.id })}
            >
              <View style={styles.tripHeader}>
                <Text style={styles.tripCode}>{trip.tripCode}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
                  <Text style={styles.statusText}>{trip.status}</Text>
                </View>
              </View>
              <Text style={styles.tripRoute}>
                {trip.pickupAddress} → {trip.dropAddress}
              </Text>
              <View style={styles.tripDetails}>
                <Text style={styles.tripDetail}>🕐 {new Date(trip.scheduledPickupTime).toLocaleTimeString()}</Text>
                <Text style={styles.tripDetail}>👥 {trip.passengerCount} passengers</Text>
                {trip.distanceKm && <Text style={styles.tripDetail}>📍 {trip.distanceKm.toFixed(1)} km</Text>}
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Navigation')}>
            <Text style={styles.actionIcon}>🧭</Text>
            <Text style={styles.actionTitle}>Navigation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Passengers')}>
            <Text style={styles.actionIcon}>👥</Text>
            <Text style={styles.actionTitle}>Passengers</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Boarding')}>
            <Text style={styles.actionIcon}>✅</Text>
            <Text style={styles.actionTitle}>Boarding</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('SOS')}>
            <Text style={styles.actionIcon}>🚨</Text>
            <Text style={styles.actionTitle}>SOS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#d97706' },
  greeting: { fontSize: 24, fontWeight: '700', color: 'white' },
  role: { fontSize: 14, color: '#fde68a', marginTop: 4 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: 'white', fontWeight: '600' },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  onlineToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8 },
  onlineDot: { width: 12, height: 12, borderRadius: 6 },
  onlineText: { fontSize: 16, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#d97706' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  emptyCard: { backgroundColor: 'white', borderRadius: 12, padding: 32, alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#9ca3af', fontSize: 14 },
  tripCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tripCode: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600', color: 'white' },
  tripRoute: { fontSize: 13, color: '#4b5563', marginBottom: 8 },
  tripDetails: { flexDirection: 'row', gap: 12 },
  tripDetail: { fontSize: 12, color: '#6b7280' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: '47%', backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  actionIcon: { fontSize: 32, marginBottom: 8 },
  actionTitle: { fontSize: 13, fontWeight: '600', color: '#374151' },
});
