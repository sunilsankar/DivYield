import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { getIncomePlannerData, getSetting } from '../../services/database';
import { getTrading212InstrumentUrl, runFutureInvestmentSync } from '../../services/futureInvestments';
import { IncomePlannerData, MissingDaySuggestion, PlannerMonth } from '../../types';
import { formatTicker, StockLogo } from '../common/StockLogo';

const MONTH_ABBREVS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type SuggestionSortOption = 'yield_desc' | 'yield_asc' | 'price_desc' | 'price_asc';

const SORT_OPTIONS: { id: SuggestionSortOption; label: string; icon: string }[] = [
  { id: 'yield_desc', label: 'Yield: High to Low', icon: 'percent-outline' },
  { id: 'yield_asc', label: 'Yield: Low to High', icon: 'percent-outline' },
  { id: 'price_desc', label: 'Price: High to Low', icon: 'cash-multiple' },
  { id: 'price_asc', label: 'Price: Low to High', icon: 'cash-multiple' },
];

function formatPrice(price?: number, currency?: string): string {
  if (price === undefined || price === null || isNaN(price)) return '';
  const curr = (currency || 'USD').toUpperCase();
  const symbol = curr === 'USD' ? '$' : curr === 'EUR' ? '€' : curr === 'GBP' ? '£' : curr === 'GBX' ? 'p' : `${curr} `;
  return `${symbol}${price.toFixed(2)}`;
}

function formatSuggestionDate(dateStr?: string, fallbackDay?: number) {
  if (dateStr) {
    const parts = dateStr.split('-');
    if (parts.length >= 3) {
      const mIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (mIdx >= 0 && mIdx < 12) {
        return {
          monthAbbr: MONTH_ABBREVS[mIdx],
          dayText: String(day),
          creditedLabel: `${MONTH_NAMES[mIdx]} ${day}`,
        };
      }
    }
  }
  return {
    monthAbbr: 'DAY',
    dayText: String(fallbackDay || 1),
    creditedLabel: `Day ${fallbackDay || 1}`,
  };
}

export const PlannerView: React.FC = () => {
  const { theme, isSketch } = useTheme();
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [data, setData] = useState<IncomePlannerData | null>(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  const [isSyncingCandidates, setIsSyncingCandidates] = useState<boolean>(false);
  const [candidateSyncMsg, setCandidateSyncMsg] = useState<string>('');
  const [lastCandidateSync, setLastCandidateSync] = useState<string | null>(null);
  const [suggestionSort, setSuggestionSort] = useState<SuggestionSortOption>('yield_desc');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState<boolean>(false);

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

      const lastSyncIso = await getSetting('future_investment_last_synced', '');
      if (lastSyncIso) {
        const d = new Date(lastSyncIso);
        setLastCandidateSync(
          `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        );
      }
    } catch (err) {
      console.error('Error loading income planner data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSyncCandidates = async () => {
    if (isSyncingCandidates) return;
    setIsSyncingCandidates(true);
    setCandidateSyncMsg('Connecting to Trading 212 & Yahoo Finance...');
    try {
      const res = await runFutureInvestmentSync(100, (msg) => setCandidateSyncMsg(msg));
      if (res.success) {
        Alert.alert('Discovery Complete', res.message);
        await loadData();
      } else {
        Alert.alert('Discovery Notice', res.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Discovery sync failed');
    } finally {
      setIsSyncingCandidates(false);
      setCandidateSyncMsg('');
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
          {/* Missing Dividend Days & Future Investments */}
          <View style={styles.futureHeaderRow}>
            <View style={styles.futureSectionTitleWrap}>
              <MaterialCommunityIcons name="calendar-clock" size={18} color="#7c3aed" />
              <Text style={[styles.futureSectionTitle, { color: theme.textPrimary }]}>
                Future Investments on Missing Days
              </Text>
            </View>
            <View
              style={[
                styles.futureSectionBadge,
                {
                  backgroundColor: isSketch ? '#f3e8ff' : '#ede9fe',
                },
              ]}
            >
              <Text style={[styles.futureSectionBadgeText, { color: '#6d28d9' }]}>
                {selectedMonth.missing_days_count !== undefined
                  ? `${selectedMonth.missing_days_count} Empty Days`
                  : 'Missing Days'}
              </Text>
            </View>
          </View>

          <Text style={[styles.futureSectionSub, { color: theme.textSecondary }]}>
            Stocks and ETFs verified on Trading 212 that pay on your open calendar days to build daily dividend cashflow.
          </Text>

          {/* Sync New Stocks & ETFs Action Bar */}
          <View
            style={[
              styles.discoverySyncBar,
              {
                backgroundColor: isSketch ? '#faf5ff' : '#f5f3ff',
                borderColor: isSketch ? '#c084fc' : '#e9d5ff',
              },
            ]}
          >
            <View style={styles.discoverySyncInfo}>
              <Text style={[styles.discoverySyncTitle, { color: '#6b21a8' }]}>
                Candidate Discovery Sync
              </Text>
              <Text style={[styles.discoverySyncSub, { color: theme.textSecondary }]}>
                {isSyncingCandidates
                  ? candidateSyncMsg || 'Scanning Trading 212 stocks & ETFs...'
                  : lastCandidateSync
                  ? `Last synced: ${lastCandidateSync}`
                  : 'Sync to validate latest T212 stocks & ETFs'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.discoverySyncBtn,
                isSyncingCandidates && styles.discoverySyncBtnDisabled,
              ]}
              onPress={handleSyncCandidates}
              disabled={isSyncingCandidates}
              activeOpacity={0.8}
            >
              {isSyncingCandidates ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <View style={styles.discoveryBtnInner}>
                  <MaterialCommunityIcons name="cloud-sync" size={16} color="#ffffff" />
                  <Text style={styles.discoveryBtnText}>Sync Candidates</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Sort & Filter Controls */}
          {selectedMonth.missing_day_suggestions &&
            selectedMonth.missing_day_suggestions.length > 0 && (
              <View>
                <View style={styles.sortFilterRow}>
                  <Text style={[styles.sortFilterLabel, { color: theme.textSecondary }]}>
                    Order candidates by:
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.sortDropdownBtn,
                      {
                        backgroundColor: isSketch ? '#faf5ff' : '#f5f3ff',
                        borderColor: isSketch ? '#c084fc' : '#ddd6fe',
                      },
                    ]}
                    onPress={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name={
                        (SORT_OPTIONS.find((o) => o.id === suggestionSort) || SORT_OPTIONS[0])
                          .icon as any
                      }
                      size={14}
                      color="#7c3aed"
                    />
                    <Text style={[styles.sortDropdownBtnText, { color: '#6d28d9' }]}>
                      {
                        (SORT_OPTIONS.find((o) => o.id === suggestionSort) || SORT_OPTIONS[0])
                          .label
                      }
                    </Text>
                    <MaterialCommunityIcons
                      name={isSortDropdownOpen ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color="#7c3aed"
                    />
                  </TouchableOpacity>
                </View>

                {isSortDropdownOpen && (
                  <View
                    style={[
                      styles.sortDropdownMenu,
                      {
                        backgroundColor: isSketch ? '#ffffff' : theme.cardBg,
                        borderColor: isSketch ? '#c084fc' : '#e2e8f0',
                      },
                    ]}
                  >
                    {SORT_OPTIONS.map((opt) => {
                      const isSelected = opt.id === suggestionSort;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.sortDropdownItem,
                            isSelected && { backgroundColor: isSketch ? '#f5f3ff' : '#f3e8ff' },
                          ]}
                          onPress={() => {
                            setSuggestionSort(opt.id);
                            setIsSortDropdownOpen(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.sortDropdownItemLeft}>
                            <MaterialCommunityIcons
                              name={opt.icon as any}
                              size={16}
                              color={isSelected ? '#7c3aed' : theme.textSecondary}
                            />
                            <Text
                              style={[
                                styles.sortDropdownItemText,
                                {
                                  color: isSelected ? '#6d28d9' : theme.textPrimary,
                                  fontWeight: isSelected ? '800' : '500',
                                },
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </View>
                          {isSelected && (
                            <MaterialCommunityIcons name="check" size={16} color="#7c3aed" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

          {(!selectedMonth.missing_day_suggestions ||
            selectedMonth.missing_day_suggestions.length === 0) ? (
            <View
              style={[
                styles.emptyWrap,
                {
                  backgroundColor: isSketch ? '#faf5ff' : '#f5f3ff',
                  borderColor: isSketch ? '#7c3aed' : '#ddd6fe',
                  borderWidth: 1,
                  borderRadius: 12,
                },
              ]}
            >
              <MaterialCommunityIcons name="check-decagram" size={28} color="#7c3aed" />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No missing day gaps in this month or all open days have active coverage.
              </Text>
            </View>
          ) : (() => {
            const raw = selectedMonth.missing_day_suggestions || [];
            const sorted = [...raw].sort((a, b) => {
              switch (suggestionSort) {
                case 'yield_desc':
                  return b.dividend_yield - a.dividend_yield;
                case 'yield_asc':
                  return a.dividend_yield - b.dividend_yield;
                case 'price_desc':
                  return (b.current_price || 0) - (a.current_price || 0);
                case 'price_asc':
                  return (a.current_price || 0) - (b.current_price || 0);
                default:
                  return a.day - b.day;
              }
            });

            const stocks = sorted.filter((s) => s.instrument_type !== 'ETF');
            const etfs = sorted.filter((s) => s.instrument_type === 'ETF');

            const renderCard = (sug: MissingDaySuggestion) => {
              const dateInfo = formatSuggestionDate(sug.date_str, sug.day);
              const creditedText = sug.credited_date_display || dateInfo.creditedLabel;
              const t212Url = getTrading212InstrumentUrl(sug.ticker);

              return (
                <View
                  key={`${sug.ticker}-${sug.day}`}
                  style={[
                    styles.futureCard,
                    {
                      backgroundColor: isSketch ? '#faf5ff' : '#f5f3ff',
                      borderColor: isSketch ? '#7c3aed' : '#ddd6fe',
                      borderWidth: isSketch ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.futureCardTop}>
                    <View
                      style={[
                        styles.missingDayBadge,
                        { backgroundColor: isSketch ? '#6d28d9' : '#7c3aed' },
                      ]}
                    >
                      <Text style={styles.missingDayLabel}>{dateInfo.monthAbbr}</Text>
                      <Text style={styles.missingDayNum}>{dateInfo.dayText}</Text>
                    </View>

                    <StockLogo ticker={sug.ticker} size={38} />

                    <View style={styles.futureInfoWrap}>
                      <View style={styles.futureTickerRow}>
                        <Text style={[styles.futureTicker, { color: theme.textPrimary }]}>
                          {formatTicker(sug.ticker)}
                        </Text>
                        {sug.instrument_type === 'ETF' ? (
                          <View style={styles.etfTag}>
                            <Text style={styles.etfTagText}>ETF</Text>
                          </View>
                        ) : (
                          <View style={styles.stockTag}>
                            <Text style={styles.stockTagText}>STOCK</Text>
                          </View>
                        )}
                        <View style={styles.futureTag}>
                          <Text style={styles.futureTagText}>Future Investment</Text>
                        </View>
                      </View>
                      <Text
                        style={[styles.futureName, { color: theme.textSecondary }]}
                        numberOfLines={1}
                      >
                        {sug.name}
                      </Text>
                    </View>

                    <View style={styles.futureRightMetrics}>
                      <View style={styles.futureYieldTag}>
                        <Text style={styles.futureYieldText}>{sug.dividend_yield.toFixed(2)}%</Text>
                      </View>
                      {sug.current_price !== undefined && sug.current_price > 0 ? (
                        <Text style={[styles.futurePriceText, { color: theme.textPrimary }]}>
                          {formatPrice(sug.current_price, sug.currency)}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View
                    style={[
                      styles.futureMetaRow,
                      { borderTopColor: isSketch ? '#e9d5ff' : '#ede9fe' },
                    ]}
                  >
                    <Text style={[styles.futureMetaItem, { color: theme.textSecondary }]}>
                      Credited: {creditedText} • ~€{(sug.payout_amount_per_share || 0).toFixed(2)}/sh ({sug.payout_frequency})
                    </Text>
                    <TouchableOpacity
                      style={styles.t212LinkBadge}
                      onPress={() => Linking.openURL(t212Url)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="open-in-new" size={13} color="#0284c7" />
                      <Text style={styles.t212LinkText}>Trading 212</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            };

            return (
              <View>
                {/* Stocks Section */}
                <View style={styles.subgroupHeader}>
                  <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={18} color="#7c3aed" />
                  <Text style={[styles.subgroupTitle, { color: '#6d28d9' }]}>
                    Stocks ({stocks.length})
                  </Text>
                </View>
                {stocks.length === 0 ? (
                  <Text style={[styles.subgroupEmptyText, { color: theme.textSecondary }]}>
                    No stock candidates for this month.
                  </Text>
                ) : (
                  stocks.map(renderCard)
                )}

                {/* ETFs Section */}
                <View style={[styles.subgroupHeader, { marginTop: 18 }]}>
                  <MaterialCommunityIcons name="layers-outline" size={18} color="#d97706" />
                  <Text style={[styles.subgroupTitle, { color: '#b45309' }]}>
                    ETFs ({etfs.length})
                  </Text>
                </View>
                {etfs.length === 0 ? (
                  <Text style={[styles.subgroupEmptyText, { color: theme.textSecondary }]}>
                    No ETF candidates for this month.
                  </Text>
                ) : (
                  etfs.map(renderCard)
                )}
              </View>
            );
          })()}
        </View>
      )}

      {/* Methodology Note */}
      <View style={styles.noteBox}>
        <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color="#94a3b8" />
        <Text style={styles.noteText}>
          Recommendations evaluate stocks currently in your portfolio. Future investment suggestions
          evaluate Trading 212 verified dividend stocks across missing calendar days for forecasted income expansion.
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
  futureHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 4,
  },
  futureSectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  futureSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  futureSectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  futureSectionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  futureSectionSub: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 4,
  },
  discoverySyncBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
  },
  discoverySyncInfo: {
    flex: 1,
  },
  discoverySyncTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  discoverySyncSub: {
    fontSize: 10,
    marginTop: 2,
  },
  discoverySyncBtn: {
    backgroundColor: '#7c3aed',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverySyncBtnDisabled: {
    opacity: 0.6,
  },
  discoveryBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  discoveryBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  etfTag: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  etfTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b45309',
  },
  stockTag: {
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  stockTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0369a1',
  },
  futureCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  futureCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  missingDayBadge: {
    width: 46,
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
  },
  missingDayLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  missingDayNum: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    lineHeight: 18,
  },
  futureInfoWrap: {
    flex: 1,
  },
  futureTickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  futureTicker: {
    fontSize: 14,
    fontWeight: '800',
  },
  futureTag: {
    backgroundColor: '#ede9fe',
    borderWidth: 1,
    borderColor: '#c4b5fd',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  futureTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#6d28d9',
  },
  futureName: {
    fontSize: 11,
    marginTop: 2,
  },
  futureRightMetrics: {
    alignItems: 'flex-end',
    gap: 3,
  },
  futurePriceText: {
    fontSize: 11,
    fontWeight: '700',
  },
  futureYieldTag: {
    backgroundColor: '#ede9fe',
    borderColor: '#c4b5fd',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    alignItems: 'flex-end',
  },
  futureYieldText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6d28d9',
  },
  futureMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  futureMetaItem: {
    fontSize: 11,
    fontWeight: '500',
  },
  t212LinkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  t212LinkText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284c7',
  },
  t212VerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  t212VerifiedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  sortFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sortFilterLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  sortDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortDropdownBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sortDropdownMenu: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 6,
    marginBottom: 10,
    gap: 4,
  },
  sortDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  sortDropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortDropdownItemText: {
    fontSize: 12,
  },
  subgroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 8,
  },
  subgroupTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subgroupEmptyText: {
    fontSize: 11,
    fontStyle: 'italic',
    paddingVertical: 8,
    paddingHorizontal: 4,
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
