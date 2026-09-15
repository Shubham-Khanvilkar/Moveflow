import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color?: string;
  backgroundColor?: string;
  onPress?: () => void;
}

export function StatCard({
  icon,
  value,
  label,
  color = '#2563EB',
  backgroundColor = '#EFF6FF',
  onPress,
}: StatCardProps) {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container style={[styles.card, { backgroundColor }]} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: '45%',
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
});
