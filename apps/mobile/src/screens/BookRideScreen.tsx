import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { bookingsApi } from '../services/api';

export default function BookRideScreen({ navigation }: any) {
  const { user } = useAuth();
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAddress, setDropAddress] = useState('');
  const [pickupLat, setPickupLat] = useState('');
  const [pickupLng, setPickupLng] = useState('');
  const [dropLat, setDropLat] = useState('');
  const [dropLng, setDropLng] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [pickupTime, setPickupTime] = useState('09:00');
  const [serviceType, setServiceType] = useState('CAB');
  const [passengerCount, setPassengerCount] = useState('1');
  const [loading, setLoading] = useState(false);

  const serviceTypes = [
    { key: 'CAB', label: '🚗 Cab', desc: '4-seater sedan' },
    { key: 'SHUTTLE', label: '🚐 Shuttle', desc: 'Shared ride' },
    { key: 'BUS', label: '🚌 Bus', desc: 'Large group' },
  ];

  const handleBooking = async () => {
    if (!pickupAddress || !dropAddress || !pickupLat || !pickupLng || !dropLat || !dropLng) {
      Alert.alert('Error', 'Please fill in all address and location fields');
      return;
    }

    setLoading(true);
    try {
      const result = await bookingsApi.create({
        serviceType,
        date,
        pickupTime: `${date}T${pickupTime}`,
        pickupLatitude: parseFloat(pickupLat),
        pickupLongitude: parseFloat(pickupLng),
        pickupAddress,
        dropLatitude: parseFloat(dropLat),
        dropLongitude: parseFloat(dropLng),
        dropAddress,
        passengerCount: parseInt(passengerCount),
      });

      Alert.alert(
        'Booking Confirmed!',
        `Your ${serviceType} booking has been created.\n\nBooking Code: ${result.bookingCode || 'N/A'}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (error: any) {
      Alert.alert('Booking Failed', error.message || 'Please try again');
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Book Transport</Text>
        <Text style={styles.subtitle}>Select your pickup and drop locations</Text>
      </View>

      {/* Service Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Service Type</Text>
        <View style={styles.serviceGrid}>
          {serviceTypes.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[styles.serviceCard, serviceType === type.key && styles.serviceCardActive]}
              onPress={() => setServiceType(type.key)}
            >
              <Text style={styles.serviceLabel}>{type.label}</Text>
              <Text style={styles.serviceDesc}>{type.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Pickup */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pickup Location</Text>
        <TextInput
          style={styles.input}
          placeholder="Pickup address"
          value={pickupAddress}
          onChangeText={setPickupAddress}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Latitude"
            value={pickupLat}
            onChangeText={setPickupLat}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Longitude"
            value={pickupLng}
            onChangeText={setPickupLng}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Drop */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Drop Location</Text>
        <TextInput
          style={styles.input}
          placeholder="Drop address"
          value={dropAddress}
          onChangeText={setDropAddress}
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Latitude"
            value={dropLat}
            onChangeText={setDropLat}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Longitude"
            value={dropLng}
            onChangeText={setDropLng}
            keyboardType="numeric"
          />
        </View>
      </View>

      {/* Schedule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schedule</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Date (YYYY-MM-DD)"
            value={date}
            onChangeText={setDate}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Time (HH:MM)"
            value={pickupTime}
            onChangeText={setPickupTime}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Passenger count"
          value={passengerCount}
          onChangeText={setPassengerCount}
          keyboardType="numeric"
        />
      </View>

      {/* Book Button */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.bookButton, loading && styles.bookButtonDisabled]}
          onPress={handleBooking}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.bookButtonText}>Book {serviceType}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#1e40af' },
  title: { fontSize: 24, fontWeight: '700', color: 'white' },
  subtitle: { fontSize: 14, color: '#93c5fd', marginTop: 4 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  serviceGrid: { flexDirection: 'row', gap: 12 },
  serviceCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  serviceCardActive: { borderColor: '#1e40af', backgroundColor: '#eff6ff' },
  serviceLabel: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  serviceDesc: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  input: { backgroundColor: 'white', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  halfInput: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  bookButton: { backgroundColor: '#1e40af', borderRadius: 12, padding: 16, alignItems: 'center' },
  bookButtonDisabled: { opacity: 0.6 },
  bookButtonText: { color: 'white', fontSize: 18, fontWeight: '700' },
});
