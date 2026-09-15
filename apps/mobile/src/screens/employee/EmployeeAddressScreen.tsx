import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { employeesApi } from '../../services/api';
import { EmptyState, LoadingState } from '../../components/ui';

export default function EmployeeAddressScreen({ navigation }: any) {
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAddresses = async () => {
    try {
      const data = await employeesApi.getSelfLocations();
      setAddresses(Array.isArray(data) ? data : (data as any)?.locations || []);
    } catch (error) {
      console.error('Failed to load addresses:', error);
    }
    setLoading(false);
  };

  useEffect(() => { loadAddresses(); }, []);

  const deleteAddress = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setAddresses(addresses.filter(a => a.id !== id)) },
    ]);
  };

  if (loading) return <LoadingState message="Loading addresses..." />;

  return (
    <View style={styles.container}>
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.addressCard}>
            <View style={styles.addressIcon}>
              <Ionicons name={item.type === 'HOME' ? 'home' : 'business'} size={24} color="#2563EB" />
            </View>
            <View style={styles.addressInfo}>
              <Text style={styles.addressName}>{item.label || item.type || 'Saved Address'}</Text>
              <Text style={styles.addressText}>{item.address || item.fullAddress || 'No address set'}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteAddress(item.id)}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No saved addresses"
            message="Add your home and office addresses for quick booking"
            icon="location-outline"
            actionLabel="Add Address"
            onAction={() => Alert.alert('Coming Soon', 'Address picker will be available soon')}
          />
        }
      />
      <TouchableOpacity style={styles.addBtn} onPress={() => Alert.alert('Coming Soon', 'Address picker will be available soon')}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  addressCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  addressIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  addressInfo: { flex: 1, marginLeft: 12 },
  addressName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  addressText: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  addBtn: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', elevation: 4 },
});
