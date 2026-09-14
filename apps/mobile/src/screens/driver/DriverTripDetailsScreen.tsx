import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DriverTripDetailsScreen({ navigation, route }: any) {
  const { trip } = route?.params || {};
  const [tripData, setTripData] = useState(trip || {
    id: 'TRIP-001',
    passenger: 'Sarah Johnson',
    passengerPhone: '+91 98765 43210',
    pickup: '123 Main St, Sector 5',
    dropoff: 'Tech Park, Phase 2',
    pickupTime: '9:00 AM',
    status: 'EN_ROUTE_TO_PICKUP',
    distance: '12.5 km',
    eta: '18 min',
    vehicle: 'MH 12 AB 1234',
    route: 'Via Highway 4 → Ring Road → Tech Park',
    passengers: 3,
    requiresGuard: false,
    stops: [
      { name: 'Metro Station A', time: '9:15 AM', passengers: 2 },
      { name: 'Office Complex B', time: '9:30 AM', passengers: 1 },
    ],
  });

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleNavigate = () => {
    const { latitude, longitude } = { latitude: 19.0760, longitude: 72.8777 };
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`);
  };

  const handleStatusUpdate = (newStatus: string) => {
    Alert.alert('Update Status', `Mark trip as ${newStatus}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => setTripData({ ...tripData, status: newStatus }) },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EN_ROUTE_TO_PICKUP': return '#2563EB';
      case 'ARRIVED_AT_PICKUP': return '#F59E0B';
      case 'IN_TRANSIT': return '#8B5CF6';
      case 'COMPLETED': return '#059669';
      default: return '#6B7280';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Trip Header */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor(tripData.status) }]}>
          <Text style={styles.statusBannerText}>{tripData.status.replace(/_/g, ' ')}</Text>
          <Text style={styles.tripId}>{tripData.id}</Text>
        </View>

        {/* Passenger Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Passenger</Text>
            <TouchableOpacity onPress={() => handleCall(tripData.passengerPhone)}>
              <Ionicons name="call" size={24} color="#059669" />
            </TouchableOpacity>
          </View>
          <Text style={styles.passengerName}>{tripData.passenger}</Text>
          <Text style={styles.passengerPhone}>{tripData.passengerPhone}</Text>
          {tripData.passengers > 1 && (
            <Text style={styles.passengerCount}>{tripData.passengers} passengers</Text>
          )}
        </View>

        {/* Route Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Route</Text>
          <View style={styles.routeContainer}>
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
              <View style={styles.routeLine}>
                <Text style={styles.routeLabel}>Pickup</Text>
                <Text style={styles.routeAddress}>{tripData.pickup}</Text>
                <Text style={styles.routeTime}>{tripData.pickupTime}</Text>
              </View>
            </View>
            {tripData.stops?.map((stop: any, i: number) => (
              <View key={i} style={styles.routePoint}>
                <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                <View style={styles.routeLine}>
                  <Text style={styles.routeLabel}>Stop {i + 1} ({stop.passengers} pax)</Text>
                  <Text style={styles.routeAddress}>{stop.name}</Text>
                  <Text style={styles.routeTime}>{stop.time}</Text>
                </View>
              </View>
            ))}
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <View style={styles.routeLine}>
                <Text style={styles.routeLabel}>Dropoff</Text>
                <Text style={styles.routeAddress}>{tripData.dropoff}</Text>
              </View>
            </View>
          </View>
          <View style={styles.routeSummary}>
            <Text style={styles.routeSummaryText}>{tripData.distance} • {tripData.eta} ETA</Text>
            <Text style={styles.routeSummaryText}>{tripData.route}</Text>
          </View>
        </View>

        {/* Trip Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Vehicle</Text>
            <Text style={styles.detailValue}>{tripData.vehicle}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status</Text>
            <Text style={[styles.detailValue, { color: getStatusColor(tripData.status) }]}>{tripData.status.replace(/_/g, ' ')}</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {tripData.status === 'EN_ROUTE_TO_PICKUP' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
              onPress={() => handleStatusUpdate('ARRIVED_AT_PICKUP')}>
              <Ionicons name="location" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>Arrived at Pickup</Text>
            </TouchableOpacity>
          )}
          {tripData.status === 'ARRIVED_AT_PICKUP' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#8B5CF6' }]}
              onPress={() => handleStatusUpdate('IN_TRANSIT')}>
              <Ionicons name="car" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>Start Trip</Text>
            </TouchableOpacity>
          )}
          {tripData.status === 'IN_TRANSIT' && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#059669' }]}
              onPress={() => handleStatusUpdate('COMPLETED')}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.actionBtnText}>Complete Trip</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2563EB' }]}
            onPress={handleNavigate}>
            <Ionicons name="navigate" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Navigate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}
            onPress={() => handleCall(tripData.passengerPhone)}>
            <Ionicons name="call" size={20} color="#FFF" />
            <Text style={styles.actionBtnText}>Call Passenger</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16 },
  statusBanner: { borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBannerText: { color: '#FFF', fontSize: 14, fontWeight: '700', textTransform: 'uppercase' },
  tripId: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'monospace' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  passengerName: { fontSize: 18, fontWeight: '600', color: '#111827' },
  passengerPhone: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  passengerCount: { fontSize: 12, color: '#8B5CF6', marginTop: 4, fontWeight: '600' },
  routeContainer: { marginVertical: 12 },
  routePoint: { flexDirection: 'row', marginBottom: 8 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4, marginRight: 12 },
  routeLine: { flex: 1 },
  routeLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  routeAddress: { fontSize: 14, color: '#111827', marginTop: 2 },
  routeTime: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  routeSummary: { backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12, marginTop: 8 },
  routeSummaryText: { fontSize: 13, color: '#374151', marginBottom: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailLabel: { fontSize: 14, color: '#6B7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  actions: { gap: 12, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14 },
  actionBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15, marginLeft: 8 },
});
