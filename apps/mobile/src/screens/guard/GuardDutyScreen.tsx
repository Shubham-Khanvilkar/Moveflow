import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function GuardDutyScreen({ navigation }: any) {
  const { user } = useAuth();
  const [checklist, setChecklist] = useState([
    { id: '1', label: 'Vehicle condition verified', checked: false },
    { id: '2', label: 'Driver identity confirmed', checked: false },
    { id: '3', label: 'Passenger count matches', checked: false },
    { id: '4', label: 'Emergency kit present', checked: false },
    { id: '5', label: 'Route safety confirmed', checked: false },
  ]);

  const toggleCheck = (id: string) => {
    setChecklist(checklist.map(c => c.id === id ? { ...c, checked: !c.checked } : c));
  };

  const allChecked = checklist.every(c => c.checked);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Duty Checklist</Text>
      <Text style={styles.subtitle}>Complete all checks before trip departure</Text>
      {checklist.map((item) => (
        <TouchableOpacity key={item.id} style={styles.checkItem} onPress={() => toggleCheck(item.id)}>
          <Ionicons name={item.checked ? 'checkbox' : 'square-outline'} size={24} color={item.checked ? '#10B981' : '#6B7280'} />
          <Text style={[styles.checkLabel, item.checked && styles.checkLabelDone]}>{item.label}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={[styles.submitBtn, !allChecked && { backgroundColor: '#F59E0B' }]}
        onPress={() => Alert.alert('Submitted', allChecked ? 'All checks passed!' : 'Submitted with issues')}
      >
        <Text style={styles.submitText}>{allChecked ? 'Submit Checklist' : 'Submit with Issues'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  checkItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 8, gap: 12 },
  checkLabel: { flex: 1, fontSize: 16, color: '#374151' },
  checkLabelDone: { color: '#059669', textDecorationLine: 'line-through' },
  submitBtn: { backgroundColor: '#10B981', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
