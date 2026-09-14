import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function WorkplaceScreen({ navigation }: any) {
  const [activeTab, setActiveTab] = useState('desks');
  
  const desks = [
    { id: '1', zone: 'A', seat: 'A-01', status: 'available', amenities: ['Monitor', 'Docking'] },
    { id: '2', zone: 'A', seat: 'A-02', status: 'reserved', amenities: ['Monitor'] },
    { id: '3', zone: 'B', seat: 'B-01', status: 'available', amenities: ['Monitor', 'Phone'] },
  ];
  
  const rooms = [
    { id: '1', name: 'Conference Room A', capacity: 10, status: 'available' },
    { id: '2', name: 'Meeting Room B', capacity: 6, status: 'booked' },
    { id: '3', name: 'Board Room', capacity: 20, status: 'available' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, activeTab === 'desks' && styles.tabActive]} onPress={() => setActiveTab('desks')}>
          <Text style={[styles.tabText, activeTab === 'desks' && styles.tabTextActive]}>Desks</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'rooms' && styles.tabActive]} onPress={() => setActiveTab('rooms')}>
          <Text style={[styles.tabText, activeTab === 'rooms' && styles.tabTextActive]}>Meeting Rooms</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'parking' && styles.tabActive]} onPress={() => setActiveTab('parking')}>
          <Text style={[styles.tabText, activeTab === 'parking' && styles.tabTextActive]}>Parking</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'desks' && desks.map(desk => (
          <View key={desk.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Desk {desk.seat}</Text>
              <View style={[styles.badge, desk.status === 'available' ? styles.badgeSuccess : styles.badgeWarning]}>
                <Text style={styles.badgeText}>{desk.status}</Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>Zone {desk.zone} • Floor 1</Text>
            <Text style={styles.amenities}>{desk.amenities.join(' • ')}</Text>
            <TouchableOpacity style={styles.reserveButton}>
              <Text style={styles.reserveButtonText}>Reserve</Text>
            </TouchableOpacity>
          </View>
        ))}

        {activeTab === 'rooms' && rooms.map(room => (
          <View key={room.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{room.name}</Text>
              <View style={[styles.badge, room.status === 'available' ? styles.badgeSuccess : styles.badgeWarning]}>
                <Text style={styles.badgeText}>{room.status}</Text>
              </View>
            </View>
            <Text style={styles.cardSubtitle}>Capacity: {room.capacity} people</Text>
            <TouchableOpacity style={styles.reserveButton}>
              <Text style={styles.reserveButtonText}>Book Room</Text>
            </TouchableOpacity>
          </View>
        ))}

        {activeTab === 'parking' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Parking Spots</Text>
              <View style={styles.badgeSuccess}><Text style={styles.badgeText}>12 Available</Text></View>
            </View>
            <Text style={styles.cardSubtitle}>Including 3 EV Charging spots</Text>
            <TouchableOpacity style={styles.reserveButton}>
              <Text style={styles.reserveButtonText}>Reserve Spot</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  tabs: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#2563EB' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#2563EB' },
  content: { padding: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeSuccess: { backgroundColor: '#D1FAE5' },
  badgeWarning: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#065F46' },
  cardSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  amenities: { fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  reserveButton: { backgroundColor: '#2563EB', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  reserveButtonText: { color: '#FFFFFF', fontWeight: '600' },
});
