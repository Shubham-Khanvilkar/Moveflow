import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function GuardQRScannerScreen({ navigation }: any) {
  const [lastScan, setLastScan] = useState<any>(null);

  const recentScans = [
    { time: '9:15 AM', vehicle: 'MH 12 AB 1234', result: 'VALID', driver: 'Raj Kumar' },
    { time: '9:02 AM', vehicle: 'MH 12 CD 5678', result: 'VALID', driver: 'Priya Singh' },
    { time: '8:45 AM', vehicle: 'MH 12 EF 9012', result: 'EXPIRED', driver: 'Unknown' },
  ];

  const handleScan = () => {
    // Simulate QR scan
    const mockScan = {
      vehicleId: 'VEH-001',
      plateNumber: 'MH 12 AB 1234',
      driverName: 'Raj Kumar',
      route: 'Home → Tech Park',
      passengers: 12,
      valid: true,
      validUntil: '6:00 PM',
    };

    Alert.alert('QR Scanned', `Vehicle: ${mockScan.plateNumber}\nDriver: ${mockScan.driverName}\nPassengers: ${mockScan.passengers}\nValid until: ${mockScan.validUntil}`, [
      { text: 'Close' },
    ]);
    setLastScan(mockScan);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Scanner Area */}
        <View style={styles.scannerCard}>
          <View style={styles.scannerFrame}>
            <Ionicons name="qr-code" size={120} color="#2563EB" />
            <Text style={styles.scannerText}>Tap to Scan Vehicle QR</Text>
          </View>
          <TouchableOpacity style={styles.scanBtn} onPress={handleScan}>
            <Ionicons name="camera" size={24} color="#FFF" />
            <Text style={styles.scanBtnText}>Scan QR Code</Text>
          </TouchableOpacity>
        </View>

        {/* Last Scan Result */}
        {lastScan && (
          <View style={[styles.resultCard, { borderColor: lastScan.valid ? '#059669' : '#DC2626' }]}>
            <View style={styles.resultHeader}>
              <Ionicons name={lastScan.valid ? 'checkmark-circle' : 'close-circle'} size={28}
                color={lastScan.valid ? '#059669' : '#DC2626'} />
              <Text style={[styles.resultTitle, { color: lastScan.valid ? '#059669' : '#DC2626' }]}>
                {lastScan.valid ? 'Vehicle Verified' : 'Invalid QR'}
              </Text>
            </View>
            <View style={styles.resultDetails}>
              <Text style={styles.resultDetail}>Plate: {lastScan.plateNumber}</Text>
              <Text style={styles.resultDetail}>Driver: {lastScan.driverName}</Text>
              <Text style={styles.resultDetail}>Route: {lastScan.route}</Text>
              <Text style={styles.resultDetail}>Passengers: {lastScan.passengers}</Text>
              <Text style={styles.resultDetail}>Valid until: {lastScan.validUntil}</Text>
            </View>
          </View>
        )}

        {/* Recent Scans */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Scans</Text>
          {recentScans.map((scan, i) => (
            <View key={i} style={styles.scanItem}>
              <View style={styles.scanInfo}>
                <Text style={styles.scanVehicle}>{scan.vehicle}</Text>
                <Text style={styles.scanDriver}>{scan.driver}</Text>
                <Text style={styles.scanTime}>{scan.time}</Text>
              </View>
              <Text style={[styles.scanResult, { color: scan.result === 'VALID' ? '#059669' : '#DC2626' }]}>
                {scan.result}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, flex: 1 },
  scannerCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, marginBottom: 16, alignItems: 'center' },
  scannerFrame: { width: 200, height: 200, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: '#2563EB' },
  scannerText: { fontSize: 14, color: '#6B7280', marginTop: 12 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, gap: 8 },
  scanBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  resultCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 2 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  resultTitle: { fontSize: 16, fontWeight: '700' },
  resultDetails: { gap: 4 },
  resultDetail: { fontSize: 14, color: '#374151' },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  scanItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  scanInfo: { flex: 1 },
  scanVehicle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  scanDriver: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  scanTime: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  scanResult: { fontSize: 12, fontWeight: '700' },
});
