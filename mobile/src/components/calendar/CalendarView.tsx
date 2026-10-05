import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { DividendEvent } from '../../types';
import { StockLogo } from '../common/StockLogo';

interface CalendarViewProps {
  dividends: DividendEvent[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({ dividends }) => {
  const [currentDate, setCurrentDate] = useState(() => {
    // If we have dividends, find the latest dividend date, else current date
    if (dividends.length > 0) {
      const dates = dividends.map(d => d.payment_date).sort();
      const latest = dates[dates.length - 1];
      const d = new Date(latest);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  // Group dividends by date: 'YYYY-MM-DD' -> DividendEvent[]
  const dateMap = useMemo(() => {
    const map = new Map<string, DividendEvent[]>();
    for (const d of dividends) {
      const dateKey = (d.payment_date || '').slice(0, 10);
      if (!dateKey) continue;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(d);
    }
    return map;
  }, [dividends]);

  // Calendar cells calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon is 0
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      dayNum: number;
      dateKey: string;
      isCurrentMonth: boolean;
      events: DividendEvent[];
      totalAmount: number;
    }> = [];

    // Empty padding
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push({
        dayNum: 0,
        dateKey: '',
        isCurrentMonth: false,
        events: [],
        totalAmount: 0,
      });
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const events = dateMap.get(dateKey) || [];
      const totalAmount = events.reduce((acc, e) => acc + e.amount, 0);

      days.push({
        dayNum: day,
        dateKey,
        isCurrentMonth: true,
        events,
        totalAmount,
      });
    }

    return days;
  }, [year, month, dateMap]);

  // Month Total
  const monthTotal = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    let total = 0;
    let count = 0;
    for (const [key, evts] of dateMap.entries()) {
      if (key.startsWith(monthPrefix)) {
        for (const e of evts) {
          total += e.amount;
          count++;
        }
      }
    }
    return { total, count };
  }, [year, month, dateMap]);

  const selectedEvents = useMemo(() => {
    if (!selectedDay) return [];
    return dateMap.get(selectedDay) || [];
  }, [selectedDay, dateMap]);

  return (
    <View style={styles.container}>
      {/* Month Navigation Strip */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navBtn} onPress={handlePrevMonth}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>
          {monthNames[month]} {year}
        </Text>
        <TouchableOpacity style={styles.navBtn} onPress={handleNextMonth}>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#1e293b" />
        </TouchableOpacity>
      </View>

      {/* Month KPI Strip */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Month Total</Text>
          <Text style={styles.kpiValue}>€{monthTotal.total.toFixed(2)}</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Payouts</Text>
          <Text style={styles.kpiValue}>{monthTotal.count}</Text>
        </View>
      </View>

      {/* 7-Day Header */}
      <View style={styles.weekDaysRow}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((wd, i) => (
          <Text key={i} style={styles.weekDayText}>
            {wd}
          </Text>
        ))}
      </View>

      {/* 31-Day Grid */}
      <ScrollView contentContainerStyle={styles.grid}>
        {calendarDays.map((cell, idx) => {
          if (!cell.isCurrentMonth) {
            return <View key={idx} style={styles.emptyCell} />;
          }

          const hasEvents = cell.events.length > 0;
          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dayCell,
                hasEvents && styles.dayCellWithEvents,
                selectedDay === cell.dateKey && styles.dayCellSelected,
              ]}
              onPress={() => setSelectedDay(cell.dateKey)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayNumText,
                  hasEvents && styles.dayNumTextHighlight,
                ]}
              >
                {cell.dayNum}
              </Text>
              {hasEvents && (
                <View style={styles.eventBadge}>
                  <Text style={styles.eventBadgeText}>
                    €{cell.totalAmount >= 100 ? Math.round(cell.totalAmount) : cell.totalAmount.toFixed(1)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Day Details Modal */}
      <Modal
        visible={Boolean(selectedDay && selectedEvents.length > 0)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDay(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Dividends on {selectedDay}</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedEvents.length} payout{selectedEvents.length > 1 ? 's' : ''} (Total: €{selectedEvents.reduce((a, b) => a + b.amount, 0).toFixed(2)})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDay(null)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {selectedEvents.map((evt, i) => (
                <View key={i} style={styles.eventItem}>
                  <StockLogo ticker={evt.ticker} size={40} />
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTicker}>{evt.ticker}</Text>
                    <Text style={styles.eventName} numberOfLines={1}>
                      {evt.company_name || evt.ticker}
                    </Text>
                  </View>
                  <View style={styles.eventAmountCol}>
                    <Text style={styles.eventAmount}>+€{evt.amount.toFixed(2)}</Text>
                    <Text style={styles.eventStatusBadge}>
                      {evt.status === 'RECEIVED' ? 'PAID' : 'FORECAST'}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    elevation: 1,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  weekDaysRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  emptyCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    marginVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  dayCellWithEvents: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  dayCellSelected: {
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  dayNumText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  dayNumTextHighlight: {
    color: '#065f46',
    fontWeight: '800',
  },
  eventBadge: {
    backgroundColor: '#059669',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
    marginTop: 2,
  },
  eventBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
  },
  modalList: {
    marginTop: 12,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  eventInfo: {
    flex: 1,
    marginLeft: 12,
  },
  eventTicker: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  eventName: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  eventAmountCol: {
    alignItems: 'flex-end',
  },
  eventAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  eventStatusBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
});
