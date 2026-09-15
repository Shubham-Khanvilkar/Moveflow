import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function GuardQRScannerScreen({ navigation }: any) {
  const [scanned, setScanned] = useState(false);

  const handleScan = () => {
    Alert.alert('QR Scanner', 'Camera scanner would open here. For demo, simulating a scan.');
    setScanned(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.scannerArea}>
        <Ionicons name="qr-code-outline" size={120} color="#2563EB" />
        <Text style={styles.scannerText}>Position QR code within the frame</Text>
      </View>
      <TouchableOpacity style={styles.scanBtn} onPress={handleScan}>
        <Ionicons name="camera" size={24} color="#FFF" />
        <Text style={styles.scanBtnText}>Scan QR Code</Text>
      </TouchableOpacity>
      {scanned && (
        <View style={styles.resultCard}>
          <Ionicons name="checkmark-circle" size={48} color="#10B981" />
          <Text style={styles.resultTitle}>Vehicle Verified</Text>
          <Text style={styles.resultText}>KA-01-AB-1234 • Toyota Innova</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  scannerArea: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 16, marginBottom: 16 },
  scannerText: { fontSize: 14, color: '#6B7280', marginTop: 16 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', borderRadius: 12, padding: 16, gap: 8 },
  scanBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  resultCard: { position: 'absolute', bottom: 60, left: 16, right: 16, backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center', elevation: 4 },
  resultTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 12 },
  resultText: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  doneBtn: { backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, marginTop: 16 },
  doneText: { color: '#FFF', fontWeight: '600' },
});
