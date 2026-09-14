import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getStoredAuth } from '../../services/api';

const API_BASE_URL = 'http://localhost:3001/api';

export default function DocumentUploadScreen({ route, navigation }: any) {
  const { token, documentType, label, reupload } = route.params;
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take document photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadDocument(result.assets[0].uri);
    }
  };

  const handleGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Gallery access is needed to select document photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      uploadDocument(result.assets[0].uri);
    }
  };

  const uploadDocument = async (uri: string) => {
    setUploading(true);
    try {
      const { token } = await getStoredAuth();

      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'image/jpeg',
        name: `${documentType}_${Date.now()}.jpg`,
      } as any);

      const uploadRes = await fetch(`${API_BASE_URL}/storage/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();

      const docRes = await fetch(`${API_BASE_URL}/driver/onboard/${token}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          documentType,
          fileUrl: uploadData.path || uploadData.url,
          documentDate: new Date().toISOString(),
        }),
      });

      if (!docRes.ok) throw new Error('Failed to record document');
      setUploaded(true);
      Alert.alert('Success', `${label} uploaded successfully`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Upload Failed', e.message || 'Please try again');
    }
    setUploading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upload {label}</Text>
        <Text style={styles.subtitle}>{reupload ? 'Re-upload your document' : 'Take a photo or select from gallery'}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.docTypeCard}>
          <Text style={styles.docTypeIcon}>
            {documentType === 'DRIVING_LICENSE' ? '🪪' : documentType === 'PUC' ? '🌿' : documentType === 'INSURANCE' ? '🛡️' : '📋'}
          </Text>
          <Text style={styles.docTypeName}>{label}</Text>
          <Text style={styles.docTypeHint}>Clear photo of the front side</Text>
        </View>

        {uploading ? (
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.uploadingText}>Uploading...</Text>
          </View>
        ) : uploaded ? (
          <View style={styles.successContainer}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successText}>Document uploaded successfully!</Text>
          </View>
        ) : (
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleCamera}>
              <Text style={styles.primaryBtnText}>📷 Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleGallery}>
              <Text style={styles.secondaryBtnText}>🖼️ Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for a good photo:</Text>
          <Text style={styles.tipItem}>• Ensure all text is readable</Text>
          <Text style={styles.tipItem}>• Avoid glare and shadows</Text>
          <Text style={styles.tipItem}>• Include all corners of the document</Text>
          <Text style={styles.tipItem}>• Use good lighting</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#1e40af' },
  title: { fontSize: 24, fontWeight: '700', color: 'white' },
  subtitle: { fontSize: 14, color: '#93c5fd', marginTop: 4 },
  content: { padding: 20 },
  docTypeCard: { backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#e5e7eb' },
  docTypeIcon: { fontSize: 48, marginBottom: 12 },
  docTypeName: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  docTypeHint: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  buttonGroup: { gap: 12, marginBottom: 24 },
  primaryBtn: { backgroundColor: '#2563eb', padding: 18, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: 'white', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { backgroundColor: 'white', padding: 18, borderRadius: 12, alignItems: 'center', borderWidth: 2, borderColor: '#2563eb' },
  secondaryBtnText: { color: '#2563eb', fontSize: 16, fontWeight: '700' },
  uploadingContainer: { alignItems: 'center', padding: 40 },
  uploadingText: { marginTop: 12, fontSize: 14, color: '#6b7280' },
  successContainer: { alignItems: 'center', padding: 40 },
  successIcon: { fontSize: 48, marginBottom: 12 },
  successText: { fontSize: 16, fontWeight: '600', color: '#059669' },
  tipsCard: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 16 },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginBottom: 8 },
  tipItem: { fontSize: 13, color: '#374151', marginBottom: 4 },
});
