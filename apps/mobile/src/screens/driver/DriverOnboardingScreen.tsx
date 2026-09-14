import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { getStoredAuth } from '../../services/api';

const API_BASE_URL = 'http://localhost:3001/api';

interface OnboardingData {
  driverId: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  email?: string;
  status: string;
  complianceScore: string;
  documents: any[];
  expiresAt: string;
  daysRemaining: number;
}

export default function DriverOnboardingScreen({ route, navigation }: any) {
  const { token } = route.params;
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { loadOnboarding(); }, []);

  const loadOnboarding = async () => {
    try {
      const { token: authToken } = await getStoredAuth();
      const res = await fetch(`${API_BASE_URL}/driver/onboard/${token}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) setOnboarding(data);
      else setError(data.message || 'Failed to load onboarding');
    } catch { setError('Network error'); }
    setLoading(false);
  };

  const getStatusStep = (status: string) => {
    const steps = ['DRAFT', 'DOCUMENTS_PENDING', 'UNDER_REVIEW', 'ACTIVE'];
    return steps.indexOf(status);
  };

  const getDocumentByType = (type: string) => onboarding?.documents.find(d => d.documentType === type);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  if (error) return <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>;
  if (!onboarding) return <View style={styles.center}><Text>No onboarding data</Text></View>;

  const currentStep = getStatusStep(onboarding.status);
  const requiredDocs = [
    { type: 'DRIVING_LICENSE', label: 'Driving License', icon: '🪪' },
    { type: 'PUC', label: 'PUC Certificate', icon: '🌿' },
    { type: 'INSURANCE', label: 'Insurance', icon: '🛡️' },
    { type: 'REGISTRATION_CERTIFICATE', label: 'RC Book', icon: '📋' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Driver Onboarding</Text>
        <Text style={styles.subtitle}>Complete your profile to start working</Text>
      </View>

      {/* Status Steps */}
      <View style={styles.section}>
        <View style={styles.stepsRow}>
          {['Invited', 'Documents', 'Review', 'Active'].map((label, i) => (
            <View key={i} style={styles.stepItem}>
              <View style={[styles.stepDot, i <= currentStep && styles.stepDotActive]}>
                <Text style={styles.stepDotText}>{i < currentStep ? '✓' : i + 1}</Text>
              </View>
              <Text style={[styles.stepLabel, i <= currentStep && styles.stepLabelActive]}>{label}</Text>
            </View>
          ))}
        </View>
        {onboarding.daysRemaining > 0 && (
          <Text style={styles.daysWarning}>{onboarding.daysRemaining} days remaining to complete onboarding</Text>
        )}
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Information</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Name: {onboarding.firstName} {onboarding.lastName}</Text>
          <Text style={styles.infoLabel}>Mobile: {onboarding.mobileNumber}</Text>
          {onboarding.email && <Text style={styles.infoLabel}>Email: {onboarding.email}</Text>}
          <Text style={styles.infoLabel}>Status: {onboarding.status.replace(/_/g, ' ')}</Text>
        </View>
      </View>

      {/* Document Upload */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Required Documents</Text>
        {requiredDocs.map(doc => {
          const existing = getDocumentByType(doc.type);
          return (
            <View key={doc.type} style={styles.docCard}>
              <View style={styles.docInfo}>
                <Text style={styles.docIcon}>{doc.icon}</Text>
                <View>
                  <Text style={styles.docLabel}>{doc.label}</Text>
                  <Text style={[styles.docStatus, { color: existing ? (existing.verificationStatus === 'APPROVED' ? '#059669' : existing.verificationStatus === 'REJECTED' ? '#dc2626' : '#d97706') : '#9ca3af' }]}>
                    {existing ? existing.verificationStatus || existing.status : 'Not uploaded'}
                  </Text>
                </View>
              </View>
              {!existing && (
                <TouchableOpacity style={styles.uploadBtn} onPress={() => navigation.navigate('DocumentUpload', { token, documentType: doc.type, label: doc.label })}>
                  <Text style={styles.uploadBtnText}>Upload</Text>
                </TouchableOpacity>
              )}
              {existing?.verificationStatus === 'REJECTED' && (
                <TouchableOpacity style={[styles.uploadBtn, { backgroundColor: '#dc2626' }]} onPress={() => navigation.navigate('DocumentUpload', { token, documentType: doc.type, label: doc.label, reupload: true })}>
                  <Text style={styles.uploadBtnText}>Re-upload</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      {/* Submit Button */}
      {onboarding.status === 'DOCUMENTS_PENDING' && onboarding.documents.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.submitBtn} onPress={async () => {
            try {
              const { token: authToken } = await getStoredAuth();
              const res = await fetch(`${API_BASE_URL}/driver/onboard/${token}/submit`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${authToken}` },
              });
              if (res.ok) {
                Alert.alert('Submitted', 'Your documents have been submitted for review.');
                loadOnboarding();
              } else {
                const d = await res.json();
                Alert.alert('Error', d.message || 'Failed to submit');
              }
            } catch { Alert.alert('Error', 'Network error'); }
          }}>
            <Text style={styles.submitBtnText}>Submit for Review</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#dc2626', fontSize: 14 },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#1e40af' },
  title: { fontSize: 24, fontWeight: '700', color: 'white' },
  subtitle: { fontSize: 14, color: '#93c5fd', marginTop: 4 },
  section: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 12 },
  stepsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  stepDotActive: { backgroundColor: '#2563eb' },
  stepDotText: { color: 'white', fontSize: 14, fontWeight: '700' },
  stepLabel: { fontSize: 11, color: '#9ca3af', textAlign: 'center' },
  stepLabelActive: { color: '#2563eb', fontWeight: '600' },
  daysWarning: { textAlign: 'center', color: '#d97706', fontSize: 13, marginTop: 12, fontWeight: '600' },
  infoCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  infoLabel: { fontSize: 14, color: '#374151', marginBottom: 6 },
  docCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  docInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIcon: { fontSize: 24 },
  docLabel: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  docStatus: { fontSize: 12, marginTop: 2 },
  uploadBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  uploadBtnText: { color: 'white', fontSize: 12, fontWeight: '600' },
  submitBtn: { backgroundColor: '#059669', padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
});
