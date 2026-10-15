import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { getIncomePlannerData } from '../../services/database';
import { IncomePlannerData, PlannerMonth } from '../../types';
import { formatTicker, StockLogo } from '../common/StockLogo';

export const PlannerView: React.FC = () => {
  const { theme, isSketch } = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [data, setData] = useState<IncomePlannerData | null>(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);

  const loadData = async () => {
    try {
      const res = await getIncomePlannerData();
      setData(res);
      // Default to first gap month if available
      const firstGapIdx = res.months.findIndex(m => m.is_gap);
      if (firstGapIdx >= 0) {
        setSelectedMonthIndex(firstGapIdx);
      } else {
        setSelectedMonthIndex(0);
      }
    } catch (err) {
      console.error('Error loading income planner data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Calculating monthly income gaps...
        </Text>
      </View>
    );
  }

  const selectedMonth: PlannerMonth | undefined = data?.months[selectedMonthIndex];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleWrap}>
          <View style={[styles.iconBadge, { backgroundColor: isSketch ? '#fef3c7' : '#e0e7ff' }]}>
            <MaterialCommunityIcons name="target" size={24} color={theme.accent} />
          </View>
          <View>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Income Planner</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Balance monthly cashflow across the year
            </Text>
          </View>
        </View>
      </View>

      {/* Summary KPI Cards */}
      {data && (
        <View style={styles.kpiGrid}>
          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                borderWidth: isSketch ? 2 : 1,
              },
            ]}
          >
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Monthly Target</Text>
            <Text style={[styles.kpiValue, { color: theme.accent }]}>
              €{data.monthly_average.toFixed(2)}
            </Text>
            <Text style={[styles.kpiSub, { color: theme.textSecondary }]}>12-month average</Text>
          </View>

          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                borderWidth: isSketch ? 2 : 1,
              },
            ]}
          >
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Low Months</Text>
            <Text
              style={[
                styles.kpiValue,
                { color: data.gap_months_count > 0 ? '#d97706' : '#10b981' },
              ]}
            >
              {data.gap_months_count} / 12
            </Text>
            <Text style={[styles.kpiSub, { color: theme.textSecondary }]}>
              {data.gap_months_count === 0 ? 'Smooth income' : 'Below target'}
            </Text>
          </View>

          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                borderWidth: isSketch ? 2 : 1,
              },
            ]}
          >
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Forward Annual</Text>
            <Text style={[styles.kpiValue, { color: theme.textPrimary }]}>
              €{data.total_annual_income.toFixed(2)}
            </Text>
            <Text style={[styles.kpiSub, { color: theme.textSecondary }]}>12-month projected</Text>
          </View>
        </View>
      )}

      {/* 12-Month Selector Strip */}
      <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>12-Month Schedule</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.monthScroll}
        contentContainerStyle={styles.monthScrollContent}
      >
        {data?.months.map((m, idx) => {
          const isSelected = idx === selectedMonthIndex;
          const monthShort = m.month_name.split(' ')[0].slice(0, 3);
          const yearShort = "'" + m.month.slice(2, 4);

          return (
            <TouchableOpacity
              key={m.month}
              style={[
                styles.monthPill,
                {
                  backgroundColor: isSelected
                    ? theme.accent
                    : m.is_gap
                    ? isSketch
                      ? '#fffbeb'
                      : '#fef3c7'
                    : theme.cardBg,
                  borderColor: isSelected
                    ? theme.accent
                    : m.is_gap
                    ? '#f59e0b'
                    : theme.cardBorder,
                  borderWidth: isSketch ? 2 : 1,
                },
              ]}
              onPress={() => setSelectedMonthIndex(idx)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.monthPillName,
                  { color: isSelected ? '#ffffff' : theme.textPrimary },
                ]}
              >
                {monthShort} {yearShort}
              </Text>
              <Text
                style={[
                  styles.monthPillTotal,
                  { color: isSelected ? '#ffffff' : theme.textPrimary },
                ]}
              >
                €{m.total_amount.toFixed(0)}
              </Text>
              {m.is_gap ? (
                <View
                  style={[
                    styles.gapBadge,
                    { backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#fed7aa' },
                  ]}
                >
                  <Text
                    style={[
                      styles.gapBadgeText,
                      { color: isSelected ? '#ffffff' : '#c2410c' },
                    ]}
                  >
                    -€{m.gap_amount.toFixed(0)}
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.gapBadge,
                    { backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#dcfce7' },
                  ]}
                >
                  <Text
                    style={[
                      styles.gapBadgeText,
                      { color: isSelected ? '#ffffff' : '#15803d' },
                    ]}
                  >
                    OK
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Selected Month Details & Gap Status */}
      {selectedMonth && (
        <View
          style={[
            styles.detailCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              borderWidth: isSketch ? 2 : 1,
            },
          ]}
        >
          <View style={styles.detailHeader}>
            <View>
              <Text style={[styles.detailTitle, { color: theme.textPrimary }]}>
                {selectedMonth.month_name}
              </Text>
              <Text style={[styles.detailSub, { color: theme.textSecondary }]}>
                Current payout: €{selectedMonth.total_amount.toFixed(2)}
              </Text>
            </View>

            {selectedMonth.is_gap ? (
              <View style={[styles.statusTag, { backgroundColor: '#fef3c7' }]}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#d97706" />
                <Text style={[styles.statusTagText, { color: '#b45309' }]}>Low Month</Text>
              </View>
            ) : (
              <View style={[styles.statusTag, { backgroundColor: '#dcfce7' }]}>
                <MaterialCommunityIcons name="check-circle-outline" size={16} color="#16a34a" />
                <Text style={[styles.statusTagText, { color: '#15803d' }]}>Target Met</Text>
              </View>
            )}
          </View>

          {selectedMonth.is_gap ? (
            <View style={styles.gapBanner}>
              <Text style={styles.gapBannerTitle}>
                Gap to Close: €{selectedMonth.gap_amount.toFixed(2)}
              </Text>
              <Text style={styles.gapBannerText}>
                Invest in your existing holdings below that pay in {selectedMonth.month_name} to
                reach your monthly target of €{data?.monthly_average.toFixed(2)}.
              </Text>
            </View>
          ) : (
            <View style={styles.metBanner}>
              <Text style={styles.metBannerText}>
                This month already meets or exceeds your monthly target! You can still reinvest into
                the holdings below to compound your income further.
              </Text>
            </View>
          )}

          {/* Recommendations Header */}
          <Text style={[styles.recommendationsTitle, { color: theme.textPrimary }]}>
            Recommended Existing Holdings ({selectedMonth.recommendations.length})
          </Text>

          {selectedMonth.recommendations.length === 0 ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="information-outline" size={32} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No current portfolio holdings have scheduled payouts in this month. Consider adding a
                monthly payer or stock paying in {selectedMonth.month_name}.
              </Text>
            </View>
          ) : (
            selectedMonth.recommendations.map(rec => (
              <View
                key={rec.ticker}
                style={[
                  styles.holdingCard,
                  {
                    backgroundColor: isSketch ? '#fafafa' : '#f8fafc',
                    borderColor: isSketch ? '#18181b' : '#e2e8f0',
                    borderWidth: isSketch ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.holdingTopRow}>
                  <StockLogo ticker={rec.ticker} size={40} />
                  <View style={styles.holdingInfo}>
                    <Text style={[styles.holdingTicker, { color: theme.textPrimary }]}>
                      {formatTicker(rec.ticker)}
                    </Text>
                    <Text
                      style={[styles.holdingName, { color: theme.textSecondary }]}
                      numberOfLines={1}
                    >
                      {rec.name || formatTicker(rec.ticker)}
                    </Text>
                  </View>
                  <View style={styles.yieldTag}>
                    <Text style={styles.yieldTagText}>{rec.dividend_yield.toFixed(2)}% Yield</Text>
                  </View>
                </View>

                <View style={styles.holdingMetaRow}>
                  <Text style={[styles.metaItem, { color: theme.textSecondary }]}>
                    Own: {rec.current_shares} shs (@ €{rec.current_price.toFixed(2)})
                  </Text>
                  <Text style={[styles.metaItem, { color: theme.textSecondary }]}>
                    Payout: ~€{rec.payout_amount_per_share.toFixed(2)}/sh ({rec.payout_frequency || 'Q'})
                  </Text>
                </View>

                {selectedMonth.is_gap && rec.shares_to_fill_gap > 0 ? (
                  <View
                    style={[
                      styles.actionBox,
                      {
                        backgroundColor: isSketch ? '#e0f2fe' : '#eff6ff',
                        borderColor: isSketch ? '#0284c7' : '#bfdbfe',
                      },
                    ]}
                  >
                    <View style={styles.actionHeader}>
                      <MaterialCommunityIcons name="plus-circle" size={18} color="#2563eb" />
                      <Text style={styles.actionTitle}>
                        Add +{rec.shares_to_fill_gap} shares (~€{rec.capital_needed.toFixed(2)})
                      </Text>
                    </View>
                    <Text style={styles.actionSub}>
                      Estimated +€{(rec.shares_to_fill_gap * rec.payout_amount_per_share).toFixed(2)} to {selectedMonth.month_name}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.actionBox, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
                    <Text style={[styles.actionSub, { color: '#64748b' }]}>
                      Current position actively contributes to this month's cashflow.
                    </Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      )}

      {/* Methodology Note */}
      <View style={styles.noteBox}>
        <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#94a3b8" />
        <Text style={styles.noteText}>
          Recommendations only evaluate stocks currently in your portfolio. Payout per share is
          derived from upcoming declarations, historical payments, or annual dividend rates.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  headerRow: {
    marginBottom: 16,
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  kpiSub: {
    fontSize: 10,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  monthScroll: {
    marginBottom: 20,
  },
  monthScrollContent: {
    gap: 8,
  },
  monthPill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    minWidth: 84,
    alignItems: 'center',
  },
  monthPillName: {
    fontSize: 11,
    fontWeight: '700',
  },
  monthPillTotal: {
    fontSize: 14,
    fontWeight: '800',
    marginVertical: 4,
  },
  gapBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  gapBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  detailCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  detailSub: {
    fontSize: 12,
    marginTop: 2,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  gapBanner: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  gapBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#b45309',
    marginBottom: 4,
  },
  gapBannerText: {
    fontSize: 11,
    color: '#92400e',
    lineHeight: 16,
  },
  metBanner: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  metBannerText: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyWrap: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  holdingCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  holdingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  holdingInfo: {
    flex: 1,
  },
  holdingTicker: {
    fontSize: 14,
    fontWeight: '800',
  },
  holdingName: {
    fontSize: 11,
    marginTop: 1,
  },
  yieldTag: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  yieldTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
  },
  holdingMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  metaItem: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  actionSub: {
    fontSize: 10,
    color: '#3b82f6',
    marginTop: 3,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderRadius: 10,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 10,
    color: '#94a3b8',
    lineHeight: 14,
  },
});
