import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { SyncProgress } from '../../types';

interface SyncProgressBarProps {
  progress: SyncProgress;
}

export const SyncProgressBar: React.FC<SyncProgressBarProps> = ({ progress }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;

  const percentage = progress.total_steps > 0
    ? Math.min(100, Math.round((progress.current_step / progress.total_steps) * 100))
    : 0;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: percentage,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  if (!progress.is_syncing) {
    return null;
  }

  const widthInterpolated = widthAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.banner}>
      <View style={styles.textRow}>
        <Text style={styles.stepMessage} numberOfLines={1}>
          {progress.step_message || 'Synchronizing with Trading 212...'}
        </Text>
        <Text style={styles.stepBadge}>
          {progress.current_step}/{progress.total_steps} ({percentage}%)
        </Text>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.bar, { width: widthInterpolated }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stepMessage: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
    marginRight: 8,
  },
  stepBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  track: {
    height: 4,
    backgroundColor: '#dbeafe',
    borderRadius: 2,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 2,
  },
});
