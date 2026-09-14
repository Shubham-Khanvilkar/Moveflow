import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual API call
    setNotifications([
      {
        id: '1',
        title: 'Ride Confirmed',
        message: 'Your morning ride has been confirmed.',
        timestamp: new Date().toISOString(),
        read: false,
      },
      {
        id: '2',
        title: 'Schedule Update',
        message: 'Your pickup time has been updated to 8:30 AM.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: true,
      },
    ]);
    setLoading(false);
  }, []);

  const renderItem = ({ item }: { item: Notification }) => (
    <View style={[styles.notificationItem, !item.read && styles.unread]}>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.message}>{item.message}</Text>
      <Text style={styles.timestamp}>
        {new Date(item.timestamp).toLocaleString()}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Notifications</Text>
      {notifications.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { fontSize: 24, fontWeight: 'bold', padding: 16, color: '#111827' },
  list: { padding: 16 },
  notificationItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unread: { borderLeftWidth: 4, borderLeftColor: '#2563EB' },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  message: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  timestamp: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#9CA3AF' },
});
