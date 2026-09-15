import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationsApi } from '../services/api';
import { EmptyState, LoadingState } from '../components/ui';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    try {
      const data = await notificationsApi.list();
      setNotifications(Array.isArray(data) ? data : (data as any)?.data || []);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadNotifications(); }, []);

  const markAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  if (loading) return <LoadingState message="Loading notifications..." />;

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadNotifications(); }} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.notifCard, !item.isRead && styles.unread]}
            onPress={() => markAsRead(item.id)}
          >
            <View style={styles.notifIcon}>
              <Ionicons name={item.icon || 'notifications'} size={20} color="#2563EB" />
            </View>
            <View style={styles.notifInfo}>
              <Text style={styles.notifTitle}>{item.title || 'Notification'}</Text>
              <Text style={styles.notifMessage}>{item.message || item.body || ''}</Text>
              <Text style={styles.notifTime}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}</Text>
            </View>
            {!item.isRead && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState title="No notifications" message="You're all caught up!" icon="notifications-outline" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  notifCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 8 },
  unread: { borderLeftWidth: 4, borderLeftColor: '#2563EB' },
  notifIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  notifInfo: { flex: 1, marginLeft: 12 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  notifMessage: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  notifTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB' },
});
