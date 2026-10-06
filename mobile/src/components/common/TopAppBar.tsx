import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface TopAppBarProps {
  isSyncing: boolean;
  onSyncPress: () => void;
  lastSynced?: string | null;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({ isSyncing, onSyncPress, lastSynced }) => {
  const { theme, isSketch } = useTheme();
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isSyncing) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [isSyncing]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View
      style={[
        styles.appBar,
        {
          backgroundColor: theme.cardBg,
          borderBottomColor: theme.cardBorder,
          borderBottomWidth: isSketch ? 2 : 1,
        },
      ]}
    >
      <View style={styles.titleContainer}>
        <Image
          source={require('../../../assets/icon.png')}
          style={[styles.logo, isSketch && styles.sketchBorder]}
          resizeMode="contain"
        />
        <View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>DivYield</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {isSyncing
              ? 'Enriching via Yahoo Finance...'
              : lastSynced
              ? `Updated ${new Date(lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Ready to sync'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.syncButton,
          {
            backgroundColor: isSketch ? '#faf7f2' : '#f8fafc',
            borderColor: theme.cardBorder,
            borderWidth: isSketch ? 2 : 1,
          },
          isSyncing && styles.syncButtonActive,
        ]}
        onPress={onSyncPress}
        disabled={isSyncing}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <MaterialCommunityIcons
            name="sync"
            size={20}
            color={isSyncing ? theme.accent : theme.textPrimary}
          />
        </Animated.View>
        <Text
          style={[
            styles.syncButtonText,
            { color: theme.textPrimary },
            isSyncing && { color: theme.accent },
          ]}
        >
          {isSyncing ? 'Syncing' : 'Sync'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  appBar: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  syncButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  syncButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sketchBorder: {
    borderWidth: 1,
    borderColor: '#18181b',
  },
});
