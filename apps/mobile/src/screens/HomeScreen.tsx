import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { employeesApi } from '../services/api';

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { user, logout, switchRole, refreshProfile } = useAuth();
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [currentRole, setCurrentRole] = useState(user?.activeRole || 'EMPLOYEE');
  const [pinnedLocations, setPinnedLocations] = useState<any[]>([]);
  const [carbonData, setCarbonData] = useState({ footprint: 0, comparison: 0 });

  useEffect(() => {
    loadPinnedLocations();
    loadCarbonData();
  }, []);

  const loadPinnedLocations = async () => {
    try {
      const profile = await employeesApi.getSelfProfile();
      if (profile?.pinnedLocations) {
        setPinnedLocations(profile.pinnedLocations);
      }
    } catch (e) {
      console.log('Failed to load pinned locations');
    }
  };

  const loadCarbonData = async () => {
    try {
      const profile = await employeesApi.getSelfProfile();
      if (profile?.carbonFootprint) {
        setCarbonData({ footprint: profile.carbonFootprint, comparison: profile.carbonComparison || 0 });
      }
    } catch (e) {
      console.log('Failed to load carbon data');
    }
  };

  const roles = [
    { id: 'EMPLOYEE', name: 'Employee', icon: 'person' as const, color: '#2563EB' },
    { id: 'DRIVER', name: 'Driver', icon: 'car' as const, color: '#059669' },
    { id: 'TRANSPORT_ADMIN', name: 'Transport Admin', icon: 'shield' as const, color: '#D97706' },
    { id: 'MANAGER', name: 'Manager', icon: 'people' as const, color: '#8B5CF6' },
    { id: 'GUARD', name: 'Safety Guard', icon: 'shield-checkmark' as const, color: '#EC4899' },
    { id: 'COORDINATOR', name: 'Coordinator', icon: 'send' as const, color: '#6366F1' },
    { id: 'COMPLIANCE', name: 'Compliance', icon: 'checkmark-circle' as const, color: '#0D9488' },
  ];

  const employeeFeatures = [
    { id: '1', title: 'Book a Ride', description: 'Schedule your commute', icon: 'car' as const, color: '#2563EB', screen: 'BookRide' },
    { id: '2', title: 'Live Tracking', description: 'Track your ride real-time', icon: 'location' as const, color: '#059669', screen: 'EmployeeTracking' },
    { id: '3', title: 'Workplace', description: 'Desks & Rooms', icon: 'business' as const, color: '#8B5CF6', screen: 'Workplace' },
    { id: '4', title: 'Sustainability', description: 'Carbon tracking', icon: 'leaf' as const, color: '#059669', screen: 'Sustainability' },
  ];

  const handleRoleSwitch = (roleId: string) => {
    setCurrentRole(roleId);
    switchRole(roleId);
    setShowRoleModal(false);
    
    switch (roleId) {
      case 'DRIVER':
        navigation.navigate('DriverHome');
        break;
      case 'TRANSPORT_ADMIN':
        navigation.navigate('AdminDashboard');
        break;
      case 'MANAGER':
        navigation.navigate('SupervisorDashboard');
        break;
      case 'GUARD':
        navigation.navigate('GuardHome');
        break;
      case 'COORDINATOR':
        navigation.navigate('CoordinatorDashboard');
        break;
      default:
        break;
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
<View>
          <Text style={styles.greeting}>Welcome to NAVIRA! 👋</Text>
          <Text style={styles.subtitle}>Intelligent Enterprise Mobility</Text>
        </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.roleBtn} onPress={() => setShowRoleModal(true)}>
              <Ionicons name="swap-horizontal" size={18} color="#2563EB" />
              <Text style={styles.roleBtnText}>Switch Role</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Current Role Banner */}
        <View style={[styles.roleBanner, { backgroundColor: roles.find(r => r.id === currentRole)?.color + '20' }]}>
          <Ionicons name={roles.find(r => r.id === currentRole)?.icon || 'person'} size={24} color={roles.find(r => r.id === currentRole)?.color || '#2563EB'} />
          <View style={styles.roleInfo}>
            <Text style={styles.roleLabel}>Current View</Text>
            <Text style={styles.roleName}>{roles.find(r => r.id === currentRole)?.name}</Text>
          </View>
          <TouchableOpacity onPress={() => setShowRoleModal(true)}>
            <Text style={styles.changeRoleText}>Change →</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.quickAction, { backgroundColor: '#EFF6FF' }]} onPress={() => navigation.navigate('BookRide')}>
            <Ionicons name="car" size={32} color="#2563EB" />
            <Text style={styles.quickActionText}>Quick Book</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickAction, { backgroundColor: '#ECFDF5' }]} onPress={() => navigation.navigate('EmployeeTracking')}>
            <Ionicons name="map" size={32} color="#059669" />
            <Text style={styles.quickActionText}>Track</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.quickAction, { backgroundColor: '#F5F3FF' }]} onPress={() => navigation.navigate('Workplace')}>
            <Ionicons name="briefcase" size={32} color="#8B5CF6" />
            <Text style={styles.quickActionText}>Desk</Text>
          </TouchableOpacity>
        </View>

        {/* Employee Features */}
        {['EMPLOYEE', 'TRAINER'].includes(currentRole) && (
          <>
            <Text style={styles.sectionTitle}>Features</Text>
            <View style={styles.featuresGrid}>
              {employeeFeatures.map((feature) => (
                <TouchableOpacity key={feature.id} style={styles.featureCard} onPress={() => navigation.navigate(feature.screen)}>
                  <View style={[styles.iconContainer, { backgroundColor: feature.color + '20' }]}>
                    <Ionicons name={feature.icon} size={28} color={feature.color} />
                  </View>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Safety Features */}
            <Text style={styles.sectionTitle}>Safety Features</Text>
<View style={styles.safetyCard}>
              <View style={styles.safetyItem}>
                <Ionicons name="shield-checkmark" size={24} color="#059669" />
                <View style={styles.safetyInfo}>
                  <Text style={styles.safetyTitle}>Female Safety Guard</Text>
                  <Text style={styles.safetyDesc}>Automatic guard assignment for late-night trips</Text>
                </View>
              </View>
              <View style={styles.safetyItem}>
                <Ionicons name="map" size={24} color="#2563EB" />
                <View style={styles.safetyInfo}>
                  <Text style={styles.safetyTitle}>Safe Routes</Text>
                  <Text style={styles.safetyDesc}>Well-lit, CCTV covered, police patrolled routes</Text>
                </View>
              </View>
              <View style={styles.safetyItem}>
                <Ionicons name="alert-circle" size={24} color="#EF4444" />
                <View style={styles.safetyInfo}>
                  <Text style={styles.safetyTitle}>SOS Alert</Text>
                  <Text style={styles.safetyDesc}>One-tap emergency alert to security team</Text>
                </View>
              </View>
              <View style={styles.safetyItem}>
                <Ionicons name="location" size={24} color="#8B5CF6" />
                <View style={styles.safetyInfo}>
                  <Text style={styles.safetyTitle}>Live Location Sharing</Text>
                  <Text style={styles.safetyDesc}>Share real-time location with emergency contacts</Text>
                </View>
              </View>
            </View>

            {/* Pinned Locations */}
            <Text style={styles.sectionTitle}>Your Pinned Locations</Text>
            <View style={styles.pinnedCard}>
              {pinnedLocations.length > 0 ? (
                pinnedLocations.map((pin, index) => (
                  <View key={index} style={styles.pinItem}>
                    <View style={[styles.pinIcon, { backgroundColor: pin.color || '#2563EB' }]}>
                      <Ionicons name={pin.icon || 'home'} size={16} color="#FFF" />
                    </View>
                    <View style={styles.pinInfo}>
                      <Text style={styles.pinName}>{pin.name}</Text>
                      <Text style={styles.pinAddress}>{pin.address}</Text>
                    </View>
                    <TouchableOpacity>
                      <Ionicons name="navigate" size={20} color="#2563EB" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <>
                  <View style={styles.pinItem}>
                    <View style={[styles.pinIcon, { backgroundColor: '#2563EB' }]}>
                      <Ionicons name="home" size={16} color="#FFF" />
                    </View>
                    <View style={styles.pinInfo}>
                      <Text style={styles.pinName}>Home</Text>
                      <Text style={styles.pinAddress}>Set your home location</Text>
                    </View>
                  </View>
                  <View style={styles.pinItem}>
                    <View style={[styles.pinIcon, { backgroundColor: '#8B5CF6' }]}>
                      <Ionicons name="briefcase" size={16} color="#FFF" />
                    </View>
                    <View style={styles.pinInfo}>
                      <Text style={styles.pinName}>Office</Text>
                      <Text style={styles.pinAddress}>Set your workplace</Text>
                    </View>
                  </View>
                </>
              )}
              <TouchableOpacity style={styles.addPinBtn}>
                <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
                <Text style={styles.addPinText}>Add New Pin</Text>
              </TouchableOpacity>
            </View>

            {/* Carbon Footprint Card */}
            <View style={styles.carbonCard}>
              <View style={styles.carbonHeader}>
                <Ionicons name="leaf" size={24} color="#059669" />
                <Text style={styles.carbonTitle}>Your Carbon Footprint</Text>
              </View>
              <Text style={styles.carbonValue}>{carbonData.footprint.toFixed(1)} kg CO₂</Text>
              <Text style={styles.carbonComparison}>{carbonData.comparison >= 0 ? '↓' : '↑'} {Math.abs(carbonData.comparison).toFixed(0)}% {'vs average'}</Text>
              <View style={styles.carbonBar}>
                <View style={[styles.carbonProgress, { width: '65%' }]} />
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Role Switch Modal */}
      <Modal visible={showRoleModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Switch Role</Text>
              <TouchableOpacity onPress={() => setShowRoleModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Select your role to access different dashboards</Text>
            
            {roles.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[styles.roleItem, currentRole === role.id && styles.roleItemActive]}
                onPress={() => handleRoleSwitch(role.id)}
              >
                <View style={[styles.roleIcon, { backgroundColor: role.color + '20' }]}>
                  <Ionicons name={role.icon} size={24} color={role.color} />
                </View>
                <View style={styles.roleItemInfo}>
                  <Text style={styles.roleItemName}>{role.name}</Text>
                  <Text style={styles.roleItemDesc}>
                    {role.id === 'EMPLOYEE' && 'Book rides, track trips, manage commute'}
                    {role.id === 'DRIVER' && 'Accept trips, manage schedule, track earnings'}
                    {role.id === 'TRANSPORT_ADMIN' && 'Manage fleet, approve requests, ad-hoc bookings'}
                    {role.id === 'MANAGER' && 'Assign transport for team, manage approvals'}
                    {role.id === 'GUARD' && 'Guard duties, employee safety, tracking'}
                    {role.id === 'COORDINATOR' && 'Dispatch trips, manage drivers, live ops'}
                    {role.id === 'COMPLIANCE' && 'Policy adherence, violations, regulatory compliance'}
                  </Text>
                </View>
                {currentRole === role.id && <Ionicons name="checkmark-circle" size={24} color={role.color} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  roleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  roleBtnText: { fontSize: 14, fontWeight: '600', color: '#2563EB', marginLeft: 6 },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  roleBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 20 },
  roleInfo: { flex: 1, marginLeft: 12 },
  roleLabel: { fontSize: 12, color: '#6B7280' },
  roleName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  changeRoleText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  quickAction: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 12, marginHorizontal: 4 },
  quickActionText: { marginTop: 8, fontSize: 12, fontWeight: '600', color: '#374151' },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  featureCard: { width: '48%', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  iconContainer: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  featureTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  featureDescription: { fontSize: 14, color: '#6B7280' },
  safetyCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 24 },
  safetyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  safetyInfo: { flex: 1, marginLeft: 12 },
  safetyTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  safetyDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  pinnedCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 24 },
  pinItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pinIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pinInfo: { flex: 1, marginLeft: 12 },
  pinName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  pinAddress: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  addPinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  addPinText: { color: '#2563EB', fontWeight: '600', marginLeft: 8 },
  carbonCard: { backgroundColor: '#ECFDF5', borderRadius: 12, padding: 16, marginBottom: 24 },
  carbonHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  carbonTitle: { fontSize: 16, fontWeight: '600', color: '#065F46', marginLeft: 8 },
  carbonValue: { fontSize: 32, fontWeight: 'bold', color: '#059669', marginBottom: 4 },
  carbonComparison: { fontSize: 14, color: '#059669', marginBottom: 12 },
  carbonBar: { height: 8, backgroundColor: '#D1FAE5', borderRadius: 4, overflow: 'hidden' },
  carbonProgress: { height: '100%', backgroundColor: '#059669', borderRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  roleItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, backgroundColor: '#F9FAFB' },
  roleItemActive: { backgroundColor: '#EFF6FF', borderWidth: 2, borderColor: '#2563EB' },
  roleIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  roleItemInfo: { flex: 1, marginLeft: 12 },
  roleItemName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  roleItemDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
