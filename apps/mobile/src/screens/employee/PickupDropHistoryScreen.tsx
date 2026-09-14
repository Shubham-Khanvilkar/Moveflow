import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = 'http://localhost:3001/api';
const PRIMARY = '#2563EB';

interface HistoryEntry {
  id: string;
  date: string;
  time: string;
  address: string;
  changeType: 'CREATED' | 'EDITED' | 'CANCELLED';
  changedBy: string;
  changedAt: string;
  oldValues?: { field: string; from: string; to: string }[];
  newValues?: { field: string; value: string }[];
}

interface PickupDropHistoryResponse {
  history: HistoryEntry[];
}

export default function PickupDropHistoryScreen() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [pickupDropId] = useState('pd-1');

  const fetchHistory = useCallback(async () => {
    try {
      let url = `${API_BASE_URL}/pickup-drop/${pickupDropId}/history`;
      const params: string[] = [];
      if (dateFrom) params.push(`from=${dateFrom}`);
      if (dateTo) params.push(`to=${dateTo}`);
      if (params.length) url += `?${params.join('&')}`;

      const response = await fetch(url);
      const data: PickupDropHistoryResponse = await response.json();
      if (Array.isArray(data)) {
        setHistory(data);
      } else if (data.history) {
        setHistory(data.history);
      } else {
        setHistory([]);
      }
    } catch {
      setHistory([]);
    }
  }, [pickupDropId, dateFrom, dateTo]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await fetchHistory();
      setIsLoading(false);
    })();
  }, [fetchHistory]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchHistory();
    setIsRefreshing(false);
  };

  const getChangeTypeColor = (type: HistoryEntry['changeType']): string => {
    switch (type) {
      case 'CREATED':
        return '#059669';
      case 'EDITED':
        return '#2563EB';
      case 'CANCELLED':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getChangeTypeBg = (type: HistoryEntry['changeType']): string => {
    switch (type) {
      case 'CREATED':
        return '#05966915';
      case 'EDITED':
        return '#2563EB15';
      case 'CANCELLED':
        return '#EF444415';
      default:
        return '#F3F4F6';
    }
  };

  const getChangeTypeIcon = (type: HistoryEntry['changeType']): string => {
    switch (type) {
      case 'CREATED':
        return 'add-circle';
      case 'EDITED':
        return 'create';
      case 'CANCELLED':
        return 'close-circle';
      default:
        return 'ellipse';
    }
  };

  const renderEntry = ({ item }: { item: HistoryEntry }) => {
    const color = getChangeTypeColor(item.changeType);
    const bgColor = getChangeTypeBg(item.changeType);

    return (
      <View style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View style={styles.entryHeaderLeft}>
            <Text style={styles.entryDate}>{item.date}</Text>
            <Text style={styles.entryTime}>{item.time}</Text>
            <Text style={styles.entryAddress}>{item.address}</Text>
          </View>
          <View style={[styles.changeTypeBadge, { backgroundColor: bgColor }]}>
            <Ionicons
              name={getChangeTypeIcon(item.changeType) as any}
              size={14}
              color={color}
            />
            <Text style={[styles.changeTypeText, { color }]}>{item.changeType}</Text>
          </View>
        </View>

        {item.changeType === 'EDITED' && item.oldValues && item.oldValues.length > 0 && (
          <View style={styles.changesContainer}>
            <Text style={styles.changesLabel}>Changed:</Text>
            {item.oldValues.map((change, i) => (
              <View key={i} style={styles.changeRow}>
                <Text style={styles.changeField}>{change.field}</Text>
                <Text style={styles.changeFrom}>{change.from}</Text>
                <Ionicons name="arrow-forward" size={12} color="#9CA3AF" />
                <Text style={styles.changeTo}>{change.to}</Text>
              </View>
            ))}
          </View>
        )}

        {item.changeType === 'CREATED' && item.newValues && item.newValues.length > 0 && (
          <View style={styles.changesContainer}>
            <Text style={styles.changesLabel}>Details:</Text>
            {item.newValues.map((val, i) => (
              <View key={i} style={styles.changeRow}>
                <Text style={styles.changeField}>{val.field}:</Text>
                <Text style={styles.changeTo}>{val.value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.entryFooter}>
          <View style={styles.footerItem}>
            <Ionicons name="person-outline" size={14} color="#9CA3AF" />
            <Text style={styles.footerText}>By: {item.changedBy}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="time-outline" size={14} color="#9CA3AF" />
            <Text style={styles.footerText}>{item.changedAt}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pickup/Drop History</Text>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <View style={styles.filterInputWrapper}>
            <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
            <TextInput
              value={dateFrom}
              onChangeText={setDateFrom}
              placeholder="From date"
              placeholderTextColor="#9CA3AF"
              style={styles.filterInput}
            />
          </View>
          <View style={styles.filterInputWrapper}>
            <Ionicons name="calendar-outline" size={16} color="#9CA3AF" />
            <TextInput
              value={dateTo}
              onChangeText={setDateTo}
              placeholder="To date"
              placeholderTextColor="#9CA3AF"
              style={styles.filterInput}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={fetchHistory}>
            <Ionicons name="search" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="time-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No history found</Text>
          <Text style={styles.emptySubtitle}>Pickup/drop changes will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderEntry}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
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
  header: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  filterContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 10,
    gap: 6,
  },
  filterInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
    color: '#374151',
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
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
  },
  entryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  entryHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  entryDate: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  entryTime: {
    fontSize: 13,
    color: '#374151',
  },
  entryAddress: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  changeTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  changeTypeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  changesContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  changesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  changeField: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  changeFrom: {
    fontSize: 13,
    color: '#EF4444',
    textDecorationLine: 'line-through',
  },
  changeTo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  entryFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
    gap: 16,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
