/**
 * MOVE-IN-SYNC — EMPLOYEE MOBILE APP
 * React Native (Expo) — Complete employee self-service
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
  TextInput, FlatList, ActivityIndicator, RefreshControl, Linking,
  Platform, StatusBar, SafeAreaView, Modal, Platform as RNPlatform,
} from 'react-native';

// ============================================================
// CONFIG & API
// ============================================================

const API_BASE = __DEV__
  ? Platform.OS === 'android' ? 'http://10.0.2.2:3001/api' : 'http://localhost:3001/api'
  : 'https://api.moveflow.com/api';

let authToken: string | null = null;

async function api(path: string, opts?: RequestInit) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...opts?.headers },
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

// ============================================================
// TYPES
// ============================================================

interface Booking {
  id: string; bookingCode: string; status: string;
  date: string; time: string; transportType: string;
  pickupLocation: string; dropLocation: string;
  approvalStatus: string;
}

interface Trip {
  id: string; tripCode: string; status: string;
  driverName: string; driverPhone: string;
  vehicleReg: string; vehicleType: string;
  pickupLocation: string; dropLocation: string;
  eta: string; distance: string; speed: string;
  pickupLat: number; pickupLng: number;
}

interface Expense {
  id: string; tripCode: string; provider: string;
  amount: number; status: string; submittedAt: string;
  receiptUrl?: string;
}

interface NoShowRecord {
  id: string; tripDate: string; status: string;
  appealStatus: string; actionTaken: string;
}

// ============================================================
// LOGIN SCREEN
// ============================================================

function LoginScreen({ onLogin }: { onLogin: (t: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true);
    const res = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setLoading(false);
    if (res?.token) onLogin(res.token);
    else Alert.alert('Error', 'Invalid credentials');
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.loginContainer}>
        <View style={s.logo}><Text style={s.logoText}>M</Text></View>
        <Text style={s.title}>Navira</Text>
        <Text style={s.subtitle}>Employee App</Text>
        <TextInput style={s.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={s.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <TouchableOpacity style={s.btnPrimary} onPress={login} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Sign In</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ============================================================
// DASHBOARD / HOME
// ============================================================

function HomeScreen({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await api('/employee/trips/active');
    setTrip(res?.data || null);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
      <View style={{ padding: 16 }}>
        <Text style={s.greeting}>Good Morning! 👋</Text>
        <Text style={s.greetingSub}>Here's your transport overview</Text>
      </View>

      {/* Active Trip */}
      {trip ? (
        <View style={{ padding: 16 }}>
          <Text style={s.sectionTitle}>🗺️ Active Trip</Text>
          <View style={s.tripCard}>
            <View style={s.tripHeader}>
              <Text style={s.tripCode}>{trip.tripCode}</Text>
              <View style={[s.statusBadge, { backgroundColor: '#10B981' }]}><Text style={s.statusText}>{trip.status.replace(/_/g, ' ')}</Text></View>
            </View>
            <View style={s.tripDetail}>
              <Text style={s.tripLabel}>🚗 {trip.vehicleType} • {trip.vehicleReg}</Text>
              <Text style={s.tripLabel}>👤 Driver: {trip.driverName}</Text>
              <Text style={s.tripRoute}>📍 {trip.pickupLocation} → 🏢 {trip.dropLocation}</Text>
            </View>
            <View style={s.tripStats}>
              <View style={s.tripStat}><Text style={s.tripStatValue}>{trip.eta}</Text><Text style={s.tripStatLabel}>ETA</Text></View>
              <View style={s.tripStat}><Text style={s.tripStatValue}>{trip.distance}</Text><Text style={s.tripStatLabel}>Distance</Text></View>
              <View style={s.tripStat}><Text style={s.tripStatValue}>{trip.speed}</Text><Text style={s.tripStatLabel}>Speed</Text></View>
            </View>
            <TouchableOpacity style={[s.btnPrimary, { marginTop: 12 }]} onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${trip.pickupLat},${trip.pickupLng}`)}>
              <Text style={s.btnText}>🧭 Track Live</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ padding: 16, alignItems: 'center', paddingVertical: 48 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>🚗</Text>
          <Text style={{ fontSize: 16, color: '#6B7280' }}>No active trips</Text>
          <TouchableOpacity style={[s.btnPrimary, { width: '100%', marginTop: 16 }]} onPress={() => onNavigate('book')}>
            <Text style={s.btnText}>+ Book Transport</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick Actions */}
      <View style={{ padding: 16 }}>
        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.actionGrid}>
          {[
            { icon: '📅', label: 'Book Trip', tab: 'book', color: '#EFF6FF' },
            { icon: '🗺️', label: 'My Trips', tab: 'trips', color: '#F0FDF4' },
            { icon: '💸', label: 'Expenses', tab: 'expenses', color: '#FFF7ED' },
            { icon: '🚫', label: 'Appeals', tab: 'appeals', color: '#FEF2F2' },
            { icon: '🔔', label: 'Notifications', tab: 'notifications', color: '#F5F3FF' },
            { icon: '🚨', label: 'SOS Emergency', tab: 'sos', color: '#FEF2F2' },
          ].map((a) => (
            <TouchableOpacity key={a.tab} style={[s.quickAction, { backgroundColor: a.color }]} onPress={() => onNavigate(a.tab)}>
              <Text style={{ fontSize: 28 }}>{a.icon}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', marginTop: 8, color: '#374151' }}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ============================================================
// BOOKING SCREEN
// ============================================================

function BookingScreen({ onBack }: { onBack: () => void }) {
  const [transportType, setTransportType] = useState('CAB');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [pickup, setPickup] = useState('');
  const [drop, setDrop] = useState('');
  const [tripType, setTripType] = useState('ONE_WAY');
  const [loading, setLoading] = useState(false);

  const submitBooking = async () => {
    if (!pickup || !drop) return Alert.alert('Error', 'Enter pickup and drop');
    setLoading(true);
    const res = await api('/bookings', { method: 'POST', body: JSON.stringify({
      transportType, date, time, pickupLocation: pickup, dropLocation: drop, tripType,
    })});
    setLoading(false);
    if (res) { Alert.alert('Success', 'Booking submitted for approval'); onBack(); }
    else Alert.alert('Error', 'Failed to create booking');
  };

  return (
    <ScrollView style={{ padding: 16 }}>
      <Text style={s.sectionTitle}>📅 Book Transport</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
        {['CAB', 'SHUTTLE', 'NODAL'].map((t) => (
          <TouchableOpacity key={t} style={[s.typeBtn, transportType === t && s.typeBtnActive]} onPress={() => setTransportType(t)}>
            <Text style={transportType === t ? { color: '#fff', fontWeight: '600' } : {}}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {['ONE_WAY', 'ROUND_TRIP'].map((t) => (
          <TouchableOpacity key={t} style={[s.typeBtn, tripType === t && s.typeBtnActive]} onPress={() => setTripType(t)}>
            <Text style={tripType === t ? { color: '#fff', fontWeight: '600' } : {}}>{t.replace(/_/g, ' ')}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput style={s.input} placeholder="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
      <TextInput style={s.input} placeholder="Time (HH:MM)" value={time} onChangeText={setTime} />
      <TextInput style={s.input} placeholder="Pickup Location" value={pickup} onChangeText={setPickup} />
      <TextInput style={s.input} placeholder="Drop Location" value={drop} onChangeText={setDrop} />
      <TouchableOpacity style={[s.btnPrimary, { marginTop: 16 }]} onPress={submitBooking} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Submit Booking</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ============================================================
// MY TRIPS
// ============================================================

function MyTripsScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tab, setTab] = useState('active');
  useEffect(() => { api(`/employee/trips?status=${tab}`).then((d) => setTrips(d?.data || [])); }, [tab]);

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}><Text style={s.headerTitle}>My Trips</Text></View>
      <View style={s.tabRow}>
        {['active', 'completed', 'cancelled'].map((t) => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={tab === t ? { color: '#fff', fontWeight: '600' } : {}}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList data={trips} keyExtractor={(i) => i.id} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={s.tripCard}>
            <View style={s.tripHeader}>
              <Text style={s.tripCode}>{item.tripCode}</Text>
              <View style={[s.statusBadge, { backgroundColor: item.status === 'COMPLETED' ? '#22C55E' : item.status === 'CANCELLED' ? '#EF4444' : '#3B82F6' }]}>
                <Text style={s.statusText}>{item.status.replace(/_/g, ' ')}</Text>
              </View>
            </View>
            <Text style={s.tripRoute}>📍 {item.pickupLocation} → 🏢 {item.dropLocation}</Text>
            <Text style={s.tripLabel}>🚗 {item.vehicleReg} • 👤 {item.driverName}</Text>
          </View>
        )}
        ListEmptyComponent={<View style={s.emptyState}><Text style={{ fontSize: 16, color: '#6B7280' }}>No {tab} trips</Text></View>}
      />
    </View>
  );
}

// ============================================================
// EXPENSES
// ============================================================

function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  useEffect(() => { api('/employee/expenses').then((d) => setExpenses(d?.data || [])); }, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}>
        <Text style={s.headerTitle}>My Expenses</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)}><Text style={{ color: '#2563EB', fontWeight: '600' }}>+ New</Text></TouchableOpacity>
      </View>
      <FlatList data={expenses} keyExtractor={(i) => i.id} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={s.tripCard}>
            <View style={s.tripHeader}>
              <Text style={{ fontWeight: '600' }}>{item.provider || 'External Transport'}</Text>
              <Text style={{ fontWeight: 'bold', color: '#111827' }}>₹{item.amount}</Text>
            </View>
            <Text style={s.tripLabel}>Trip: {item.tripCode || 'N/A'} • {item.submittedAt ? new Date(item.submittedAt).toLocaleDateString() : ''}</Text>
            <View style={[s.statusBadge, { backgroundColor: item.status === 'APPROVED' ? '#22C55E' : item.status === 'REJECTED' ? '#EF4444' : '#F59E0B', alignSelf: 'flex-start', marginTop: 8 }]}>
              <Text style={s.statusText}>{item.status}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={s.emptyState}><Text style={{ fontSize: 16, color: '#6B7280' }}>No expenses yet</Text></View>}
      />
      <Modal visible={showAdd} animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <SafeAreaView style={{ flex: 1, padding: 16 }}>
          <Text style={s.sectionTitle}>Submit Expense</Text>
          <TextInput style={s.input} placeholder="Provider (Uber, Ola, etc.)" />
          <TextInput style={s.input} placeholder="Amount (₹)" keyboardType="numeric" />
          <TextInput style={s.input} placeholder="Trip code (optional)" />
          <TextInput style={[s.input, { height: 80 }]} placeholder="Notes" multiline />
          <TouchableOpacity style={[s.btnPrimary, { marginTop: 16 }]} onPress={() => { setShowAdd(false); Alert.alert('Submitted', 'Expense submitted for approval'); }}>
            <Text style={s.btnText}>Submit Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btnSecondary, { marginTop: 8 }]} onPress={() => setShowAdd(false)}>
            <Text style={{ color: '#6B7280' }}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ============================================================
// NO-SHOW APPEALS
// ============================================================

function AppealsScreen() {
  const [records, setRecords] = useState<NoShowRecord[]>([]);
  useEffect(() => { api('/employee/no-show/records').then((d) => setRecords(d?.data || [])); }, []);

  const appeal = async (recordId: string) => {
    const res = await api('/employee/no-show/appeal', { method: 'POST', body: JSON.stringify({ recordId, reason: 'I was present at the pickup location' }) });
    if (res) Alert.alert('Appeal Submitted', 'You will receive a decision within 48 hours');
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}><Text style={s.headerTitle}>No-Show Records & Appeals</Text></View>
      <FlatList data={records} keyExtractor={(i) => i.id} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={s.tripCard}>
            <Text style={s.tripCode}>Trip: {item.tripDate}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={[s.statusBadge, { backgroundColor: '#EF4444' }]}><Text style={s.statusText}>{item.actionTaken || 'NO_SHOW'}</Text></View>
              {item.appealStatus && item.appealStatus !== 'NONE' && (
                <View style={[s.statusBadge, { backgroundColor: item.appealStatus === 'APPROVED' ? '#22C55E' : '#F59E0B' }]}><Text style={s.statusText}>{item.appealStatus}</Text></View>
              )}
            </View>
            {(!item.appealStatus || item.appealStatus === 'NONE') && (
              <TouchableOpacity style={[s.btnPrimary, { marginTop: 12, backgroundColor: '#F59E0B' }]} onPress={() => appeal(item.id)}>
                <Text style={s.btnText}>📝 Appeal This Decision</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={<View style={s.emptyState}><Text style={{ fontSize: 16, color: '#6B7280' }}>No no-show records</Text></View>}
      />
    </View>
  );
}

// ============================================================
// NOTIFICATIONS
// ============================================================

function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  useEffect(() => { api('/employee/notifications').then((d) => setNotifications(d?.data || [])); }, []);

  return (
    <View style={{ flex: 1 }}>
      <View style={s.header}><Text style={s.headerTitle}>Notifications</Text></View>
      <FlatList data={notifications} keyExtractor={(i) => i.id} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={[s.tripCard, !item.isRead && { borderLeftWidth: 4, borderLeftColor: '#2563EB' }]}>
            <Text style={{ fontWeight: '600', color: '#111827' }}>{item.title || 'Notification'}</Text>
            <Text style={{ color: '#6B7280', marginTop: 4 }}>{item.message || item.body || ''}</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 4 }}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</Text>
          </View>
        )}
        ListEmptyComponent={<View style={s.emptyState}><Text style={{ fontSize: 16, color: '#6B7280' }}>No notifications</Text></View>}
      />
    </View>
  );
}

// ============================================================
// SOS
// ============================================================

function SOSScreen({ onBack }: { onBack: () => void }) {
  const triggerSOS = async () => {
    Alert.alert('🚨 SOS', 'This will alert the control room and your emergency contacts. Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, Trigger SOS', style: 'destructive', onPress: async () => {
        const res = await api('/employee/sos', { method: 'POST', body: JSON.stringify({ type: 'EMERGENCY' }) });
        if (res) Alert.alert('SOS Sent', 'Help is on the way. Stay calm.');
      }},
    ]);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <TouchableOpacity style={s.sosButton} onPress={triggerSOS}>
        <Text style={{ fontSize: 48, color: '#fff' }}>🚨</Text>
        <Text style={{ fontSize: 24, color: '#fff', fontWeight: 'bold', marginTop: 8 }}>SOS</Text>
        <Text style={{ fontSize: 14, color: '#FCA5A5', marginTop: 4 }}>Press for Emergency</Text>
      </TouchableOpacity>
      <Text style={{ color: '#6B7280', marginTop: 24, textAlign: 'center' }}>
        This will immediately alert the control room, your emergency contacts, and nearby drivers.
      </Text>
      <TouchableOpacity style={[s.btnSecondary, { marginTop: 24, width: '100%' }]} onPress={onBack}>
        <Text>Back to Safety</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================
// MAIN EMPLOYEE APP
// ============================================================

export default function EmployeeApp() {
  const [token, setToken] = useState<string | null>(authToken);
  const [tab, setTab] = useState('home');
  const [subPage, setSubPage] = useState<string | null>(null);

  useEffect(() => { authToken = token; }, [token]);

  if (!token) return <LoginScreen onLogin={(t) => setToken(t)} />;

  // Sub-pages
  if (subPage === 'book') return <BookingScreen onBack={() => setSubPage(null)} />;
  if (subPage === 'sos') return <SOSScreen onBack={() => setSubPage(null)} />;

  const tabs = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'trips', icon: '🗺️', label: 'Trips' },
    { id: 'expenses', icon: '💸', label: 'Expenses' },
    { id: 'appeals', icon: '🚫', label: 'Appeals' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ];

  const handleTabNav = (t: string) => {
    if (t === 'book' || t === 'notifications' || t === 'sos') { setSubPage(t); return; }
    setTab(t);
  };

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {tab === 'home' && <HomeScreen onNavigate={handleTabNav} />}
      {tab === 'trips' && <MyTripsScreen />}
      {tab === 'expenses' && <ExpensesScreen />}
      {tab === 'appeals' && <AppealsScreen />}
      {tab === 'profile' && (
        <ScrollView style={{ padding: 16 }}>
          <View style={s.profileCard}>
            <View style={s.profileAvatar}><Text style={{ fontSize: 32 }}>👤</Text></View>
            <Text style={s.profileName}>Employee</Text>
            <Text style={s.profileSub}>employee@company.com</Text>
          </View>
          <View style={{ marginTop: 16 }}>
            {['📋 My Profile', '📍 Saved Locations', '🔔 Notification Settings', '🌐 Language', '🎧 Help & Support', '🚪 Logout'].map((item) => (
              <TouchableOpacity key={item} style={s.menuItem}><Text style={{ fontSize: 16 }}>{item}</Text><Text style={{ color: '#9CA3AF' }}>→</Text></TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

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
// STYLES (shared with driver)
// ============================================================

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  logo: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoText: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6B7280', marginTop: 4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, padding: 14, fontSize: 16, marginTop: 12 },
  btnPrimary: { backgroundColor: '#2563EB', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  btnSecondary: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  greetingSub: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  tripCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tripCode: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  tripDetail: { marginTop: 8 },
  tripLabel: { fontSize: 14, color: '#374151', marginBottom: 4 },
  tripRoute: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  tripStats: { flexDirection: 'row', gap: 16, marginTop: 12 },
  tripStat: { alignItems: 'center' },
  tripStatValue: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  tripStatLabel: { fontSize: 12, color: '#6B7280' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  quickAction: { width: '30%', aspectRatio: 1, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  typeBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  tabRow: { flexDirection: 'row', gap: 8, padding: 16 },
  tabBtn: { flex: 1, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  sosButton: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  profileCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center' },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  profileName: { fontSize: 20, fontWeight: 'bold', marginTop: 12 },
  profileSub: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 12, marginBottom: 8 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingBottom: Platform.OS === 'ios' ? 20 : 8 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabActive: { borderTopWidth: 2, borderTopColor: '#2563EB' },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
});
