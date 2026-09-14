import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function EmployeeBookingScreen({ navigation }: any) {
  const [tripType, setTripType] = useState<'oneWay' | 'roundTrip' | 'recurring'>('oneWay');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [passengers, setPassengers] = useState('1');
  const [notes, setNotes] = useState('');

  const quickLocations = [
    { name: 'Home', address: '123 Main St, Sector 5', icon: 'home' },
    { name: 'Office', address: 'Tech Park, Phase 2', icon: 'business' },
    { name: 'Metro Station', address: 'Metro Station A', icon: 'train' },
  ];

  const recentBookings = [
    { id: '1', pickup: 'Home', dropoff: 'Office', date: 'Today, 9:00 AM', status: 'CONFIRMED' },
    { id: '2', pickup: 'Office', dropoff: 'Home', date: 'Today, 6:00 PM', status: 'SCHEDULED' },
    { id: '3', pickup: 'Home', dropoff: 'Client Office', date: 'Yesterday, 10:30 AM', status: 'COMPLETED' },
  ];

  const handleBook = () => {
    if (!pickup || !dropoff) {
      Alert.alert('Error', 'Please select pickup and dropoff locations');
      return;
    }
    Alert.alert('Confirm Booking', `Book ${tripType} from ${pickup} to ${dropoff}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Book Now', onPress: () => {
        Alert.alert('Success', 'Transport booked successfully!');
        setPickup('');
        setDropoff('');
      }},
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Trip Type Selector */}
        <View style={styles.typeSelector}>
          {(['oneWay', 'roundTrip', 'recurring'] as const).map(t => (
            <TouchableOpacity key={t} style={[styles.typeBtn, tripType === t && styles.typeBtnActive]}
              onPress={() => setTripType(t)}>
              <Ionicons name={t === 'oneWay' ? 'arrow-forward' : t === 'roundTrip' ? 'swap-horizontal' : 'repeat'} size={20}
                color={tripType === t ? '#FFF' : '#6B7280'} />
              <Text style={[styles.typeText, tripType === t && styles.typeTextActive]}>
                {t === 'oneWay' ? 'One Way' : t === 'roundTrip' ? 'Round Trip' : 'Recurring'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Locations */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Select</Text>
          <View style={styles.quickLocations}>
            {quickLocations.map((loc, i) => (
              <TouchableOpacity key={i} style={styles.quickBtn}
                onPress={() => { if (!pickup) setPickup(loc.name); else setDropoff(loc.name); }}>
                <Ionicons name={loc.icon as any} size={24} color="#2563EB" />
                <Text style={styles.quickName}>{loc.name}</Text>
                <Text style={styles.quickAddress}>{loc.address}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Booking Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trip Details</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>From</Text>
            <TextInput value={pickup} onChangeText={setPickup} placeholder="Pickup location"
              style={styles.input} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>To</Text>
            <TextInput value={dropoff} onChangeText={setDropoff} placeholder="Dropoff location"
              style={styles.input} />
          </View>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Date</Text>
              <TextInput value={date} onChangeText={setDate} placeholder="Select date"
                style={styles.input} />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Time</Text>
              <TextInput value={time} onChangeText={setTime} placeholder="Select time"
                style={styles.input} />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Passengers</Text>
            <TextInput value={passengers} onChangeText={setPassengers} keyboardType="numeric"
              style={styles.input} />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput value={notes} onChangeText={setNotes} placeholder="Special requirements..."
              multiline numberOfLines={3} style={[styles.input, { height: 80 }]} />
          </View>
        </View>

        {/* Book Button */}
        <TouchableOpacity style={styles.bookBtn} onPress={handleBook}>
          <Ionicons name="checkmark-circle" size={22} color="#FFF" />
          <Text style={styles.bookBtnText}>Book Transport</Text>
        </TouchableOpacity>

        {/* Recent Bookings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Bookings</Text>
          {recentBookings.map((b, i) => (
            <TouchableOpacity key={i} style={styles.bookingItem}>
              <View style={styles.bookingInfo}>
                <Text style={styles.bookingRoute}>{b.pickup} → {b.dropoff}</Text>
                <Text style={styles.bookingDate}>{b.date}</Text>
              </View>
              <Text style={[styles.bookingStatus, { color: b.status === 'CONFIRMED' ? '#059669' : b.status === 'SCHEDULED' ? '#2563EB' : '#6B7280' }]}>
                {b.status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },
  typeSelector: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingVertical: 12, gap: 6 },
  typeBtnActive: { backgroundColor: '#2563EB' },
  typeText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  typeTextActive: { color: '#FFF' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  quickLocations: { flexDirection: 'row', gap: 8 },
  quickBtn: { flex: 1, alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12 },
  quickName: { fontSize: 13, fontWeight: '600', color: '#111827', marginTop: 6 },
  quickAddress: { fontSize: 11, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 10, fontSize: 14 },
  row: { flexDirection: 'row' },
  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#059669', borderRadius: 12, paddingVertical: 16, marginBottom: 16, gap: 8 },
  bookBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  bookingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  bookingInfo: { flex: 1 },
  bookingRoute: { fontSize: 14, fontWeight: '600', color: '#111827' },
  bookingDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  bookingStatus: { fontSize: 12, fontWeight: '700' },
});
