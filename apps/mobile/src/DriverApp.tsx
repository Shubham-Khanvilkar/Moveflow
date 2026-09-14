/**
 * MOVE-IN-SYNC — DRIVER MOBILE APP
 * React Native (Expo) — Complete driver experience
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  TextInput, FlatList, ActivityIndicator, RefreshControl, Linking,
  Platform, StatusBar, SafeAreaView, Dimensions, Modal, Image,
} from 'react-native';

// ============================================================
// CONFIG
// ============================================================

const API_BASE = __DEV__
  ? Platform.OS === 'android' ? 'http://10.0.2.2:3001/api' : 'http://localhost:3001/api'
  : 'https://api.moveflow.com/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================
// API HELPER
// ============================================================

let authToken: string | null = null;

async function api(path: string, opts?: RequestInit) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...opts?.headers,
      },
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

// ============================================================
// TYPES
// ============================================================

interface Trip {
  id: string; tripCode: string; status: string;
  passengerName: string; passengerPhone: string;
  pickupLocation: string; pickupLat: number; pickupLng: number;
  dropLocation: string; dropLat: number; dropLng: number;
  vehicleReg: string; scheduledTime: string;
  boardingCode?: string; otp?: string;
}

interface DriverProfile {
  id: string; firstName: string; lastName: string;
  phone: string; totalTrips: number; rating: number;
  isAvailable: boolean; shiftName: string;
  todayEarnings: number; thisMonthEarnings: number;
}

interface ContactAttempt {
  id: string; attemptNumber: number; attemptedAt: string;
  method: string; result: string; durationSeconds?: number; notes?: string;
}

interface InspectionItem {
  id: string; name: string; checked: boolean; notes: string;
  photoUri?: string;
}

// ============================================================
// SCREENS
// ============================================================

// ---------- LOGIN ----------
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!phone) return Alert.alert('Error', 'Enter phone number');
    setLoading(true);
    const res = await api('/auth/driver/send-otp', { method: 'POST', body: JSON.stringify({ phone }) });
    setLoading(false);
    if (res) setStep('otp');
    else Alert.alert('Error', 'Failed to send OTP');
  };

  const verifyOtp = async () => {
    if (!otp) return Alert.alert('Error', 'Enter OTP');
    setLoading(true);
    const res = await api('/auth/driver/verify-otp', { method: 'POST', body: JSON.stringify({ phone, otp }) });
    setLoading(false);
    if (res?.token) onLogin(res.token);
    else Alert.alert('Error', 'Invalid OTP');
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.loginContainer}>
        <View style={s.loginLogo}><Text style={s.loginLogoText}>M</Text></View>
        <Text style={s.loginTitle}>Navira</Text>
        <Text style={s.loginSubtitle}>Driver App</Text>
        {step === 'phone' ? (
          <>
            <TextInput style={s.input} placeholder="Phone Number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
            <TouchableOpacity style={s.btnPrimary} onPress={sendOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Send OTP</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput style={s.input} placeholder="Enter OTP" keyboardType="number-pad" value={otp} onChangeText={setOtp} maxLength={6} />
            <TouchableOpacity style={s.btnPrimary} onPress={verifyOtp} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Verify & Login</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('phone')}><Text style={s.linkText}>Change Number</Text></TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// ---------- TODAY'S TRIPS ----------
function TripsScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  const loadTrips = useCallback(async () => {
    const res = await api('/driver/trips/today');
    setTrips(res?.data || []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const updateStatus = async (tripId: string, status: string) => {
    await api(`/driver/trips/${tripId}/status`, { method: 'POST', body: JSON.stringify({ status }) });
    loadTrips();
  };

  const statusColors: Record<string, string> = {
    ASSIGNED: '#3B82F6', EN_ROUTE: '#8B5CF6', ARRIVED: '#F59E0B',
    BOARDING: '#10B981', IN_TRANSIT: '#3B82F6', COMPLETED: '#22C55E',
    CANCELLED: '#EF4444', NO_SHOW: '#EF4444',
  };

  return (
    <View style={s.screen}>
      <View style={s.header}><Text style={s.headerTitle}>Today's Trips</Text><Text style={s.headerSub}>{trips.length} assigned</Text></View>
      <FlatList
        data={trips} keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTrips(); }} />}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.tripCard} onPress={() => setSelectedTrip(item)}>
            <View style={s.tripHeader}>
              <Text style={s.tripCode}>{item.tripCode}</Text>
              <View style={[s.statusBadge, { backgroundColor: statusColors[item.status] || '#6B7280' }]}>
                <Text style={s.statusText}>{item.status.replace(/_/g, ' ')}</Text>
              </View>
            </View>
            <Text style={s.tripPassenger}>👤 {item.passengerName}</Text>
            <Text style={s.tripRoute}>📍 {item.pickupLocation} → 🏢 {item.dropLocation}</Text>
            <Text style={s.tripTime}>🕐 {item.scheduledTime}</Text>
            {item.otp && <Text style={s.tripOtp}>OTP: {item.otp}</Text>}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<View style={s.emptyState}><Text style={s.emptyIcon}>🚗</Text><Text style={s.emptyText}>No trips assigned today</Text></View>}
      />

      {/* Trip Detail Modal */}
      <Modal visible={!!selectedTrip} animationType="slide" onRequestClose={() => setSelectedTrip(null)}>
        {selectedTrip && (
          <SafeAreaView style={s.screen}>
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedTrip(null)}><Text style={s.modalClose}>✕ Close</Text></TouchableOpacity>
              <Text style={s.modalTitle}>{selectedTrip.tripCode}</Text>
            </View>
            <ScrollView style={{ padding: 16 }}>
              <View style={s.detailCard}>
                <Text style={s.detailLabel}>Passenger</Text>
                <Text style={s.detailValue}>{selectedTrip.passengerName}</Text>
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${selectedTrip.passengerPhone}`)}>
                  <Text style={s.callBtn}>📞 Call Employee</Text>
                </TouchableOpacity>
              </View>
              <View style={s.detailCard}>
                <Text style={s.detailLabel}>Pickup</Text>
                <Text style={s.detailValue}>{selectedTrip.pickupLocation}</Text>
                <TouchableOpacity style={s.navBtn} onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${selectedTrip.pickupLat},${selectedTrip.pickupLng}`)}>
                  <Text style={s.navBtnText}>🧭 Navigate to Pickup</Text>
                </TouchableOpacity>
              </View>
              <View style={s.detailCard}>
                <Text style={s.detailLabel}>Drop</Text>
                <Text style={s.detailValue}>{selectedTrip.dropLocation}</Text>
              </View>
              {selectedTrip.boardingCode && (
                <View style={s.detailCard}>
                  <Text style={s.detailLabel}>Boarding Code</Text>
                  <Text style={[s.detailValue, { fontSize: 24, fontWeight: 'bold', color: '#3B82F6' }]}>{selectedTrip.boardingCode}</Text>
                </View>
              )}
              {/* Status Actions */}
              <View style={s.actionGrid}>
                {selectedTrip.status === 'ASSIGNED' && (
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#8B5CF6' }]} onPress={() => updateStatus(selectedTrip.id, 'EN_ROUTE')}>
                    <Text style={s.actionBtnText}>🚗 Start En Route</Text>
                  </TouchableOpacity>
                )}
                {selectedTrip.status === 'EN_ROUTE' && (
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#F59E0B' }]} onPress={() => updateStatus(selectedTrip.id, 'ARRIVED')}>
                    <Text style={s.actionBtnText}>📍 Mark Arrived</Text>
                  </TouchableOpacity>
                )}
                {selectedTrip.status === 'ARRIVED' && (
                  <>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#10B981' }]} onPress={() => updateStatus(selectedTrip.id, 'BOARDING')}>
                      <Text style={s.actionBtnText}>✅ Boarding</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => updateStatus(selectedTrip.id, 'NO_SHOW')}>
                      <Text style={s.actionBtnText}>🚫 Passenger Not Present</Text>
                    </TouchableOpacity>
                  </>
                )}
                {selectedTrip.status === 'BOARDING' && (
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#3B82F6' }]} onPress={() => updateStatus(selectedTrip.id, 'IN_TRANSIT')}>
                    <Text style={s.actionBtnText}>▶️ Start Trip</Text>
                  </TouchableOpacity>
                )}
                {selectedTrip.status === 'IN_TRANSIT' && (
                  <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#22C55E' }]} onPress={() => updateStatus(selectedTrip.id, 'COMPLETED')}>
                    <Text style={s.actionBtnText}>🏁 Complete Trip</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => Linking.openURL('tel:112')}>
                  <Text style={s.actionBtnText}>🚨 SOS Emergency</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

// ---------- NO-SHOW FLOW ----------
function NoShowScreen({ tripId, tripCode, passengerName }: { tripId: string; tripCode: string; passengerName: string }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [attempts, setAttempts] = useState<ContactAttempt[]>([]);
  const [callLoading, setCallLoading] = useState(false);
  const [supervisorRequested, setSupervisorRequested] = useState(false);

  const reasons = [
    'Employee not responding', 'Employee not at pickup location',
    'Employee unreachable', 'Employee cancelled verbally', 'Other',
  ];

  const recordCall = async (method: string) => {
    setCallLoading(true);
    const res = await api('/driver/no-show/call-attempt', {
      method: 'POST',
      body: JSON.stringify({ tripId, method, attemptNumber: attempts.length + 1 }),
    });
    if (res?.data) setAttempts((a) => [...a, res.data]);
    setCallLoading(false);
  };

  const requestSupervisor = async () => {
    const res = await api('/driver/no-show/supervisor-call', {
      method: 'POST',
      body: JSON.stringify({ tripId, reason: 'Employee not reachable after multiple attempts' }),
    });
    if (res) setSupervisorRequested(true);
  };

  const submitNoShow = async () => {
    if (!reason) return Alert.alert('Error', 'Select a reason');
    const res = await api('/driver/no-show/submit', {
      method: 'POST',
      body: JSON.stringify({ tripId, reason, note, contactAttempts: attempts.length }),
    });
    if (res) { Alert.alert('Submitted', 'No-show evidence submitted'); }
    else Alert.alert('Error', 'Failed to submit');
  };

  return (
    <View style={{ padding: 16, flex: 1 }}>
      <Text style={s.sectionTitle}>🚫 No-Show: {passengerName}</Text>
      <Text style={s.sectionSub}>Trip: {tripCode}</Text>

      {/* Call Employee */}
      <View style={s.callSection}>
        <Text style={s.detailLabel}>📞 Contact Attempts ({attempts.length})</Text>
        <View style={s.callBtnRow}>
          <TouchableOpacity style={s.callBtn2} onPress={() => recordCall('PHONE_CALL')} disabled={callLoading}>
            <Text>📞 Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.callBtn2} onPress={() => recordCall('SMS')}>
            <Text>💬 SMS</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.callBtn2} onPress={() => recordCall('WHATSAPP')}>
            <Text>📱 WhatsApp</Text>
          </TouchableOpacity>
        </View>
        {attempts.map((a) => (
          <View key={a.id} style={s.attemptRow}>
            <Text>#{a.attemptNumber} {a.method} — {a.result} ({new Date(a.attemptedAt).toLocaleTimeString()})</Text>
          </View>
        ))}
      </View>

      {/* Supervisor */}
      <TouchableOpacity style={[s.btnSecondary, supervisorRequested && { opacity: 0.5 }]} onPress={requestSupervisor} disabled={supervisorRequested}>
        <Text style={s.btnSecondaryText}>{supervisorRequested ? '✅ Supervisor Requested' : '🧑‍💼 Request Supervisor Call'}</Text>
      </TouchableOpacity>

      {/* Reason */}
      <Text style={[s.detailLabel, { marginTop: 16 }]}>Reason</Text>
      {reasons.map((r) => (
        <TouchableOpacity key={r} style={[s.reasonOption, reason === r && s.reasonActive]} onPress={() => setReason(r)}>
          <Text style={reason === r ? { color: '#fff' } : {}}>{r}</Text>
        </TouchableOpacity>
      ))}

      <TextInput style={[s.input, { marginTop: 12 }]} placeholder="Optional note" value={note} onChangeText={setNote} multiline />

      <TouchableOpacity style={[s.btnPrimary, { marginTop: 16 }]} onPress={submitNoShow}>
        <Text style={s.btnText}>Submit No-Show Evidence</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------- VEHICLE INSPECTION ----------
function InspectionScreen() {
  const [items, setItems] = useState<InspectionItem[]>([
    { id: '1', name: 'Tyres', checked: false, notes: '' },
    { id: '2', name: 'Brakes', checked: false, notes: '' },
    { id: '3', name: 'Lights', checked: false, notes: '' },
    { id: '4', name: 'AC', checked: false, notes: '' },
    { id: '5', name: 'Seat Belts', checked: false, notes: '' },
    { id: '6', name: 'Cleanliness', checked: false, notes: '' },
    { id: '7', name: 'Fuel/Battery', checked: false, notes: '' },
    { id: '8', name: 'First Aid Kit', checked: false, notes: '' },
    { id: '9', name: 'Emergency Equipment', checked: false, notes: '' },
    { id: '10', name: 'Documents', checked: false, notes: '' },
  ]);

  const toggleItem = (id: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const allChecked = items.every((i) => i.checked);
  const submitInspection = async () => {
    const res = await api('/driver/inspection', {
      method: 'POST',
      body: JSON.stringify({ items, allPassed: allChecked }),
    });
    if (res) Alert.alert('Done', 'Inspection submitted');
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}><Text style={s.headerTitle}>🔍 Pre-Trip Inspection</Text></View>
      <FlatList data={items} keyExtractor={(i) => i.id} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.inspectionItem} onPress={() => toggleItem(item.id)}>
            <Text style={{ fontSize: 20 }}>{item.checked ? '✅' : '⬜'}</Text>
            <Text style={{ flex: 1, marginLeft: 12, fontSize: 16 }}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
      <View style={{ padding: 16 }}>
        <TouchableOpacity style={[s.btnPrimary, !allChecked && { backgroundColor: '#F59E0B' }]} onPress={submitInspection}>
          <Text style={s.btnText}>{allChecked ? '✅ Submit Inspection' : '⚠️ Submit with Issues'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------- NAVIGATION ----------
function NavigationScreen({ trip }: { trip: Trip }) {
  const openGoogleMaps = () => {
    const dest = trip.pickupLocation || `${trip.pickupLat},${trip.pickupLng}`;
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`);
  };
  const openAppleMaps = () => {
    const dest = `${trip.pickupLat},${trip.pickupLng}`;
    Linking.openURL(`http://maps.apple.com/?daddr=${dest}`);
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={s.sectionTitle}>🧭 Navigation</Text>
      <View style={s.detailCard}>
        <Text style={s.detailLabel}>Destination</Text>
        <Text style={s.detailValue}>{trip.pickupLocation}</Text>
      </View>
      <TouchableOpacity style={[s.btnPrimary, { marginTop: 12, backgroundColor: '#34A853' }]} onPress={openGoogleMaps}>
        <Text style={s.btnText}>🗺️ Open Google Maps</Text>
      </TouchableOpacity>
      {Platform.OS === 'ios' && (
        <TouchableOpacity style={[s.btnPrimary, { marginTop: 8, backgroundColor: '#007AFF' }]} onPress={openAppleMaps}>
          <Text style={s.btnText}>🗺️ Open Apple Maps</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ---------- PREFERRED AREAS ----------
function PreferredAreasScreen() {
  const [areas, setAreas] = useState<any[]>([]);
  const [newArea, setNewArea] = useState('');
  const [level, setLevel] = useState('PRIMARY');

  const addArea = async () => {
    if (!newArea) return;
    await api('/driver/preferred-areas', { method: 'POST', body: JSON.stringify({ areaName: newArea, priorityLevel: level }) });
    setNewArea('');
    loadAreas();
  };

  const loadAreas = async () => {
    const res = await api('/driver/preferred-areas');
    setAreas(res?.data || []);
  };

  useEffect(() => { loadAreas(); }, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}><Text style={s.headerTitle}>📍 Preferred Areas</Text></View>
      <View style={{ padding: 16, flexDirection: 'row', gap: 8 }}>
        <TextInput style={[s.input, { flex: 1 }]} placeholder="Area name" value={newArea} onChangeText={setNewArea} />
        <TouchableOpacity style={s.btnSmall} onPress={addArea}><Text style={s.btnSmallText}>Add</Text></TouchableOpacity>
      </View>
      <FlatList data={areas} keyExtractor={(i) => i.id} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={s.areaItem}>
            <Text style={{ flex: 1 }}>{item.areaName}</Text>
            <Text style={[s.statusBadge, { backgroundColor: item.priorityLevel === 'PRIMARY' ? '#10B981' : '#F59E0B' }]}>
              <Text style={s.statusText}>{item.priorityLevel}</Text>
            </Text>
          </View>
        )}
      />
    </View>
  );
}

// ---------- DRIVER PROFILE / DASHBOARD ----------
function ProfileScreen() {
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  useEffect(() => { api('/driver/profile').then(setProfile); }, []);

  return (
    <ScrollView style={{ padding: 16 }}>
      <View style={s.profileCard}>
        <View style={s.profileAvatar}><Text style={{ fontSize: 32 }}>🚗</Text></View>
        <Text style={s.profileName}>{profile?.firstName} {profile?.lastName}</Text>
        <Text style={s.profileSub}>{profile?.phone} • {profile?.shiftName}</Text>
      </View>
      <View style={s.statsRow}>
        <View style={s.statBox}><Text style={s.statValue}>{profile?.totalTrips ?? 0}</Text><Text style={s.statLabel}>Total Trips</Text></View>
        <View style={s.statBox}><Text style={s.statValue}>⭐ {profile?.rating?.toFixed(1) ?? '-'}</Text><Text style={s.statLabel}>Rating</Text></View>
        <View style={s.statBox}><Text style={s.statValue}>₹{profile?.todayEarnings ?? 0}</Text><Text style={s.statLabel}>Today</Text></View>
        <View style={s.statBox}><Text style={s.statValue}>₹{profile?.thisMonthEarnings ?? 0}</Text><Text style={s.statLabel}>This Month</Text></View>
      </View>
      <View style={{ marginTop: 16 }}>
        {['📋 Trip History', '💰 Earnings', '⚙️ Settings', '🎧 Help & Support', '📞 Call Supervisor'].map((item) => (
          <TouchableOpacity key={item} style={s.menuItem}><Text style={{ fontSize: 16 }}>{item}</Text><Text style={{ color: '#9CA3AF' }}>→</Text></TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

// ============================================================
// MAIN DRIVER APP (TAB NAVIGATION)
// ============================================================

export default function DriverApp() {
  const [token, setToken] = useState<string | null>(authToken);
  const [tab, setTab] = useState<'trips' | 'inspection' | 'areas' | 'profile'>('trips');

  useEffect(() => { authToken = token; }, [token]);

  if (!token) return <LoginScreen onLogin={(t) => setToken(t)} />;

  const tabs = [
    { id: 'trips' as const, icon: '🗺️', label: 'Trips' },
    { id: 'inspection' as const, icon: '🔍', label: 'Inspect' },
    { id: 'areas' as const, icon: '📍', label: 'Areas' },
    { id: 'profile' as const, icon: '👤', label: 'Profile' },
  ];

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {tab === 'trips' && <TripsScreen />}
      {tab === 'inspection' && <InspectionScreen />}
      {tab === 'areas' && <PreferredAreasScreen />}
      {tab === 'profile' && <ProfileScreen />}

      {/* Bottom Tab Bar */}
      <View style={s.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity key={t.id} style={[s.tabItem, tab === t.id && s.tabActive]} onPress={() => setTab(t.id)}>
            <Text style={s.tabIcon}>{t.icon}</Text>
            <Text style={[s.tabLabel, tab === t.id && { color: '#2563EB', fontWeight: '600' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

// ============================================================
// STYLES
// ============================================================

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loginLogo: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  loginLogoText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  loginTitle: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  loginSubtitle: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 14, fontSize: 16, marginTop: 12 },
  btnPrimary: { backgroundColor: '#2563EB', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  btnSecondary: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  btnSecondaryText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkText: { color: '#2563EB', fontSize: 14, marginTop: 16, textDecorationLine: 'underline' },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  headerSub: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  tripCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tripCode: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  tripPassenger: { fontSize: 14, color: '#374151', marginBottom: 4 },
  tripRoute: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  tripTime: { fontSize: 14, color: '#6B7280' },
  tripOtp: { fontSize: 18, fontWeight: 'bold', color: '#2563EB', marginTop: 8 },
  modalHeader: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalClose: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  detailCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  detailLabel: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  detailValue: { fontSize: 16, fontWeight: '600', color: '#111827' },
  callBtn: { color: '#2563EB', fontSize: 16, fontWeight: '600', marginTop: 8 },
  navBtn: { backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, marginTop: 8 },
  navBtnText: { color: '#2563EB', fontWeight: '600', textAlign: 'center' },
  actionGrid: { gap: 8, marginTop: 16 },
  actionBtn: { borderRadius: 12, padding: 16, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#6B7280' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  sectionSub: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  callSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  callBtnRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  callBtn2: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 8, padding: 12, alignItems: 'center' },
  attemptRow: { padding: 8, backgroundColor: '#F9FAFB', borderRadius: 8, marginTop: 8 },
  reasonOption: { padding: 12, borderRadius: 8, marginTop: 4, backgroundColor: '#F3F4F6' },
  reasonActive: { backgroundColor: '#2563EB' },
  inspectionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 12, marginBottom: 8 },
  areaItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 12, marginBottom: 8 },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center' },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  profileName: { fontSize: 20, fontWeight: 'bold', marginTop: 12 },
  profileSub: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 12, marginBottom: 8 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingBottom: Platform.OS === 'ios' ? 20 : 8 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabActive: { borderTopWidth: 2, borderTopColor: '#2563EB' },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  btnSmall: { backgroundColor: '#2563EB', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12 },
  btnSmallText: { color: '#fff', fontWeight: '600' },
});
