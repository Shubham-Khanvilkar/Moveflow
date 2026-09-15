import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DocumentUploadScreen() {
  const [documents, setDocuments] = useState([
    { id: '1', name: 'Driving License', status: 'pending', icon: 'card' },
    { id: '2', name: 'Vehicle RC', status: 'pending', icon: 'document-text' },
    { id: '3', name: 'Insurance Certificate', status: 'pending', icon: 'shield-checkmark' },
    { id: '4', name: 'PUC Certificate', status: 'pending', icon: 'leaf' },
  ]);

  const uploadDocument = (docId: string) => {
    Alert.alert('Upload Document', 'Camera or gallery picker will open here');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Upload Documents</Text>
      <Text style={styles.subtitle}>Please upload the required documents for verification</Text>
      {documents.map((doc) => (
        <TouchableOpacity key={doc.id} style={styles.docCard} onPress={() => uploadDocument(doc.id)}>
          <Ionicons name={doc.icon as any} size={32} color="#2563EB" />
          <View style={styles.docInfo}>
            <Text style={styles.docName}>{doc.name}</Text>
            <Text style={[styles.docStatus, { color: doc.status === 'verified' ? '#059669' : '#F59E0B' }]}>
              {doc.status === 'verified' ? 'Verified' : 'Pending Upload'}
            </Text>
          </View>
          <Ionicons name="camera" size={24} color="#6B7280" />
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.submitBtn} onPress={() => Alert.alert('Submitted', 'Documents submitted for review')}>
        <Text style={styles.submitText}>Submit for Verification</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  docCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  docInfo: { flex: 1, marginLeft: 12 },
  docName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  docStatus: { fontSize: 13, marginTop: 2 },
  submitBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
