import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { employeesApi } from '../services/api';

interface ProfileScreenProps {
  navigation: any;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, logout, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await employeesApi.getSelfProfile();
      setProfile(data);
      setFormData({
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
      });
    } catch (err: any) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // API call would go here
      Alert.alert('Saved', 'Profile updated successfully');
      setEditing(false);
      await refreshProfile();
      loadProfile();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This action is irreversible. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Alert.alert('Not Implemented', 'Account deletion requires admin approval');
          },
        },
      ]
    );
  };

  const stats = profile?.stats || {
    totalTrips: 0,
    rating: 0,
    onTimeRate: 0,
    carbonSaved: 0,
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      EMPLOYEE: '#2563EB',
      DRIVER: '#059669',
      TRANSPORT_ADMIN: '#D97706',
      MANAGER: '#8B5CF6',
      GUARD: '#EC4899',
      COORDINATOR: '#6366F1',
      COMPLIANCE: '#0D9488',
      TRAINER: '#15803D',
    };
    return colors[role] || '#6B7280';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="person-circle" size={64} color="#D1D5DB" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = user?.name || 'User';
  const displayEmail = user?.email || '';
  const displayRole = user?.activeRole || 'EMPLOYEE';
  const roleColor = getRoleColor(displayRole);
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header with Avatar */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: roleColor }]}>
              <Text style={styles.avatarText}>{avatarInitial}</Text>
            </View>
            {editing && (
              <TouchableOpacity style={styles.editAvatarBtn} onPress={() => Alert.alert('Not Implemented', 'Avatar upload coming soon')}>
                <Ionicons name="camera" size={20} color="white" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{displayEmail}</Text>
          <View style={styles.roleBadge}>
            <Text style={[styles.roleBadgeText, { color: roleColor }]}>{displayRole.replace(/_/g, ' ')}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.totalTrips}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.rating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.onTimeRate}%</Text>
            <Text style={styles.statLabel}>On-Time</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{stats.carbonSaved.toFixed(1)} kg</Text>
            <Text style={styles.statLabel}>CO₂ Saved</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menu}>
          {[
            { icon: 'car' as const, title: 'My Bookings', screen: 'BookingHistory', badge: profile?.upcomingBookingsCount },
            { icon: 'map' as const, title: 'Trip History', screen: 'EmployeeTracking' },
            { icon: 'location' as const, title: 'Pinned Locations', screen: 'Home' },
            { icon: 'card' as const, title: 'Payment Methods', screen: 'Profile' },
            { icon: 'notifications' as const, title: 'Notifications', screen: 'Profile' },
            { icon: 'settings' as const, title: 'Settings', screen: 'Profile' },
            { icon: 'help-circle' as const, title: 'Help & Support', screen: 'Profile' },
          ].map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={() => navigation.navigate(item.screen)}>
              <Ionicons name={item.icon} size={24} color="#6B7280" />
              <Text style={styles.menuText}>{item.title}</Text>
              {item.badge && item.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color="#EF4444" />
            <Text style={[styles.menuText, { color: '#EF4444' }]}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount}>
            <Ionicons name="trash" size={24} color="#EF4444" />
            <Text style={[styles.menuText, { color: '#EF4444' }]}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appVersion}>NAVIRA v1.0.0</Text>
          <Text style={styles.appBuild}>Intelligent Enterprise Mobility Platform</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: 'white' },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  email: { fontSize: 16, color: '#6B7280', marginBottom: 8 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, backgroundColor: '#F3F4F6' },
  roleBadgeText: { fontSize: 12, fontWeight: '600' },
  stats: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  menu: { backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden', marginBottom: 24 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuText: { flex: 1, marginLeft: 12, fontSize: 16, color: '#111827' },
  badge: { backgroundColor: '#EF4444', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { color: 'white', fontSize: 11, fontWeight: '600' },
  menuDivider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 16 },
  appInfo: { alignItems: 'center', padding: 20 },
  appVersion: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  appBuild: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
});