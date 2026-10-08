import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { TabKey } from '../../types';

interface BottomNavBarProps {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentTab, onTabChange }) => {
  const insets = useSafeAreaInsets();
  const { theme, isSketch } = useTheme();

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
      key: 'history',
      label: 'History',
      icon: 'history',
      iconActive: 'history',
    },
    {
      key: 'analytics',
      label: 'Diversification',
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
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 8),
          backgroundColor: theme.cardBg,
          borderTopColor: theme.cardBorder,
          borderTopWidth: isSketch ? 2 : 1,
        },
      ]}
    >
      {tabs.map(tab => {
        const isActive = currentTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => onTabChange(tab.key)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.iconPill,
                isActive && {
                  backgroundColor: isSketch ? '#fef3c7' : '#dbeafe',
                  borderWidth: isSketch ? 1 : 0,
                  borderColor: '#18181b',
                },
              ]}
            >
              <MaterialCommunityIcons
                name={isActive ? tab.iconActive : tab.icon}
                size={22}
                color={isActive ? theme.accent : theme.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.label,
                { color: isActive ? theme.accent : theme.textSecondary },
                isActive && styles.labelActive,
              ]}
              numberOfLines={1}
            >
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
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconPill: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  labelActive: {
    fontWeight: '800',
  },
});
