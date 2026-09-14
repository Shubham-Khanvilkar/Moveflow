import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = 'http://localhost:3001/api';
const PRIMARY = '#2563EB';
const SECONDARY = '#1E40AF';

interface Address {
  id: string;
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  type: 'RESIDENTIAL' | 'OFFICE' | 'OTHER';
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  isDefault: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
}

interface AddressFormData {
  label: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  latitude: string;
  longitude: string;
  type: 'RESIDENTIAL' | 'OFFICE' | 'OTHER';
}

const EMPTY_FORM: AddressFormData = {
  label: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  latitude: '',
  longitude: '',
  type: 'RESIDENTIAL',
};

export default function EmployeeAddressScreen() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<AddressFormData>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userId] = useState('user-1');

  const fetchAddresses = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/employee-addresses/user/${userId}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setAddresses(data);
      } else if (data.addresses) {
        setAddresses(data.addresses);
      } else {
        setAddresses([]);
      }
    } catch {
      setAddresses([]);
    }
  }, [userId]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await fetchAddresses();
      setIsLoading(false);
    })();
  }, [fetchAddresses]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchAddresses();
    setIsRefreshing(false);
  };

  const handleAddAddress = async () => {
    if (!formData.label.trim() || !formData.line1.trim() || !formData.city.trim()) {
      Alert.alert('Error', 'Please fill in label, address line 1, and city');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/employee-addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          userId,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Address added successfully');
        setShowForm(false);
        setFormData(EMPTY_FORM);
        await fetchAddresses();
      } else {
        Alert.alert('Error', 'Failed to add address');
      }
    } catch {
      Alert.alert('Error', 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (address: Address) => {
    const endpoint = address.status === 'ACTIVE'
      ? `${API_BASE_URL}/employee-addresses/${address.id}/deactivate`
      : `${API_BASE_URL}/employee-addresses/${address.id}/activate`;

    try {
      const response = await fetch(endpoint, { method: 'POST' });
      if (response.ok) {
        await fetchAddresses();
      }
    } catch {
      Alert.alert('Error', 'Failed to update address');
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/employee-addresses/${addressId}/default`, {
        method: 'POST',
      });
      if (response.ok) {
        await fetchAddresses();
      }
    } catch {
      Alert.alert('Error', 'Failed to set default');
    }
  };

  const getStatusColor = (status: Address['status']): string => {
    switch (status) {
      case 'ACTIVE':
        return '#059669';
      case 'INACTIVE':
        return '#9CA3AF';
      case 'PENDING':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getTypeColor = (type: Address['type']): string => {
    switch (type) {
      case 'RESIDENTIAL':
        return PRIMARY;
      case 'OFFICE':
        return '#7C3AED';
      default:
        return '#6B7280';
    }
  };

  const updateField = (key: keyof AddressFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowForm(true)}>
          <Ionicons name="add" size={22} color="#FFF" />
          <Text style={styles.addBtnText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        >
          {addresses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No addresses added</Text>
              <Text style={styles.emptySubtitle}>Add your residential or office address</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowForm(true)}>
                <Text style={styles.emptyBtnText}>Add Address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            addresses.map((address) => (
              <View key={address.id} style={styles.addressCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    {address.isDefault && (
                      <Ionicons name="star" size={18} color="#F59E0B" style={styles.starIcon} />
                    )}
                    <Text style={styles.addressLabel}>{address.label}</Text>
                    {address.isDefault && (
                      <Text style={styles.defaultBadge}>Default</Text>
                    )}
                  </View>
                  <View style={[styles.typeBadge, { backgroundColor: getTypeColor(address.type) + '15' }]}>
                    <Text style={[styles.typeText, { color: getTypeColor(address.type) }]}>
                      {address.type}
                    </Text>
                  </View>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(address.status) + '15' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(address.status) }]}>
                    {address.status}
                  </Text>
                </View>

                <View style={styles.addressBody}>
                  <Text style={styles.addressLine}>{address.line1}</Text>
                  {address.line2 ? <Text style={styles.addressLine}>{address.line2}</Text> : null}
                  <Text style={styles.addressLine}>
                    {address.city}, {address.state} - {address.pincode}
                  </Text>

                  <View style={styles.coordsRow}>
                    <Ionicons name="location" size={14} color="#9CA3AF" />
                    <Text style={styles.coordsText}>
                      Lat: {address.latitude?.toFixed(2) ?? '--'}, Lng: {address.longitude?.toFixed(2) ?? '--'}
                    </Text>
                  </View>

                  <Text style={styles.effectiveText}>
                    Effective: {address.effectiveFrom ?? 'N/A'} - {address.effectiveTo ?? 'ongoing'}
                  </Text>
                </View>

                <View style={styles.mapPlaceholder}>
                  <Ionicons name="map-outline" size={20} color="#9CA3AF" />
                  <Text style={styles.mapText}>
                    {address.latitude && address.longitude
                      ? `${address.latitude.toFixed(4)}, ${address.longitude.toFixed(4)}`
                      : 'No coordinates'}
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, address.status === 'ACTIVE' ? styles.deactivateBtn : styles.activateBtn]}
                    onPress={() => handleToggleActive(address)}
                  >
                    <Ionicons
                      name={address.status === 'ACTIVE' ? 'pause-circle' : 'play-circle'}
                      size={16}
                      color={address.status === 'ACTIVE' ? '#EF4444' : '#059669'}
                    />
                    <Text style={[styles.actionText, { color: address.status === 'ACTIVE' ? '#EF4444' : '#059669' }]}>
                      {address.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.defaultBtn]}
                    onPress={() => handleSetDefault(address.id)}
                    disabled={address.isDefault}
                  >
                    <Ionicons name="star-outline" size={16} color={address.isDefault ? '#D1D5DB' : PRIMARY} />
                    <Text style={[styles.actionText, { color: address.isDefault ? '#D1D5DB' : PRIMARY }]}>
                      Set Default
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowForm(false); setFormData(EMPTY_FORM); }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Address</Text>
            <TouchableOpacity onPress={handleAddAddress} disabled={isSubmitting}>
              <Text style={[styles.modalSave, isSubmitting && styles.modalSaveDisabled]}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.formContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Label *</Text>
              <TextInput
                value={formData.label}
                onChangeText={(v) => updateField('label', v)}
                placeholder="e.g. Home, Office"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address Line 1 *</Text>
              <TextInput
                value={formData.line1}
                onChangeText={(v) => updateField('line1', v)}
                placeholder="Street address"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address Line 2</Text>
              <TextInput
                value={formData.line2}
                onChangeText={(v) => updateField('line2', v)}
                placeholder="Apartment, suite, etc."
                style={styles.input}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  value={formData.city}
                  onChangeText={(v) => updateField('city', v)}
                  placeholder="City"
                  style={styles.input}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  value={formData.state}
                  onChangeText={(v) => updateField('state', v)}
                  placeholder="State"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Pincode</Text>
              <TextInput
                value={formData.pincode}
                onChangeText={(v) => updateField('pincode', v)}
                placeholder="Pincode"
                keyboardType="numeric"
                style={styles.input}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Latitude</Text>
                <TextInput
                  value={formData.latitude}
                  onChangeText={(v) => updateField('latitude', v)}
                  placeholder="e.g. 12.97"
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Longitude</Text>
                <TextInput
                  value={formData.longitude}
                  onChangeText={(v) => updateField('longitude', v)}
                  placeholder="e.g. 77.59"
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address Type</Text>
              <View style={styles.typeSelector}>
                {(['RESIDENTIAL', 'OFFICE', 'OTHER'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, formData.type === t && styles.typeBtnActive]}
                    onPress={() => updateField('type', t)}
                  >
                    <Text style={[styles.typeBtnText, formData.type === t && styles.typeBtnTextActive]}>
                      {t.charAt(0) + t.slice(1).toLowerCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addressCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  starIcon: {
    marginRight: 4,
  },
  addressLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  defaultBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  addressBody: {
    gap: 4,
  },
  addressLine: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  coordsText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  effectiveText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  mapPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    gap: 6,
  },
  mapText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 12,
    paddingTop: 12,
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  deactivateBtn: {},
  activateBtn: {},
  defaultBtn: {},
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalCancel: {
    fontSize: 16,
    color: '#6B7280',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY,
  },
  modalSaveDisabled: {
    color: '#9CA3AF',
  },
  formContent: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#FFF',
  },
  row: {
    flexDirection: 'row',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  typeBtnActive: {
    backgroundColor: PRIMARY,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeBtnTextActive: {
    color: '#FFF',
  },
});
