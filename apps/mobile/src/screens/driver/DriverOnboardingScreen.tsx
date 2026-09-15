import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DriverOnboardingScreen({ navigation }: any) {
  const steps = [
    { title: 'Upload Documents', desc: 'Driving license, RC, insurance', icon: 'document-text', done: false },
    { title: 'Vehicle Inspection', desc: 'Pre-trip vehicle check', icon: 'car', done: false },
    { title: 'Safety Training', desc: 'Complete safety guidelines', icon: 'shield-checkmark', done: false },
    { title: 'Route Training', desc: 'Learn company routes', icon: 'map', done: false },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Driver Onboarding</Text>
      <Text style={styles.subtitle}>Complete these steps to start accepting trips</Text>
      {steps.map((step, index) => (
        <View key={index} style={styles.stepCard}>
          <View style={[styles.stepIcon, step.done && styles.stepDone]}>
            <Ionicons name={step.done ? 'checkmark' : step.icon as any} size={24} color={step.done ? '#FFF' : '#2563EB'} />
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDesc}>{step.desc}</Text>
          </View>
          {!step.done && (
            <TouchableOpacity style={styles.stepBtn}>
              <Text style={styles.stepBtnText}>Start</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  stepCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  stepIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  stepDone: { backgroundColor: '#10B981' },
  stepInfo: { flex: 1, marginLeft: 12 },
  stepTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  stepDesc: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  stepBtn: { backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  stepBtnText: { color: '#2563EB', fontWeight: '600' },
});
