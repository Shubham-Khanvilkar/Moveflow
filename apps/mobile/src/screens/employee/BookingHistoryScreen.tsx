import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { bookingsApi } from '../../services/api';

interface Booking {
  id: string;
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  status: string;
  vehicleType: string;
  fare: string;
  bookingCode?: string;
}

interface BookingHistoryScreenProps {
  navigation: any;
}

export default function BookingHistoryScreen({ navigation }: BookingHistoryScreenProps) {
  const { user, token } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await bookingsApi.list({ limit: 50 });
      const data = Array.isArray(response) ? response : (response as any).data || (response as any).bookings || [];
      setBookings(data.map((b: any) => ({
        id: b.id,
        pickup: b.pickupLocation || b.pickupAddress || '',
        dropoff: b.dropLocation || b.dropAddress || '',
        date: b.scheduledDate || b.date || '',
        time: b.scheduledTime || b.time || '',
        status: b.status || 'PENDING',
        vehicleType: b.vehicleType || 'CAB',
        fare: b.estimatedCost ? `₹${b.estimatedCost}` : 'N/A',
        bookingCode: b.bookingCode,
      })));
    } catch (err: any) {
      console.error('Failed to load bookings:', err);
      setError(err.message || 'Failed to load bookings');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const filteredBookings = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status.toLowerCase() === filter);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return '#059669';
      case 'cancelled': return '#EF4444';
      case 'upcoming':
      case 'pending':
      case 'scheduled': return '#2563EB';
      case 'dispatched':
      case 'driver_accepted':
      case 'en_route_to_pickup':
      case 'in_transit': return '#3b82f6';
      default: return '#6B7280';
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'shuttle': return 'bus';
      case 'ev': return 'flash';
      case 'bike': return 'bicycle';
      default: return 'car';
    }
  };

  const renderBooking = ({ item }: { item: Booking }) => (
    <TouchableOpacity style={styles.bookingCard} onPress={() => {}}>
      <View style={styles.bookingHeader}>
        <View style={styles.vehicleBadge}>
          <Ionicons name={getVehicleIcon(item.vehicleType) as any} size={16} color="#2563EB" />
          <Text style={styles.vehicleText}>{item.vehicleType}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
          <Text style={styles.routeText} numberOfLines={1}>{item.pickup}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.routeText} numberOfLines={1}>{item.dropoff}</Text>
        </View>
      </View>

      <View style={styles.bookingFooter}>
        <View style={styles.footerItem}>
          <Ionicons name="calendar" size={14} color="#6B7280" />
          <Text style={styles.footerText}>{item.date}</Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="time" size={14} color="#6B7280" />
          <Text style={styles.footerText}>{item.time}</Text>
        </View>
        <Text style={styles.fareText}>{item.fare}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {['all', 'completed', 'upcoming', 'cancelled'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Failed to Load</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadBookings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="car" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Bookings Found</Text>
          <Text style={styles.emptySubtitle}>
            {filter === 'all' ? "You haven't made any bookings yet" : `No ${filter} bookings`}
          </Text>
          <TouchableOpacity style={styles.bookButton} onPress={() => navigation.navigate('BookRide')}>
            <Text style={styles.bookButtonText}>Book a Ride</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBooking}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#2563EB',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTextActive: {
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  vehicleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  routeContainer: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#E5E7EB',
    marginLeft: 4,
    marginBottom: 4,
  },
  routeText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  bookingFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  fareText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 'auto',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 24,
  },
  bookButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
