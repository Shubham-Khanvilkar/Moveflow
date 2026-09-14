import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, TextInput, Modal, Alert, FlatList, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboardScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showAdhocModal, setShowAdhocModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const [stats] = useState({
    totalBookings: 156,
    activeVehicles: 42,
    pendingRequests: 12,
    todayTrips: 89,
    femaleGuardTrips: 23,
    adhocRequests: 8,
  });

  const [pendingApprovals, setPendingApprovals] = useState([
    { id: '1', employee: 'Priya Sharma', team: 'Engineering', pickup: 'HSR Layout', dropoff: 'Office', time: '8:30 AM', type: 'Individual', requiresGuard: true },
    { id: '2', employee: 'Rahul Kumar', team: 'Marketing', pickup: 'Koramangala', dropoff: 'Office', time: '9:00 AM', type: 'Individual', requiresGuard: false },
    { id: '3', employee: 'Team Alpha (5)', team: 'Sales', pickup: 'Whitefield', dropoff: 'Office', time: '8:45 AM', type: 'Team', requiresGuard: false },
  ]);

  const [adhocRequests, setAdhocRequests] = useState([
    { id: '1', employee: 'Sneha Patel', reason: 'Client meeting at downtown', pickup: 'Office', dropoff: 'Taj Hotel', time: '2:00 PM', status: 'Pending' },
    { id: '2', employee: 'Amit Singh', reason: 'Airport pickup for director', pickup: 'Airport', dropoff: 'Office', time: '5:00 PM', status: 'Approved' },
  ]);

  const [shuttles, setShuttles] = useState([
    { id: '1', name: 'Route A - Tech Park', plateNumber: 'KA-01-AB-1234', capacity: 25, currentPassengers: 18, status: 'In Transit', driver: 'Ramesh' },
    { id: '2', name: 'Route B - Metro', plateNumber: 'KA-01-CD-5678', capacity: 20, currentPassengers: 12, status: 'At Pickup', driver: 'Suresh' },
    { id: '3', name: 'Route C - Residential', plateNumber: 'KA-01-EF-9012', capacity: 30, currentPassengers: 0, status: 'Available', driver: 'Kumar' },
  ]);

  const [guards, setGuards] = useState([
    { id: '1', name: 'Vikram Singh', status: 'On Duty', assignedTo: 'Priya Sharma', location: 'HSR Layout', since: '8:15 AM' },
    { id: '2', name: 'Arjun Reddy', status: 'Available', assignedTo: null, location: 'Office', since: null },
    { id: '3', name: 'Deepak Kumar', status: 'En Route', assignedTo: 'Kavita Nair', location: 'Koramangala', since: '8:30 AM' },
  ]);

  const [newAdhoc, setNewAdhoc] = useState({
    employee: '',
    pickup: '',
    dropoff: '',
    time: '',
    reason: '',
    requiresGuard: false,
  });

  const handleApproveRequest = (id: string) => {
    setPendingApprovals(prev => prev.filter(r => r.id !== id));
    Alert.alert('Approved', 'Transport request has been approved and assigned');
  };

  const handleRejectRequest = (id: string) => {
    setPendingApprovals(prev => prev.filter(r => r.id !== id));
    Alert.alert('Rejected', 'Transport request has been rejected');
  };

  const handleCreateAdhoc = () => {
    Alert.alert('Ad-hoc Request Created', 'Driver will be notified');
    setShowAdhocModal(false);
    setNewAdhoc({ employee: '', pickup: '', dropoff: '', time: '', reason: '', requiresGuard: false });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'grid' as const },
    { id: 'shuttles', label: 'Shuttles', icon: 'bus' as const },
    { id: 'guards', label: 'Guards', icon: 'shield-checkmark' as const },
    { id: 'team', label: 'Team', icon: 'people' as const },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Navigation */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons name={tab.icon} size={18} color={activeTab === tab.id ? '#2563EB' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="car" size={24} color="#2563EB" />
                <Text style={styles.statValue}>{stats.todayTrips}</Text>
                <Text style={styles.statLabel}>Today's Trips</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="time" size={24} color="#D97706" />
                <Text style={styles.statValue}>{stats.pendingRequests}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="shield-checkmark" size={24} color="#059669" />
                <Text style={styles.statValue}>{stats.femaleGuardTrips}</Text>
                <Text style={styles.statLabel}>Guard Trips</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="flash" size={24} color="#EF4444" />
                <Text style={styles.statValue}>{stats.adhocRequests}</Text>
                <Text style={styles.statLabel}>Ad-hoc</Text>
              </View>
            </View>

            {/* Pending Approvals */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>Pending Approvals</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdhocModal(true)}>
                  <Ionicons name="add-circle" size={24} color="#2563EB" />
                  <Text style={styles.addBtnText}>Add Ad-hoc</Text>
                </TouchableOpacity>
              </View>
              {pendingApprovals.map((req) => (
                <View key={req.id} style={styles.requestItem}>
                  <View style={styles.requestInfo}>
                    <View style={styles.requestHeader}>
                      <Text style={styles.requestName}>{req.employee}</Text>
                      {req.requiresGuard && (
                        <View style={styles.guardBadge}>
                          <Ionicons name="shield-checkmark" size={12} color="#059669" />
                          <Text style={styles.guardBadgeText}>Guard</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.requestMeta}>{req.team} • {req.type}</Text>
                    <Text style={styles.requestRoute}>{req.pickup} → {req.dropoff}</Text>
                    <Text style={styles.requestTime}>{req.time}</Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleApproveRequest(req.id)}>
                      <Ionicons name="checkmark" size={18} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectRequest(req.id)}>
                      <Ionicons name="close" size={18} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Ad-hoc Requests */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Ad-hoc Requests</Text>
              {adhocRequests.map((req) => (
                <View key={req.id} style={styles.adhocItem}>
                  <View style={styles.adhocInfo}>
                    <Text style={styles.requestName}>{req.employee}</Text>
                    <Text style={styles.adhocReason}>{req.reason}</Text>
                    <Text style={styles.requestRoute}>{req.pickup} → {req.dropoff} • {req.time}</Text>
                  </View>
                  <View style={[styles.statusBadge, req.status === 'Pending' ? styles.statusPending : styles.statusApproved]}>
                    <Text style={styles.statusText}>{req.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* SHUTTLES TAB */}
        {activeTab === 'shuttles' && (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.sectionTitle}>Shuttle Fleet</Text>
                <TouchableOpacity style={styles.addBtn}>
                  <Ionicons name="add-circle" size={24} color="#2563EB" />
                  <Text style={styles.addBtnText}>Add Shuttle</Text>
                </TouchableOpacity>
              </View>
              {shuttles.map((shuttle) => (
                <View key={shuttle.id} style={styles.shuttleItem}>
                  <View style={styles.shuttleHeader}>
                    <View>
                      <Text style={styles.shuttleName}>{shuttle.name}</Text>
                      <Text style={styles.shuttlePlate}>{shuttle.plateNumber}</Text>
                    </View>
                    <View style={[
                      styles.shuttleStatus,
                      shuttle.status === 'In Transit' ? styles.statusInTransit :
                      shuttle.status === 'At Pickup' ? styles.statusAtPickup : styles.statusAvailable
                    ]}>
                      <Text style={styles.shuttleStatusText}>{shuttle.status}</Text>
                    </View>
                  </View>
                  <View style={styles.shuttleDetails}>
                    <View style={styles.shuttleDetail}>
                      <Ionicons name="people" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>{shuttle.currentPassengers}/{shuttle.capacity}</Text>
                    </View>
                    <View style={styles.shuttleDetail}>
                      <Ionicons name="person" size={16} color="#6B7280" />
                      <Text style={styles.detailText}>{shuttle.driver}</Text>
                    </View>
                    <TouchableOpacity style={styles.trackBtn}>
                      <Ionicons name="location" size={16} color="#2563EB" />
                      <Text style={styles.trackBtnText}>Track</Text>
                    </TouchableOpacity>
                  </View>
                  {/* Capacity Bar */}
                  <View style={styles.capacityBar}>
                    <View style={[styles.capacityFill, { width: `${(shuttle.currentPassengers / shuttle.capacity) * 100}%` }]} />
                  </View>
                </View>
              ))}
            </View>

            {/* Shuttle Routes */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Active Routes</Text>
              <View style={styles.routeItem}>
                <Ionicons name="map" size={20} color="#2563EB" />
                <View style={styles.routeInfo}>
                  <Text style={styles.routeName}>Route A - Tech Park</Text>
                  <Text style={styles.routeStops}>5 stops • 12.5 km</Text>
                </View>
                <Text style={styles.routeEta}>ETA: 8 min</Text>
              </View>
              <View style={styles.routeItem}>
                <Ionicons name="map" size={20} color="#059669" />
                <View style={styles.routeInfo}>
                  <Text style={styles.routeName}>Route B - Metro Station</Text>
                  <Text style={styles.routeStops}>3 stops • 8.2 km</Text>
                </View>
                <Text style={styles.routeEta}>ETA: 15 min</Text>
              </View>
            </View>
          </>
        )}

        {/* GUARDS TAB */}
        {activeTab === 'guards' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>Safety Guards</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAssignModal(true)}>
                <Ionicons name="add-circle" size={24} color="#2563EB" />
                <Text style={styles.addBtnText}>Assign Guard</Text>
              </TouchableOpacity>
            </View>
            
            {/* Guard Stats */}
            <View style={styles.guardStats}>
              <View style={styles.guardStat}>
                <Text style={styles.guardStatValue}>{guards.filter(g => g.status === 'On Duty' || g.status === 'En Route').length}</Text>
                <Text style={styles.guardStatLabel}>Active</Text>
              </View>
              <View style={styles.guardStat}>
                <Text style={styles.guardStatValue}>{guards.filter(g => g.status === 'Available').length}</Text>
                <Text style={styles.guardStatLabel}>Available</Text>
              </View>
              <View style={styles.guardStat}>
                <Text style={styles.guardStatValue}>{stats.femaleGuardTrips}</Text>
                <Text style={styles.guardStatLabel}>Today's Trips</Text>
              </View>
            </View>

            {/* Guard List */}
            {guards.map((guard) => (
              <View key={guard.id} style={styles.guardItem}>
                <View style={styles.guardAvatar}>
                  <Ionicons name="person" size={24} color="#6B7280" />
                </View>
                <View style={styles.guardInfo}>
                  <Text style={styles.guardName}>{guard.name}</Text>
                  <View style={[styles.guardStatus, 
                    guard.status === 'On Duty' ? styles.statusOnDuty :
                    guard.status === 'En Route' ? styles.statusEnRoute : styles.statusAvailable
                  ]}>
                    <Text style={styles.guardStatusText}>{guard.status}</Text>
                  </View>
                  {guard.assignedTo && (
                    <Text style={styles.guardAssignment}>Assigned to: {guard.assignedTo}</Text>
                  )}
                  {guard.location && (
                    <Text style={styles.guardLocation}>
                      <Ionicons name="location" size={12} color="#6B7280" /> {guard.location}
                    </Text>
                  )}
                </View>
                <TouchableOpacity style={styles.guardAction}>
                  <Ionicons name="call" size={20} color="#2563EB" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Safety Info */}
            <View style={styles.safetyInfo}>
              <Ionicons name="information-circle" size={20} color="#2563EB" />
              <Text style={styles.safetyInfoText}>
                Guards are automatically assigned to female employees for late-night trips (after 8 PM) as per company policy.
              </Text>
            </View>
          </View>
        )}

        {/* TEAM TAB */}
        {activeTab === 'team' && (
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Team Transport Management</Text>
              <Text style={styles.cardSubtitle}>Supervisors and Team Leaders can assign transport for their teams</Text>
              
              {/* Team Members */}
              <View style={styles.teamList}>
                {[
                  { name: 'Priya Sharma', role: 'Team Leader', team: 'Engineering', lastTrip: 'Today, 8:30 AM' },
                  { name: 'Rahul Kumar', role: 'Supervisor', team: 'Marketing', lastTrip: 'Today, 9:00 AM' },
                  { name: 'Sneha Patel', role: 'Employee', team: 'Design', lastTrip: 'Yesterday' },
                  { name: 'Amit Singh', role: 'Employee', team: 'Sales', lastTrip: 'Today, 7:45 AM' },
                ].map((member, index) => (
                  <View key={index} style={styles.teamMember}>
                    <View style={styles.memberAvatar}>
                      <Ionicons name="person" size={20} color="#6B7280" />
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberRole}>{member.role} • {member.team}</Text>
                      <Text style={styles.memberLastTrip}>Last trip: {member.lastTrip}</Text>
                    </View>
                    <TouchableOpacity style={styles.assignBtn}>
                      <Text style={styles.assignBtnText}>Assign</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Access Levels */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Access Levels</Text>
              <View style={styles.accessLevel}>
                <Ionicons name="shield" size={20} color="#EF4444" />
                <View style={styles.accessInfo}>
                  <Text style={styles.accessName}>Super Admin</Text>
                  <Text style={styles.accessDesc}>Full system access, policies, billing</Text>
                </View>
              </View>
              <View style={styles.accessLevel}>
                <Ionicons name="shield-checkmark" size={20} color="#D97706" />
                <View style={styles.accessInfo}>
                  <Text style={styles.accessName}>Admin</Text>
                  <Text style={styles.accessDesc}>Manage fleet, approve requests, ad-hoc bookings</Text>
                </View>
              </View>
              <View style={styles.accessLevel}>
                <Ionicons name="people" size={20} color="#2563EB" />
                <View style={styles.accessInfo}>
                  <Text style={styles.accessName}>Supervisor</Text>
                  <Text style={styles.accessDesc}>Assign transport for team, view reports</Text>
                </View>
              </View>
              <View style={styles.accessLevel}>
                <Ionicons name="person" size={20} color="#059669" />
                <View style={styles.accessInfo}>
                  <Text style={styles.accessName}>Team Leader</Text>
                  <Text style={styles.accessDesc}>Book transport for team members</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Ad-hoc Request Modal */}
      <Modal visible={showAdhocModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Ad-hoc Request</Text>
              <TouchableOpacity onPress={() => setShowAdhocModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <TextInput style={styles.input} placeholder="Employee Name" value={newAdhoc.employee} onChangeText={(v) => setNewAdhoc({...newAdhoc, employee: v})} />
            <TextInput style={styles.input} placeholder="Pickup Location" value={newAdhoc.pickup} onChangeText={(v) => setNewAdhoc({...newAdhoc, pickup: v})} />
            <TextInput style={styles.input} placeholder="Dropoff Location" value={newAdhoc.dropoff} onChangeText={(v) => setNewAdhoc({...newAdhoc, dropoff: v})} />
            <TextInput style={styles.input} placeholder="Time (e.g., 2:00 PM)" value={newAdhoc.time} onChangeText={(v) => setNewAdhoc({...newAdhoc, time: v})} />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Reason for ad-hoc request" value={newAdhoc.reason} onChangeText={(v) => setNewAdhoc({...newAdhoc, reason: v})} multiline />
            
            <View style={styles.guardToggle}>
              <Ionicons name="shield-checkmark" size={20} color="#059669" />
              <Text style={styles.guardToggleText}>Require Safety Guard</Text>
              <Switch
                value={newAdhoc.requiresGuard}
                onValueChange={(v) => setNewAdhoc({...newAdhoc, requiresGuard: v})}
                trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                thumbColor={newAdhoc.requiresGuard ? '#059669' : '#9CA3AF'}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateAdhoc}>
              <Text style={styles.submitBtnText}>Create Request</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Assign Guard Modal */}
      <Modal visible={showAssignModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Safety Guard</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <TextInput style={styles.input} placeholder="Employee Name" />
            <TextInput style={styles.input} placeholder="Pickup Location" />
            <TextInput style={styles.input} placeholder="Dropoff Location" />
            <TextInput style={styles.input} placeholder="Date" />
            <TextInput style={styles.input} placeholder="Time" />

            <TouchableOpacity style={styles.submitBtn} onPress={() => { setShowAssignModal(false); Alert.alert('Guard Assigned'); }}>
              <Text style={styles.submitBtnText}>Assign Guard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  tabsContainer: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 4, borderRadius: 20, backgroundColor: '#F3F4F6' },
  tabActive: { backgroundColor: '#EFF6FF' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginLeft: 6 },
  tabTextActive: { color: '#2563EB' },
  content: { padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { width: '48%', borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  addBtn: { flexDirection: 'row', alignItems: 'center' },
  addBtnText: { fontSize: 14, color: '#2563EB', marginLeft: 4, fontWeight: '600' },
  requestItem: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between' },
  requestInfo: { flex: 1 },
  requestHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  requestName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  guardBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  guardBadgeText: { fontSize: 10, color: '#065F46', marginLeft: 4 },
  requestMeta: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  requestRoute: { fontSize: 13, color: '#374151', marginBottom: 2 },
  requestTime: { fontSize: 12, color: '#6B7280' },
  requestActions: { justifyContent: 'center', marginLeft: 12 },
  approveBtn: { backgroundColor: '#059669', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  rejectBtn: { backgroundColor: '#EF4444', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  adhocItem: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  adhocInfo: { flex: 1 },
  adhocReason: { fontSize: 13, color: '#6B7280', fontStyle: 'italic', marginBottom: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusApproved: { backgroundColor: '#D1FAE5' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#065F46' },
  shuttleItem: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 12 },
  shuttleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  shuttleName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  shuttlePlate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  shuttleStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusInTransit: { backgroundColor: '#DBEAFE' },
  statusAtPickup: { backgroundColor: '#FEF3C7' },
  statusAvailable: { backgroundColor: '#D1FAE5' },
  shuttleStatusText: { fontSize: 11, fontWeight: '600', color: '#065F46' },
  shuttleDetails: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  shuttleDetail: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  detailText: { fontSize: 13, color: '#6B7280', marginLeft: 4 },
  trackBtn: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  trackBtnText: { fontSize: 13, color: '#2563EB', fontWeight: '600', marginLeft: 4 },
  capacityBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  capacityFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 3 },
  routeItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  routeInfo: { flex: 1, marginLeft: 12 },
  routeName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  routeStops: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  routeEta: { fontSize: 12, color: '#2563EB', fontWeight: '600' },
  guardStats: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#F9FAFB', borderRadius: 8, padding: 16, marginBottom: 16 },
  guardStat: { alignItems: 'center' },
  guardStatValue: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  guardStatLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  guardItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  guardAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  guardInfo: { flex: 1, marginLeft: 12 },
  guardName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  guardStatus: { flexDirection: 'row', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  statusOnDuty: { backgroundColor: '#D1FAE5' },
  statusEnRoute: { backgroundColor: '#DBEAFE' },

  guardStatusText: { fontSize: 11, fontWeight: '600', color: '#065F46' },
  guardAssignment: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  guardLocation: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  guardAction: { padding: 8 },
  safetyInfo: { flexDirection: 'row', backgroundColor: '#EFF6FF', borderRadius: 8, padding: 12, marginTop: 12 },
  safetyInfoText: { flex: 1, fontSize: 12, color: '#1E40AF', marginLeft: 8, lineHeight: 18 },
  teamList: { marginTop: 8 },
  teamMember: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  memberRole: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  memberLastTrip: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  assignBtn: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  assignBtnText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
  accessLevel: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  accessInfo: { flex: 1, marginLeft: 12 },
  accessName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  accessDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  textArea: { height: 80, textAlignVertical: 'top' },
  guardToggle: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  guardToggleText: { flex: 1, fontSize: 14, color: '#374151', marginLeft: 8 },
  submitBtn: { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
