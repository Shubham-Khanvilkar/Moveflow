import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SustainabilityScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="leaf" size={48} color="#059669" />
          <Text style={styles.title}>Your Carbon Footprint</Text>
          <Text style={styles.subtitle}>Track and reduce your environmental impact</Text>
        </View>

        <View style={styles.mainStat}>
          <Text style={styles.mainStatValue}>2.3 kg</Text>
          <Text style={styles.mainStatLabel}>CO₂ this month</Text>
          <View style={styles.comparison}>
            <Ionicons name="trending-down" size={16} color="#059669" />
            <Text style={styles.comparisonText}>15% less than average</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>By Transport Mode</Text>
        {[
          { mode: 'Cab', emission: '1.2 kg', percentage: 52, color: '#2563EB' },
          { mode: 'Shuttle', emission: '0.8 kg', percentage: 35, color: '#8B5CF6' },
          { mode: 'EV', emission: '0.3 kg', percentage: 13, color: '#10B981' },
        ].map((item, index) => (
          <View key={index} style={styles.modeCard}>
            <View style={styles.modeHeader}>
              <Text style={styles.modeName}>{item.mode}</Text>
              <Text style={styles.modeEmission}>{item.emission}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${item.percentage}%`, backgroundColor: item.color }]} />
            </View>
          </View>
        ))}

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>🌱 Green Commute Tips</Text>
          <Text style={styles.tip}>• Choose EV or hybrid vehicles when available</Text>
          <Text style={styles.tip}>• Share rides with colleagues through carpooling</Text>
          <Text style={styles.tip}>• Consider biking for short distances</Text>
          <Text style={styles.tip}>• Use shuttle services for regular commutes</Text>
        </View>

        <View style={styles.impactCard}>
          <Text style={styles.impactTitle}>Your Impact</Text>
          <View style={styles.impactStats}>
            <View style={styles.impactStat}>
              <Text style={styles.impactValue}>12</Text>
              <Text style={styles.impactLabel}>Trees Saved</Text>
            </View>
            <View style={styles.impactStat}>
              <Text style={styles.impactValue}>45 kg</Text>
              <Text style={styles.impactLabel}>CO₂ Avoided</Text>
            </View>
            <View style={styles.impactStat}>
              <Text style={styles.impactValue}>Gold</Text>
              <Text style={styles.impactLabel}>Eco Status</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginTop: 12 },
  subtitle: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  mainStat: { alignItems: 'center', backgroundColor: '#ECFDF5', borderRadius: 16, padding: 24, marginBottom: 24 },
  mainStatValue: { fontSize: 48, fontWeight: 'bold', color: '#059669' },
  mainStatLabel: { fontSize: 16, color: '#065F46', marginTop: 4 },
  comparison: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  comparisonText: { fontSize: 14, color: '#059669', marginLeft: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  modeCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  modeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  modeName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  modeEmission: { fontSize: 14, color: '#6B7280' },
  progressBar: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  tipsCard: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 16, marginBottom: 16 },
  tipsTitle: { fontSize: 18, fontWeight: 'bold', color: '#92400E', marginBottom: 12 },
  tip: { fontSize: 14, color: '#78350F', marginBottom: 8 },
  impactCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 },
  impactTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 16 },
  impactStats: { flexDirection: 'row', justifyContent: 'space-around' },
  impactStat: { alignItems: 'center' },
  impactValue: { fontSize: 24, fontWeight: 'bold', color: '#2563EB' },
  impactLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
});
