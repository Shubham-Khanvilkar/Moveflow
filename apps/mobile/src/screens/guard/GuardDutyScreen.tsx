import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function GuardDutyScreen({ navigation }: any) {
  const [dutyActive, setDutyActive] = useState(false);

  const assignedTrips = [
    { id: '1', route: 'Home → Tech Park', time: '9:00 AM', passengers: 12, vehicle: 'MH 12 AB 1234', status: 'PENDING' },
    { id: '2', route: 'Metro A → Office Complex', time: '9:30 AM', passengers: 8, vehicle: 'MH 12 CD 5678', status: 'IN_PROGRESS' },
    { id: '3', route: 'Office Complex → Home', time: '6:00 PM', passengers: 15, vehicle: 'MH 12 EF 9012', status: 'SCHEDULED' },
  ];

  const checkpoints = [
    { name: 'Boarding Verification', completed: true },
    { name: 'Seat Belt Check', completed: true },
    { name: 'Head Count Confirmation', completed: false },
    { name: 'Route Deviation Report', completed: false },
    { name: 'Drop-off Verification', completed: false },
  ];

  const handleStartDuty = () => {
    Alert.alert('Start Duty', 'Begin your guard duty shift?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start', onPress: () => setDutyActive(true) },
    ]);
  };

  const handleEndDuty = () => {
    Alert.alert('End Duty', 'End your guard duty shift?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End', onPress: () => setDutyActive(false) },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Duty Status */}
        <View style={[styles.statusCard, { backgroundColor: dutyActive ? '#059669' : '#6B7280' }]}>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.statusTitle}>{dutyActive ? 'Duty Active' : 'Off Duty'}</Text>
              <Text style={styles.statusSubtitle}>{dutyActive ? 'Protecting passengers' : 'Tap to start duty'}</Text>
            </View>
            <TouchableOpacity style={styles.statusBtn} onPress={dutyActive ? handleEndDuty : handleStartDuty}>
              <Text style={styles.statusBtnText}>{dutyActive ? 'End Duty' : 'Start Duty'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Safety Checklist */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Safety Checklist</Text>
          {checkpoints.map((cp, i) => (
            <TouchableOpacity key={i} style={styles.checkItem}
              onPress={() => Alert.alert('Checkpoint', `${cp.completed ? 'Unmark' : 'Mark'} "${cp.name}"?`)}>
              <Ionicons name={cp.completed ? 'checkbox' : 'square-outline'} size={24}
                color={cp.completed ? '#059669' : '#D1D5DB'} />
              <Text style={[styles.checkText, cp.completed && styles.checkTextDone]}>{cp.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Assigned Trips */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assigned Trips ({assignedTrips.length})</Text>
          {assignedTrips.map((trip, i) => (
            <TouchableOpacity key={i} style={styles.tripItem}
              onPress={() => navigation?.navigate('GuardTripDetail', { trip })}>
              <View style={styles.tripHeader}>
                <Text style={styles.tripRoute}>{trip.route}</Text>
                <Text style={[styles.tripStatus, {
                  color: trip.status === 'IN_PROGRESS' ? '#2563EB' : trip.status === 'PENDING' ? '#F59E0B' : '#6B7280'
                }]}>{trip.status}</Text>
              </View>
              <View style={styles.tripDetails}>
                <Text style={styles.tripDetail}><Ionicons name="time" size={14} /> {trip.time}</Text>
                <Text style={styles.tripDetail}><Ionicons name="people" size={14} /> {trip.passengers} pax</Text>
                <Text style={styles.tripDetail}><Ionicons name="car" size={14} /> {trip.vehicle}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('SOS', 'Emergency alert sent!')}>
            <Ionicons name="alert-circle" size={28} color="#DC2626" />
            <Text style={styles.actionText}>SOS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Report', 'Opening incident report...')}>
            <Ionicons name="flag" size={28} color="#F59E0B" />
            <Text style={styles.actionText}>Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Scan', 'Opening QR scanner...')}>
            <Ionicons name="qr-code" size={28} color="#2563EB" />
            <Text style={styles.actionText}>Scan QR</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },
  statusCard: { borderRadius: 16, padding: 20, marginBottom: 16 },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  statusSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  statusBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  statusBtnText: { color: '#FFF', fontWeight: '600' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  checkItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  checkText: { fontSize: 14, color: '#374151', flex: 1 },
  checkTextDone: { color: '#059669', textDecorationLine: 'line-through' },
  tripItem: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 14, marginBottom: 10 },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tripRoute: { fontSize: 15, fontWeight: '600', color: '#111827' },
  tripStatus: { fontSize: 12, fontWeight: '700' },
  tripDetails: { flexDirection: 'row', gap: 16 },
  tripDetail: { fontSize: 12, color: '#6B7280' },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  actionBtn: { alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, minWidth: 90 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 6 },
});
