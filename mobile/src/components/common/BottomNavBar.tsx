import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabKey } from '../../types';

interface BottomNavBarProps {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentTab, onTabChange }) => {
  const insets = useSafeAreaInsets();

  const tabs: Array<{
    key: TabKey;
    label: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    iconActive: keyof typeof MaterialCommunityIcons.glyphMap;
  }> = [
    {
      key: 'dashboard',
      label: 'Overview',
      icon: 'view-dashboard-outline',
      iconActive: 'view-dashboard',
    },
    {
      key: 'holdings',
      label: 'Holdings',
      icon: 'briefcase-outline',
      iconActive: 'briefcase',
    },
    {
      key: 'calendar',
      label: 'Calendar',
      icon: 'calendar-month-outline',
      iconActive: 'calendar-month',
    },
    {
      key: 'analytics',
      label: 'Analytics',
      icon: 'chart-pie',
      iconActive: 'chart-pie',
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: 'cog-outline',
      iconActive: 'cog',
    },
  ];

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.map(tab => {
        const isActive = currentTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconPill, isActive && styles.iconPillActive]}>
              <MaterialCommunityIcons
                name={isActive ? tab.iconActive : tab.icon}
                size={22}
                color={isActive ? '#1d4ed8' : '#64748b'}
              />
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 4,
  },
  iconPillActive: {
    backgroundColor: '#eff6ff',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  labelActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
});
