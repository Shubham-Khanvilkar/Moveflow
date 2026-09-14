import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, Modal, Switch, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SupervisorDashboardScreen({ navigation }: any) {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [bulkAssign, setBulkAssign] = useState(false);

  const [teamStats] = useState({
    totalMembers: 12,
    assignedToday: 8,
    pendingRequests: 3,
    guardAssigned: 2,
  });

  const [teamMembers, setTeamMembers] = useState([
    { id: '1', name: 'Priya Sharma', role: 'Developer', status: 'Assigned', pickup: 'HSR Layout', time: '8:30 AM', requiresGuard: true, gender: 'female' },
    { id: '2', name: 'Rahul Kumar', role: 'Designer', status: 'Assigned', pickup: 'Koramangala', time: '9:00 AM', requiresGuard: false, gender: 'male' },
    { id: '3', name: 'Sneha Patel', role: 'Developer', status: 'Pending', pickup: 'Whitefield', time: '8:45 AM', requiresGuard: true, gender: 'female' },
    { id: '4', name: 'Amit Singh', role: 'QA Engineer', status: 'Assigned', pickup: 'Electronic City', time: '8:00 AM', requiresGuard: false, gender: 'male' },
    { id: '5', name: 'Kavita Nair', role: 'Developer', status: 'Pending', pickup: 'BTM Layout', time: '9:15 AM', requiresGuard: true, gender: 'female' },
    { id: '6', name: 'Vikram Reddy', role: 'DevOps', status: 'Assigned', pickup: 'Marathahalli', time: '8:30 AM', requiresGuard: false, gender: 'male' },
  ]);

  const [pendingApprovals, setPendingApprovals] = useState([
    { id: '1', employee: 'Sneha Patel', pickup: 'Whitefield', dropoff: 'Office', time: '8:45 AM', reason: 'Regular commute' },
    { id: '2', employee: 'Kavita Nair', pickup: 'BTM Layout', dropoff: 'Office', time: '9:15 AM', reason: 'Regular commute' },
    { id: '3', employee: 'Deepika Reddy', pickup: 'Indiranagar', dropoff: 'Office', time: '9:30 AM', reason: 'Client meeting prep' },
  ]);

  const handleApproveAll = () => {
    Alert.alert('Approve All', `Approve ${pendingApprovals.length} requests?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve All', onPress: () => { setPendingApprovals([]); Alert.alert('Approved!', 'All requests have been approved'); }},
    ]);
  };

  const handleBulkAssign = () => {
    if (!bulkAssign) {
      setBulkAssign(true);
      Alert.alert('Bulk Mode', 'Select team members to assign transport in bulk');
    } else {
      Alert.alert('Bulk Assign', `Assign transport to ${teamMembers.filter(m => m.status === 'Pending').length} members?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Assign', onPress: () => {
          setTeamMembers(prev => prev.map(m => m.status === 'Pending' ? { ...m, status: 'Assigned' } : m));
          setBulkAssign(false);
          Alert.alert('Assigned!', 'Transport assigned to all pending members');
        }},
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Team Management</Text>
            <Text style={styles.subtitle}>Supervisor Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.bulkBtn} onPress={handleBulkAssign}>
            <Ionicons name={bulkAssign ? 'checkmark-circle' : 'albums'} size={20} color="#FFF" />
            <Text style={styles.bulkBtnText}>{bulkAssign ? 'Confirm Bulk' : 'Bulk Assign'}</Text>
          </TouchableOpacity>
        </View>

        {/* Team Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="people" size={24} color="#2563EB" />
            <Text style={styles.statValue}>{teamStats.totalMembers}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={24} color="#059669" />
            <Text style={styles.statValue}>{teamStats.assignedToday}</Text>
            <Text style={styles.statLabel}>Assigned</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="time" size={24} color="#D97706" />
            <Text style={styles.statValue}>{teamStats.pendingRequests}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="shield-checkmark" size={24} color="#8B5CF6" />
            <Text style={styles.statValue}>{teamStats.guardAssigned}</Text>
            <Text style={styles.statLabel}>Guards</Text>
          </View>
        </View>

        {/* Pending Approvals */}
        {pendingApprovals.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>Pending Approvals ({pendingApprovals.length})</Text>
              <TouchableOpacity style={styles.approveAllBtn} onPress={handleApproveAll}>
                <Text style={styles.approveAllText}>Approve All</Text>
              </TouchableOpacity>
            </View>
            {pendingApprovals.map((req) => (
              <View key={req.id} style={styles.approvalItem}>
                <View style={styles.approvalInfo}>
                  <Text style={styles.approvalName}>{req.employee}</Text>
                  <Text style={styles.approvalRoute}>{req.pickup} → {req.dropoff}</Text>
                  <Text style={styles.approvalTime}>{req.time}</Text>
                </View>
                <View style={styles.approvalActions}>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => {
                    setPendingApprovals(prev => prev.filter(r => r.id !== req.id));
                    Alert.alert('Approved');
                  }}>
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => {
                    setPendingApprovals(prev => prev.filter(r => r.id !== req.id));
                    Alert.alert('Rejected');
                  }}>
                    <Ionicons name="close" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Team Members */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Team Members</Text>
            <TouchableOpacity style={styles.assignBtn} onPress={() => setShowAssignModal(true)}>
              <Ionicons name="add-circle" size={20} color="#2563EB" />
              <Text style={styles.assignBtnText}>Assign</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            {['all', 'assigned', 'pending', 'female'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterTab, selectedTeam === filter && styles.filterTabActive]}
                onPress={() => setSelectedTeam(filter)}
              >
                <Text style={[styles.filterText, selectedTeam === filter && styles.filterTextActive]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Member List */}
          {teamMembers
            .filter(m => selectedTeam === 'all' || 
              (selectedTeam === 'assigned' && m.status === 'Assigned') ||
              (selectedTeam === 'pending' && m.status === 'Pending') ||
              (selectedTeam === 'female' && m.gender === 'female'))
            .map((member) => (
            <View key={member.id} style={[styles.memberItem, bulkAssign && styles.memberSelectable]}>
              {bulkAssign && (
                <TouchableOpacity style={styles.checkbox}>
                  <View style={styles.checkboxInner} />
                </TouchableOpacity>
              )}
              <View style={styles.memberAvatar}>
                <Ionicons name="person" size={20} color="#6B7280" />
                {member.gender === 'female' && <View style={styles.femaleIndicator} />}
              </View>
              <View style={styles.memberInfo}>
                <View style={styles.memberHeader}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  {member.requiresGuard && (
                    <View style={styles.guardBadge}>
                      <Ionicons name="shield-checkmark" size={10} color="#059669" />
                      <Text style={styles.guardText}>Guard</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.memberRole}>{member.role}</Text>
                <Text style={styles.memberRoute}>{member.pickup} • {member.time}</Text>
              </View>
              <View style={styles.memberStatus}>
                <View style={[styles.statusBadge, member.status === 'Assigned' ? styles.statusAssigned : styles.statusPending]}>
                  <Text style={styles.statusText}>{member.status}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionItem}>
              <Ionicons name="bus" size={24} color="#2563EB" />
              <Text style={styles.actionText}>Assign Shuttle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <Ionicons name="shield-checkmark" size={24} color="#059669" />
              <Text style={styles.actionText}>Assign Guard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <Ionicons name="flash" size={24} color="#D97706" />
              <Text style={styles.actionText}>Ad-hoc Request</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <Ionicons name="analytics" size={24} color="#8B5CF6" />
              <Text style={styles.actionText}>View Reports</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Assign Modal */}
      <Modal visible={showAssignModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Transport</Text>
              <TouchableOpacity onPress={() => setShowAssignModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <TextInput style={styles.input} placeholder="Employee Name" />
            
            <Text style={styles.inputLabel}>Transport Type</Text>
            <View style={styles.transportOptions}>
              {['Individual Cab', 'Shuttle', 'Carpool'].map((type) => (
                <TouchableOpacity key={type} style={styles.transportOption}>
                  <Ionicons name={type === 'Individual Cab' ? 'car' : type === 'Shuttle' ? 'bus' : 'people'} size={20} color="#2563EB" />
                  <Text style={styles.transportOptionText}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput style={styles.input} placeholder="Pickup Location" />
            <TextInput style={styles.input} placeholder="Dropoff Location" />
            <TextInput style={styles.input} placeholder="Time (e.g., 8:30 AM)" />
            
            <View style={styles.guardToggle}>
              <Ionicons name="shield-checkmark" size={20} color="#059669" />
              <Text style={styles.guardToggleText}>Require Safety Guard</Text>
              <Switch
                value={false}
                trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                thumbColor={'#9CA3AF'}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={() => { setShowAssignModal(false); Alert.alert('Transport Assigned'); }}>
              <Text style={styles.submitBtnText}>Assign Transport</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8B5CF6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  bulkBtnText: { color: '#FFF', fontWeight: '600', marginLeft: 6 },
  statsCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginTop: 4 },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  approveAllBtn: { backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  approveAllText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
  approvalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  approvalInfo: { flex: 1 },
  approvalName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  approvalRoute: { fontSize: 13, color: '#374151', marginTop: 2 },
  approvalTime: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  approvalActions: { flexDirection: 'row' },
  approveBtn: { backgroundColor: '#059669', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  rejectBtn: { backgroundColor: '#EF4444', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  assignBtn: { flexDirection: 'row', alignItems: 'center' },
  assignBtnText: { color: '#2563EB', fontWeight: '600', marginLeft: 4 },
  filterTabs: { flexDirection: 'row', marginBottom: 12 },
  filterTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterTabActive: { backgroundColor: '#2563EB' },
  filterText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  filterTextActive: { color: '#FFF' },
  memberItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  memberSelectable: { backgroundColor: '#F9FAFB' },
  checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxInner: { width: 14, height: 14, borderRadius: 2, backgroundColor: '#2563EB' },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  femaleIndicator: { position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#EC4899', borderWidth: 2, borderColor: '#FFF' },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberHeader: { flexDirection: 'row', alignItems: 'center' },
  memberName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  guardBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: 8 },
  guardText: { fontSize: 10, color: '#065F46', marginLeft: 2 },
  memberRole: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  memberRoute: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  memberStatus: { marginLeft: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusAssigned: { backgroundColor: '#D1FAE5' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#065F46' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionItem: { width: '48%', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16, marginBottom: 12 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  transportOptions: { flexDirection: 'row', marginBottom: 16 },
  transportOption: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6', marginRight: 8 },
  transportOptionText: { fontSize: 12, color: '#374151', marginTop: 4 },
  guardToggle: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  guardToggleText: { flex: 1, fontSize: 14, color: '#374151', marginLeft: 8 },
  submitBtn: { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
