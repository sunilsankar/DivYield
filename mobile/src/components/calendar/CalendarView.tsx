import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { DividendEvent } from '../../types';
import { StockLogo } from '../common/StockLogo';

interface CalendarViewProps {
  dividends: DividendEvent[];
}

export const CalendarView: React.FC<CalendarViewProps> = ({ dividends }) => {
  const { theme, isSketch } = useTheme();

  // Default to today's month so current date is immediately visible
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'RECEIVED' | 'EXPECTED'>('ALL');

  // ponytail: auto-jump to active month on load when current month has 0 dividends, matching web parity
  const hasInitializedMonth = React.useRef(false);
  useEffect(() => {
    if (hasInitializedMonth.current || dividends.length === 0) return;

    const now = new Date();
    const currentY = now.getFullYear();
    const currentM = now.getMonth();
    const monthPrefix = `${currentY}-${String(currentM + 1).padStart(2, '0')}`;

    const hasEventsInCurrentMonth = dividends.some((e) => {
      const dStr = (e.payment_date || e.ex_dividend_date || '').slice(0, 7);
      return dStr === monthPrefix;
    });

    if (!hasEventsInCurrentMonth) {
      const todayIso = now.toISOString().slice(0, 10);
      const upcoming = dividends
        .filter((e) => (e.payment_date || e.ex_dividend_date || '').slice(0, 10) >= todayIso)
        .sort((a, b) => ((a.payment_date || a.ex_dividend_date || '')).localeCompare(b.payment_date || b.ex_dividend_date || ''))[0];
      const target = upcoming || dividends[0];
      const targetDate = target ? (target.payment_date || target.ex_dividend_date) : null;
      if (targetDate) {
        const parts = targetDate.slice(0, 10).split('-');
        if (parts.length >= 2) {
          setCurrentDate(new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1));
        }
      }
    }
    hasInitializedMonth.current = true;
  }, [dividends]);

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

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  // Filter dividends by selected tab
  const filteredDividends = useMemo(() => {
    if (filterType === 'ALL') return dividends;
    return dividends.filter(d => (d.status === filterType || (filterType === 'EXPECTED' && d.status === 'FORECAST')));
  }, [dividends, filterType]);

  // Group dividends by date: 'YYYY-MM-DD' -> DividendEvent[]
  const dateMap = useMemo(() => {
    const map = new Map<string, DividendEvent[]>();
    for (const d of filteredDividends) {
      const dateKey = (d.payment_date || d.ex_dividend_date || '').slice(0, 10);
      if (!dateKey) continue;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(d);
    }
    return map;
  }, [filteredDividends]);

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
      hasForecast: boolean;
      hasReceived: boolean;
    }> = [];

    // Empty padding
    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push({
        dayNum: 0,
        dateKey: '',
        isCurrentMonth: false,
        events: [],
        hasForecast: false,
        hasReceived: false,
      });
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const events = dateMap.get(dateKey) || [];
      const hasForecast = events.some(e => e.status === 'EXPECTED' || e.status === 'FORECAST');
      const hasReceived = events.some(e => e.status === 'RECEIVED');

      days.push({
        dayNum: day,
        dateKey,
        isCurrentMonth: true,
        events,
        hasForecast,
        hasReceived,
      });
    }

    return days;
  }, [year, month, dateMap]);

  // Month KPI breakdown
  const monthStats = useMemo(() => {
    const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    let receivedTotal = 0;
    let forecastTotal = 0;
    let count = 0;

    for (const d of filteredDividends) {
      const dateKey = (d.payment_date || d.ex_dividend_date || '').slice(0, 7);
      if (dateKey === monthPrefix) {
        if (d.status === 'RECEIVED') {
          receivedTotal += d.amount;
        } else {
          forecastTotal += d.amount;
        }
        count++;
      }
    }

    return {
      receivedTotal,
      forecastTotal,
      grandTotal: receivedTotal + forecastTotal,
      count,
    };
  }, [year, month, filteredDividends]);

  const selectedEvents = useMemo(() => {
    if (!selectedDay) return [];
    return dateMap.get(selectedDay) || [];
  }, [selectedDay, dateMap]);

  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Month Navigation Strip */}
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, borderBottomWidth: isSketch ? 2 : 1 }]}>
        <TouchableOpacity style={[styles.navBtn, { borderColor: theme.cardBorder, borderWidth: isSketch ? 1 : 0 }]} onPress={handlePrevMonth}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        
        <View style={styles.titleCenter}>
          <Text style={[styles.monthTitle, { color: theme.textPrimary }]}>
            {monthNames[month]} {year}
          </Text>
          <TouchableOpacity onPress={handleToday} style={[styles.todayBadge, isSketch && styles.sketchBorder]}>
            <Text style={styles.todayText}>Today</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.navBtn, { borderColor: theme.cardBorder, borderWidth: isSketch ? 1 : 0 }]} onPress={handleNextMonth}>
          <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterPill,
            filterType === 'ALL' && styles.filterPillActive,
            isSketch && styles.sketchBorder,
          ]}
          onPress={() => setFilterType('ALL')}
        >
          <Text style={[styles.filterPillText, filterType === 'ALL' && styles.filterPillTextActive]}>
            All ({dividends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterPill,
            filterType === 'RECEIVED' && styles.filterPillActiveReceived,
            isSketch && styles.sketchBorder,
          ]}
          onPress={() => setFilterType('RECEIVED')}
        >
          <Text style={[styles.filterPillText, filterType === 'RECEIVED' && styles.filterPillTextActive]}>
            Paid
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterPill,
            filterType === 'EXPECTED' && styles.filterPillActiveForecast,
            isSketch && styles.sketchBorder,
          ]}
          onPress={() => setFilterType('EXPECTED')}
        >
          <Text style={[styles.filterPillText, filterType === 'EXPECTED' && styles.filterPillTextActive]}>
            Forecast
          </Text>
        </TouchableOpacity>
      </View>

      {/* Month KPI Strip */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, borderWidth: isSketch ? 2 : 1 }]}>
          <Text style={styles.kpiLabel}>Month Total</Text>
          <Text style={[styles.kpiValue, { color: theme.accent }]}>
            €{monthStats.grandTotal.toFixed(2)}
          </Text>
        </View>
        <View style={[styles.kpiBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, borderWidth: isSketch ? 2 : 1 }]}>
          <Text style={styles.kpiLabel}>Paid / Forecast</Text>
          <Text style={styles.kpiSubValue}>
            <Text style={{ color: '#059669' }}>€{monthStats.receivedTotal.toFixed(2)}</Text> / <Text style={{ color: '#3b82f6' }}>€{monthStats.forecastTotal.toFixed(2)}</Text>
          </Text>
        </View>
        <View style={[styles.kpiBoxSmall, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, borderWidth: isSketch ? 2 : 1 }]}>
          <Text style={styles.kpiLabel}>Payouts</Text>
          <Text style={styles.kpiCountValue}>{monthStats.count}</Text>
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
          const isToday = cell.dateKey === todayStr;

          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dayCell,
                { backgroundColor: theme.cardBg, borderColor: theme.cardBorder },
                isSketch && { borderWidth: 1 },
                cell.hasReceived && styles.dayCellWithReceived,
                cell.hasForecast && !cell.hasReceived && styles.dayCellWithForecast,
                cell.hasReceived && cell.hasForecast && styles.dayCellWithBoth,
                isToday && styles.dayCellToday,
                selectedDay === cell.dateKey && styles.dayCellSelected,
              ]}
              onPress={() => setSelectedDay(cell.dateKey)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayNumText,
                  hasEvents && styles.dayNumTextHighlight,
                  isToday && styles.dayNumTextToday,
                ]}
              >
                {cell.dayNum}
              </Text>
              {hasEvents && (
                <View style={styles.cellEvents}>
                  {cell.events.slice(0, 2).map((event, eventIndex) => {
                    const isForecast = event.status === 'EXPECTED' || event.status === 'FORECAST';
                    return (
                      <View
                        key={`${event.external_id || event.ticker}-${eventIndex}`}
                        style={[styles.cellEvent, isForecast ? styles.cellEventForecast : styles.cellEventPaid]}
                      >
                        <Text style={[styles.cellEventTicker, isForecast ? styles.cellEventTickerForecast : styles.cellEventTickerPaid]} numberOfLines={1}>
                          {event.ticker}
                        </Text>
                        <Text style={[styles.cellEventAmount, isForecast ? styles.cellEventTickerForecast : styles.cellEventTickerPaid]}>
                          €{event.amount.toFixed(2)}
                        </Text>
                      </View>
                    );
                  })}
                  {cell.events.length > 2 && (
                    <Text style={styles.cellMore}>+{cell.events.length - 2} more</Text>
                  )}
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
          <View style={[styles.modalContent, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder, borderWidth: isSketch ? 2 : 0 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                  Dividends on {selectedDay}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {selectedEvents.length} payout{selectedEvents.length > 1 ? 's' : ''} • Total: €{selectedEvents.reduce((a, b) => a + b.amount, 0).toFixed(2)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedDay(null)} style={styles.closeBtn}>
                <MaterialCommunityIcons name="close" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalList}>
              {selectedEvents.map((evt, i) => {
                const isForecast = evt.status === 'EXPECTED' || evt.status === 'FORECAST';
                return (
                  <View key={i} style={styles.eventItem}>
                    <StockLogo ticker={evt.ticker} size={40} />
                    <View style={styles.eventInfo}>
                      <Text style={[styles.eventTicker, { color: theme.textPrimary }]}>{evt.ticker}</Text>
                      <Text style={styles.eventName} numberOfLines={1}>
                        {evt.company_name || evt.ticker}
                      </Text>
                    </View>
                    <View style={styles.eventAmountCol}>
                      <Text style={[styles.eventAmount, isForecast && styles.eventAmountForecast]}>
                        +€{evt.amount.toFixed(2)}
                      </Text>
                      <View
                        style={[
                          styles.eventStatusBadge,
                          isForecast ? styles.eventStatusBadgeForecast : styles.eventStatusBadgePaid,
                        ]}
                      >
                        <Text
                          style={[
                            styles.eventStatusBadgeText,
                            isForecast ? styles.eventStatusTextForecast : styles.eventStatusTextPaid,
                          ]}
                        >
                          {isForecast ? 'FORECAST' : 'PAID'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  titleCenter: {
    alignItems: 'center',
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  monthTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  todayBadge: {
    marginTop: 2,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  todayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563eb',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
  },
  filterPillActive: {
    backgroundColor: '#0f172a',
  },
  filterPillActiveReceived: {
    backgroundColor: '#059669',
  },
  filterPillActiveForecast: {
    backgroundColor: '#2563eb',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  filterPillTextActive: {
    color: '#ffffff',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  kpiBox: {
    flex: 2,
    borderRadius: 12,
    padding: 10,
  },
  kpiBoxSmall: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  kpiSubValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  kpiCountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
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
    minHeight: 76,
    padding: 4,
    marginVertical: 2,
    alignItems: 'stretch',
    borderRadius: 8,
    borderWidth: 1,
  },
  dayCellWithReceived: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  dayCellWithForecast: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  dayCellWithBoth: {
    backgroundColor: '#f0fdf4',
    borderColor: '#6ee7b7',
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  dayCellSelected: {
    borderColor: '#f59e0b',
    borderWidth: 2,
  },
  dayNumText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  dayNumTextHighlight: {
    fontWeight: '800',
  },
  dayNumTextToday: {
    color: '#2563eb',
    fontWeight: '900',
  },
  cellEvents: {
    width: '100%',
    gap: 2,
    marginTop: 3,
  },
  cellEvent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 3,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  cellEventPaid: {
    backgroundColor: '#d1fae5',
  },
  cellEventForecast: {
    backgroundColor: '#dbeafe',
  },
  cellEventTicker: {
    flex: 1,
    fontSize: 7,
    fontWeight: '800',
  },
  cellEventAmount: {
    fontSize: 7,
    fontWeight: '800',
    marginLeft: 2,
  },
  cellEventTickerPaid: {
    color: '#047857',
  },
  cellEventTickerForecast: {
    color: '#1d4ed8',
  },
  cellMore: {
    color: '#64748b',
    fontSize: 7,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
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
  eventAmountForecast: {
    color: '#2563eb',
  },
  eventStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  eventStatusBadgePaid: {
    backgroundColor: '#d1fae5',
  },
  eventStatusBadgeForecast: {
    backgroundColor: '#dbeafe',
  },
  eventStatusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  eventStatusTextPaid: {
    color: '#047857',
  },
  eventStatusTextForecast: {
    color: '#1d4ed8',
  },
  sketchBorder: {
    borderWidth: 1,
    borderColor: '#18181b',
  },
});
