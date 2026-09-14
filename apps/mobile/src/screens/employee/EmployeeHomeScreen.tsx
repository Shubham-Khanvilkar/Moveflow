import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { bookingsApi, dashboardApi } from '../../services/api';

export default function EmployeeHomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardData, bookingsData] = await Promise.all([
        dashboardApi.getSummary().catch(() => null),
        bookingsApi.list({ limit: 5 }).catch(() => ({ data: [] })),
      ]);
      setStats(dashboardData);
      setRecentBookings(bookingsData?.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const quickActions = [
    { title: 'Book Transport', icon: '🚗', route: 'BookRide' },
    { title: 'My Trips', icon: '🗺️', route: 'BookingHistory' },
    { title: 'Track Live', icon: '📍', route: 'Tracking' },
    { title: 'Expenses', icon: '💰', route: 'Expenses' },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Employee'}</Text>
          <Text style={styles.company}>{user?.company?.name || 'Company'}</Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={() => navigation.navigate(action.route)}
            >
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.trips?.active || 0}</Text>
              <Text style={styles.statLabel}>Active Trips</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.approvals?.pending || 0}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.trips?.completed || 0}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </View>
      )}

      {/* Recent Bookings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Bookings</Text>
        {recentBookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No recent bookings</Text>
          </View>
        ) : (
          recentBookings.map((booking, index) => (
            <View key={index} style={styles.bookingCard}>
              <View style={styles.bookingHeader}>
                <Text style={styles.bookingCode}>{booking.bookingCode}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                  <Text style={styles.statusText}>{booking.status}</Text>
                </View>
              </View>
              <Text style={styles.bookingRoute}>
                {booking.pickupAddress} → {booking.dropAddress}
              </Text>
              <Text style={styles.bookingDate}>
                {new Date(booking.date).toLocaleDateString()} • {booking.serviceType}
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Carbon Footprint */}
      <View style={styles.section}>
        <View style={styles.greenCard}>
          <Text style={styles.greenTitle}>🌱 Your Green Impact</Text>
          <Text style={styles.greenStat}>127 kg CO₂ saved this month</Text>
          <Text style={styles.greenSub}>by choosing shared transport</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'APPROVED': return '#10b981';
    case 'REQUESTED': return '#f59e0b';
    case 'REJECTED': return '#ef4444';
    case 'COMPLETED': return '#6366f1';
    default: return '#6b7280';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#1e40af' },
  greeting: { fontSize: 24, fontWeight: '700', color: 'white' },
  company: { fontSize: 14, color: '#93c5fd', marginTop: 4 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: 'white', fontWeight: '600' },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: { width: '47%', backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  actionIcon: { fontSize: 32, marginBottom: 8 },
  actionTitle: { fontSize: 13, fontWeight: '600', color: '#374151' },
  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  statValue: { fontSize: 28, fontWeight: '800', color: '#1e40af' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  emptyCard: { backgroundColor: 'white', borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyText: { color: '#9ca3af', fontSize: 14 },
  bookingCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  bookingCode: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600', color: 'white' },
  bookingRoute: { fontSize: 13, color: '#4b5563', marginBottom: 4 },
  bookingDate: { fontSize: 12, color: '#9ca3af' },
  greenCard: { backgroundColor: '#dcfce7', borderRadius: 12, padding: 20 },
  greenTitle: { fontSize: 16, fontWeight: '700', color: '#166534', marginBottom: 8 },
  greenStat: { fontSize: 24, fontWeight: '800', color: '#15803d' },
  greenSub: { fontSize: 13, color: '#16a34a', marginTop: 4 },
});
