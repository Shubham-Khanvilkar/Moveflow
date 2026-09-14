import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const API_BASE_URL = 'http://localhost:3001/api';
const PRIMARY = '#2563EB';
const SECONDARY = '#1E40AF';

interface DaySchedule {
  day: string;
  date: string;
  fullDate: string;
  loginTime: string;
  logoutTime: string;
  status: 'ACTIVE' | 'CANCELLED' | 'MISSED' | 'WEEKLY_OFF';
  buffers: { type: string; startTime: string; endTime: string }[];
}

interface AdditionalStop {
  id: string;
  time: string;
  type: 'pickup' | 'drop';
  address: string;
}

interface ScheduleResponse {
  schedule: {
    weekStart: string;
    weekEnd: string;
    days: {
      date: string;
      loginTime: string;
      logoutTime: string;
      status: string;
      buffers: { type: string; startTime: string; endTime: string }[];
    }[];
  };
}

interface PickupDropResponse {
  stops: {
    id: string;
    time: string;
    type: string;
    address: string;
    date: string;
  }[];
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}`;
}

function formatFullDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function EmployeeScheduleScreen() {
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [additionalStops, setAdditionalStops] = useState<AdditionalStop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [userId] = useState('user-1');

  const generateWeekDays = useCallback((weekStart: Date): DaySchedule[] => {
    return DAY_NAMES.map((day, i) => {
      const date = addDays(weekStart, i);
      return {
        day,
        date: formatDate(date),
        fullDate: formatFullDate(date),
        loginTime: '--:--',
        logoutTime: '--:--',
        status: 'WEEKLY_OFF' as const,
        buffers: [],
      };
    });
  }, []);

  const fetchSchedule = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/employee-scheduling/user/${userId}?weekStart=${formatFullDate(currentWeekStart)}`
      );
      const data: ScheduleResponse = await response.json();
      if (data.schedule?.days) {
        const weekDays = generateWeekDays(currentWeekStart);
        const merged = weekDays.map((wd) => {
          const apiDay = data.schedule.days.find((d) => d.date === wd.fullDate);
          if (apiDay) {
            return {
              ...wd,
              loginTime: apiDay.loginTime || '--:--',
              logoutTime: apiDay.logoutTime || '--:--',
              status: apiDay.status.toUpperCase() as DaySchedule['status'],
              buffers: apiDay.buffers || [],
            };
          }
          return wd;
        });
        setSchedule(merged);
      } else {
        setSchedule(generateWeekDays(currentWeekStart));
      }
    } catch {
      setSchedule(generateWeekDays(currentWeekStart));
    }
  }, [currentWeekStart, userId, generateWeekDays]);

  const fetchAdditionalStops = useCallback(
    async (date: string) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/pickup-drop/user/${userId}/date/${date}`
        );
        const data: PickupDropResponse = await response.json();
        if (data.stops) {
          setAdditionalStops(
            data.stops.map((s) => ({
              id: s.id,
              time: s.time,
              type: s.type as 'pickup' | 'drop',
              address: s.address,
            }))
          );
        } else {
          setAdditionalStops([]);
        }
      } catch {
        setAdditionalStops([]);
      }
    },
    [userId]
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await fetchSchedule();
    if (selectedDay) {
      await fetchAdditionalStops(selectedDay);
    }
    setIsLoading(false);
  }, [fetchSchedule, fetchAdditionalStops, selectedDay]);

  useEffect(() => {
    loadData();
  }, [currentWeekStart]);

  useEffect(() => {
    if (selectedDay) {
      fetchAdditionalStops(selectedDay);
    }
  }, [selectedDay]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchSchedule();
    if (selectedDay) {
      await fetchAdditionalStops(selectedDay);
    }
    setIsRefreshing(false);
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart((prev) => addDays(prev, -7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart((prev) => addDays(prev, 7));
  };

  const handleDayPress = (fullDate: string) => {
    setSelectedDay((prev) => (prev === fullDate ? null : fullDate));
  };

  const getStatusColor = (status: DaySchedule['status']): string => {
    switch (status) {
      case 'ACTIVE':
        return '#059669';
      case 'CANCELLED':
        return '#EF4444';
      case 'MISSED':
        return '#F59E0B';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusLabel = (status: DaySchedule['status']): string => {
    switch (status) {
      case 'ACTIVE':
        return 'Active';
      case 'CANCELLED':
        return 'Cancelled';
      case 'MISSED':
        return 'Missed';
      default:
        return 'Weekly Off';
    }
  };

  const getAdditionalCount = (day: DaySchedule): number => {
    if (selectedDay !== day.fullDate) return 0;
    return additionalStops.length;
  };

  const weekEnd = addDays(currentWeekStart, 6);
  const weekLabel = `${formatDate(currentWeekStart)} - ${formatDate(weekEnd)}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Schedule</Text>
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={goToPreviousWeek} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <TouchableOpacity onPress={goToNextWeek} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color={PRIMARY} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        >
          {schedule.every((d) => d.status === 'WEEKLY_OFF' && d.loginTime === '--:--') ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No schedule set for this week</Text>
              <Text style={styles.emptySubtitle}>Your schedule will appear here once assigned</Text>
            </View>
          ) : (
            <>
              {schedule.map((day) => {
                const isSelected = selectedDay === day.fullDate;
                const additionalCount = getAdditionalCount(day);
                return (
                  <TouchableOpacity
                    key={day.day}
                    style={[styles.dayCard, isSelected && styles.dayCardSelected]}
                    onPress={() => handleDayPress(day.fullDate)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.dayHeader}>
                      <Text style={styles.dayName}>{day.day}</Text>
                      <Text style={styles.dayDate}>{day.date}</Text>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(day.status) }]} />
                    </View>

                    <View style={styles.dayBody}>
                      <View style={styles.timeRow}>
                        <View style={styles.timeItem}>
                          <Text style={styles.timeLabel}>Login</Text>
                          <Text style={styles.timeValue}>{day.loginTime}</Text>
                        </View>
                        <View style={styles.timeDivider} />
                        <View style={styles.timeItem}>
                          <Text style={styles.timeLabel}>Logout</Text>
                          <Text style={styles.timeValue}>{day.logoutTime}</Text>
                        </View>
                      </View>

                      <View style={styles.statusRow}>
                        <Text style={[styles.statusText, { color: getStatusColor(day.status) }]}>
                          ● {getStatusLabel(day.status)}
                        </Text>
                      </View>

                      {day.buffers.length > 0 && (
                        <View style={styles.bufferRow}>
                          {day.buffers.map((buf, i) => (
                            <View key={i} style={styles.bufferChip}>
                              <Text style={styles.bufferText}>
                                {buf.type}: {buf.startTime} - {buf.endTime}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {additionalCount > 0 && (
                        <Text style={styles.additionalText}>
                          + {additionalCount} additional {additionalCount === 1 ? 'stop' : 'stops'}
                        </Text>
                      )}
                    </View>

                    <Ionicons
                      name={isSelected ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color="#9CA3AF"
                      style={styles.dayChevron}
                    />
                  </TouchableOpacity>
                );
              })}

              {selectedDay && additionalStops.length > 0 && (
                <View style={styles.additionalSection}>
                  <Text style={styles.additionalSectionTitle}>Additional Stops Today</Text>
                  {additionalStops.map((stop, i) => (
                    <View key={stop.id} style={styles.stopItem}>
                      <View style={styles.stopIndex}>
                        <Text style={styles.stopIndexText}>{i + 1}</Text>
                      </View>
                      <View style={styles.stopInfo}>
                        <Text style={styles.stopTime}>{stop.time}</Text>
                        <Text style={styles.stopType}>
                          {stop.type === 'pickup' ? '● Pickup' : '○ Drop'} at {stop.address}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
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
    marginBottom: 8,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
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
    textAlign: 'center',
  },
  dayCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayCardSelected: {
    borderColor: PRIMARY,
    borderWidth: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dayName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginRight: 8,
  },
  dayDate: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dayBody: {
    gap: 6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeItem: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginTop: 2,
  },
  timeDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  statusRow: {
    marginTop: 2,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bufferRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  bufferChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bufferText: {
    fontSize: 11,
    color: '#6B7280',
  },
  additionalText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY,
    marginTop: 4,
  },
  dayChevron: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  additionalSection: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  additionalSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  stopItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stopIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stopIndexText: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY,
  },
  stopInfo: {
    flex: 1,
  },
  stopTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  stopType: {
    fontSize: 13,
    color: '#374151',
    marginTop: 2,
  },
});
