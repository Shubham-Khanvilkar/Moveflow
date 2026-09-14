import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { tripsApi, qrApi } from '../services/api';

interface Passenger {
  id: string;
  name: string;
  phone: string;
  pickupLocation: string;
  dropLocation: string;
  boarded: boolean;
  noShow: boolean;
}

interface ActiveTrip {
  id: string;
  tripCode: string;
  status: string;
  passengers: Passenger[];
  vehicleRegistration?: string;
  route?: string;
}

export default function BoardingScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const [trip, setTrip] = useState<ActiveTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchActiveTrip = useCallback(async () => {
    try {
      setError(null);
      const response = await tripsApi.getMyTrips();
      
      let trips = Array.isArray(response) ? response : (response as any).data || (response as any).trips || [];
      
      const activeTrip = trips.find((t: any) => 
        ['DISPATCHED', 'DRIVER_ACCEPTED', 'ARRIVED_AT_PICKUP', 'EN_ROUTE_TO_PICKUP', 'IN_TRANSIT'].includes(t.status)
      );

      if (activeTrip) {
        const passengers = activeTrip.passengers || [];
        
        setTrip({
          id: activeTrip.id,
          tripCode: activeTrip.tripCode || activeTrip.code,
          status: activeTrip.status,
          passengers: passengers.map((p: any) => ({
            id: p.id || p.passengerId,
            name: p.name || p.passengerName,
            phone: p.phone || p.passengerPhone,
            pickupLocation: p.pickupAddress || p.pickupLocation,
            dropLocation: p.dropAddress || p.dropLocation,
            boarded: p.boarded || p.isBoarded || false,
            noShow: p.noShow || p.isNoShow || false,
          })),
          vehicleRegistration: activeTrip.vehicleRegistration || activeTrip.vehicle?.registrationNo,
        });
      } else {
        setTrip(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch trip:', err);
      setError(err.message || 'Failed to load trip');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveTrip();
  }, [fetchActiveTrip]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveTrip();
  };

  const handleBoarding = async (passengerId: string, boarded: boolean) => {
    if (!trip) return;
    
    setProcessing(passengerId);
    try {
      await tripsApi.markBoarding(trip.id, passengerId, boarded);
      setTrip(prev => prev ? {
        ...prev,
        passengers: prev.passengers.map(p => 
          p.id === passengerId ? { ...p, boarded } : p
        ),
      } : null);
      
      Alert.alert(
        'Success',
        boarded ? 'Passenger marked as boarded' : 'Boarding status removed'
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update boarding status');
    } finally {
      setProcessing(null);
    }
  };

  const handleNoShow = async (passengerId: string) => {
    if (!trip) return;
    
    Alert.alert(
      'Mark No-Show',
      'Are you sure you want to mark this passenger as a no-show?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            setProcessing(passengerId);
            try {
              await tripsApi.markNoShow(trip.id, passengerId);
              setTrip(prev => prev ? {
                ...prev,
                passengers: prev.passengers.map(p => 
                  p.id === passengerId ? { ...p, noShow: true, boarded: false } : p
                ),
              } : null);
              Alert.alert('No-Show Marked', 'Passenger has been marked as no-show');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to mark no-show');
            } finally {
              setProcessing(null);
            }
          },
        },
      ]
    );
  };

  const handleQRScanned = async (qrCode: string) => {
    if (!trip) return;
    
    try {
      const result = await qrApi.scan(qrCode);
      
      if (result.valid) {
        const passenger = trip.passengers.find(p => 
          p.id === result.passengerId || p.id === result.qr?.passengerId
        );
        
        if (passenger) {
          await handleBoarding(passenger.id, true);
        } else {
          Alert.alert('Invalid', 'This QR code is not for this trip');
        }
      } else {
        Alert.alert('Invalid QR', result.error || 'QR code could not be verified');
      }
    } catch (err: any) {
      Alert.alert('Scan Error', err.message || 'Failed to process QR code');
    }
  };

  const startTrip = async () => {
    if (!trip) return;
    
    setProcessing('start');
    try {
      await tripsApi.transition(trip.id, 'START');
      setTrip(prev => prev ? { ...prev, status: 'IN_TRANSIT' } : null);
      Alert.alert('Trip Started', 'Your trip has started. Drive safely!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start trip');
    } finally {
      setProcessing(null);
    }
  };

  const completeTrip = async () => {
    if (!trip) return;
    
    const allBoarded = trip.passengers.every(p => p.boarded || p.noShow);
    if (!allBoarded) {
      Alert.alert(
        'Incomplete Boarding',
        'Not all passengers have been accounted for. Are you sure you want to complete this trip?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete Anyway',
            onPress: async () => {
              setProcessing('complete');
              try {
                await tripsApi.complete(trip.id);
                Alert.alert('Trip Completed', 'Trip has been marked as completed');
                navigation.goBack();
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to complete trip');
              } finally {
                setProcessing(null);
              }
            },
          },
        ]
      );
      return;
    }

    setProcessing('complete');
    try {
      await tripsApi.complete(trip.id);
      Alert.alert('Trip Completed', 'Trip has been marked as completed');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to complete trip');
    } finally {
      setProcessing(null);
    }
  };

  const boardedCount = trip?.passengers.filter(p => p.boarded).length || 0;
  const totalCount = trip?.passengers.length || 0;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loadingText}>Loading trip...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchActiveTrip}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!trip) {
    return (
      <ScrollView contentContainerStyle={styles.emptyContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
        <Text style={styles.emptyTitle}>No Active Trip</Text>
        <Text style={styles.emptyText}>Accept a trip assignment to start boarding passengers.</Text>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.tripCode}>{trip.tripCode}</Text>
          <Text style={styles.passengerCount}>
            Boarded: {boardedCount} / {totalCount}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: trip.status === 'ARRIVED_AT_PICKUP' ? '#10b981' : '#3b82f6' }]}>
          <Text style={styles.statusText}>
            {trip.status === 'ARRIVED_AT_PICKUP' ? 'AT PICKUP' : 'EN ROUTE'}
          </Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: totalCount > 0 ? `${(boardedCount / totalCount) * 100}%` : '0%' }]} />
      </View>

      <ScrollView style={styles.passengerList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {trip.passengers.map((passenger) => (
          <View key={passenger.id} style={[styles.passengerCard, passenger.boarded && styles.passengerCardBoarded, passenger.noShow && styles.passengerCardNoShow]}>
            <View style={styles.passengerInfo}>
              <View style={styles.passengerAvatar}>
                <Ionicons 
                  name={passenger.boarded ? 'checkmark-circle' : passenger.noShow ? 'close-circle' : 'person'} 
                  size={24} 
                  color={passenger.boarded ? '#10b981' : passenger.noShow ? '#ef4444' : '#6b7280'} 
                />
              </View>
              <View style={styles.passengerDetails}>
                <Text style={styles.passengerName}>{passenger.name}</Text>
                <Text style={styles.passengerPhone}>{passenger.phone}</Text>
                <Text style={styles.passengerLocation}>
                  {passenger.pickupLocation}
                </Text>
              </View>
              <View style={styles.passengerStatus}>
                {passenger.boarded && (
                  <View style={[styles.statusChip, { backgroundColor: '#dcfce7' }]}>
                    <Text style={[styles.statusChipText, { color: '#166534' }]}>BOARDED</Text>
                  </View>
                )}
                {passenger.noShow && (
                  <View style={[styles.statusChip, { backgroundColor: '#fee2e2' }]}>
                    <Text style={[styles.statusChipText, { color: '#991b1b' }]}>NO-SHOW</Text>
                  </View>
                )}
              </View>
            </View>

            {!passenger.boarded && !passenger.noShow && (
              <View style={styles.passengerActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.boardBtn]}
                  onPress={() => handleBoarding(passenger.id, true)}
                  disabled={processing === passenger.id}
                >
                  {processing === passenger.id ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color="white" />
                      <Text style={styles.actionBtnText}>Board</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.noShowBtn]}
                  onPress={() => handleNoShow(passenger.id)}
                  disabled={processing === passenger.id}
                >
                  <Ionicons name="close" size={18} color="white" />
                  <Text style={styles.actionBtnText}>No-Show</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        {trip.status === 'ARRIVED_AT_PICKUP' && (
          <TouchableOpacity
            style={[styles.footerBtn, styles.startBtn]}
            onPress={startTrip}
            disabled={processing === 'start'}
          >
            {processing === 'start' ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="play" size={20} color="white" />
                <Text style={styles.footerBtnText}>Start Trip</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        
        {trip.status === 'IN_TRANSIT' && (
          <TouchableOpacity
            style={[styles.footerBtn, styles.completeBtn]}
            onPress={completeTrip}
            disabled={processing === 'complete'}
          >
            {processing === 'complete' ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.footerBtnText}>Complete Trip</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: 20 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
  errorText: { marginTop: 12, fontSize: 14, color: '#ef4444', textAlign: 'center' },
  retryButton: { marginTop: 20, backgroundColor: '#1e40af', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: 'white', fontWeight: '600' },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, minHeight: 400 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerInfo: { flex: 1 },
  tripCode: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  passengerCount: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 12, fontWeight: '700', color: 'white' },
  
  progressBar: { height: 4, backgroundColor: '#e5e7eb' },
  progressFill: { height: '100%', backgroundColor: '#10b981' },
  
  passengerList: { flex: 1, padding: 16 },
  passengerCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  passengerCardBoarded: { borderLeftWidth: 4, borderLeftColor: '#10b981' },
  passengerCardNoShow: { borderLeftWidth: 4, borderLeftColor: '#ef4444', opacity: 0.7 },
  
  passengerInfo: { flexDirection: 'row', alignItems: 'flex-start' },
  passengerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  passengerDetails: { flex: 1, marginLeft: 12 },
  passengerName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  passengerPhone: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  passengerLocation: { fontSize: 12, color: '#374151', marginTop: 4 },
  passengerStatus: { alignItems: 'flex-end' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  statusChipText: { fontSize: 10, fontWeight: '700' },
  
  passengerActions: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  boardBtn: { backgroundColor: '#10b981' },
  noShowBtn: { backgroundColor: '#6b7280' },
  actionBtnText: { color: 'white', fontWeight: '600', fontSize: 14 },
  
  footer: { padding: 16, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  footerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, gap: 8 },
  startBtn: { backgroundColor: '#3b82f6' },
  completeBtn: { backgroundColor: '#10b981' },
  footerBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },
});
