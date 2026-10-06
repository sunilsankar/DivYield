import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { DividendEvent, Holding, PortfolioSummary } from '../../types';
import { StockLogo } from '../common/StockLogo';

interface DashboardViewProps {
  summary: PortfolioSummary;
  holdings: Holding[];
  dividends: DividendEvent[];
  monthlyDividends: { month: string; received: number; forecast: number }[];
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  holdings,
  dividends,
  monthlyDividends,
  onNavigateTab,
}) => {
  const { theme, isSketch } = useTheme();
  const isPositive = summary.unrealized_pnl >= 0;

  // Derive metrics in a single pass
  const { totalReceivedAllTime, receivedYtd, ttmDividends, forecastNext12Months } = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    let allTime = 0;
    let ytd = 0;
    let ttm = 0;
    let forecast12 = 0;

    for (const d of dividends) {
      const amt = d.amount || 0;
      if (d.status === 'RECEIVED') {
        allTime += amt;
        const date = d.payment_date || '';
        if (date.startsWith(currentYear)) ytd += amt;
        if (date >= cutoffStr) ttm += amt;
      } else {
        forecast12 += amt;
      }
    }

    return {
      totalReceivedAllTime: allTime,
      receivedYtd: ytd,
      ttmDividends: ttm,
      forecastNext12Months: forecast12,
    };
  }, [dividends]);

  // Max for bar chart
  const maxMonthly = useMemo(() => {
    let max = 1;
    for (const m of monthlyDividends) {
      const sum = (m.received || 0) + (m.forecast || 0);
      if (sum > max) max = sum;
    }
    return max;
  }, [monthlyDividends]);

  const recentDividends = useMemo(() => dividends.slice(0, 6), [dividends]);

  if (holdings.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.emptyContainer}>
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              borderWidth: isSketch ? 2 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons name="wallet-outline" size={48} color={theme.accent} />
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Welcome to DivYield</Text>
          <Text style={styles.emptyText}>
            Your local portfolio is empty. Add your read-only Trading 212 API key in Settings and press Sync to load your live holdings and dividends.
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: theme.accent }, isSketch && styles.sketchBorder]}
            onPress={() => onNavigateTab('settings')}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyButtonText}>Go to Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Portfolio Card */}
      <View
        style={[
          styles.heroCard,
          isSketch && {
            backgroundColor: '#18181b',
            borderWidth: 2,
            borderColor: '#000000',
          },
        ]}
      >
        <Text style={styles.heroLabel}>Total Portfolio Value</Text>
        <Text style={styles.heroValue}>
          €{summary.total_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>

        <View style={styles.heroReturnRow}>
          <View style={[styles.pnlPill, isPositive ? styles.pnlPillPositive : styles.pnlPillNegative]}>
            <MaterialCommunityIcons
              name={isPositive ? 'arrow-top-right' : 'arrow-bottom-right'}
              size={16}
              color={isPositive ? '#059669' : '#dc2626'}
            />
            <Text style={[styles.pnlText, isPositive ? styles.pnlTextPositive : styles.pnlTextNegative]}>
              {isPositive ? '+' : ''}€{summary.unrealized_pnl.toFixed(2)} ({isPositive ? '+' : ''}{summary.pnl_percent.toFixed(2)}%)
            </Text>
          </View>
        </View>

        <View style={styles.heroFooter}>
          <View style={styles.heroFooterCol}>
            <Text style={styles.footerLabel}>Invested Basis</Text>
            <Text style={styles.footerValue}>€{summary.total_invested.toFixed(2)}</Text>
          </View>
          <View style={styles.heroFooterCol}>
            <Text style={styles.footerLabel}>Free Cash</Text>
            <Text style={styles.footerValue}>€{summary.free_cash.toFixed(2)}</Text>
          </View>
          <View style={styles.heroFooterCol}>
            <Text style={styles.footerLabel}>Holdings</Text>
            <Text style={styles.footerValue}>{summary.holdings_count}</Text>
          </View>
        </View>
      </View>

      {/* 4 Stat Cards */}
      <View style={styles.gridRow}>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              borderWidth: isSketch ? 2 : 1,
            },
          ]}
        >
          <Text style={styles.statLabel}>Total Received</Text>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>
            €{totalReceivedAllTime.toFixed(2)}
          </Text>
          <Text style={styles.statSub}>All time cash</Text>
        </View>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              borderWidth: isSketch ? 2 : 1,
            },
          ]}
        >
          <Text style={styles.statLabel}>Received YTD</Text>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>
            €{receivedYtd.toFixed(2)}
          </Text>
          <Text style={styles.statSub}>In {new Date().getFullYear()}</Text>
        </View>
      </View>

      <View style={styles.gridRow}>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              borderWidth: isSketch ? 2 : 1,
            },
          ]}
        >
          <Text style={styles.statLabel}>Next 12M Forecast</Text>
          <Text style={[styles.statValue, { color: '#2563eb' }]}>
            €{forecastNext12Months.toFixed(2)}
          </Text>
          <Text style={styles.statSub}>Projected dividends</Text>
        </View>
        <View
          style={[
            styles.statCard,
            {
              backgroundColor: theme.cardBg,
              borderColor: theme.cardBorder,
              borderWidth: isSketch ? 2 : 1,
            },
          ]}
        >
          <Text style={styles.statLabel}>Monthly Avg</Text>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>
            €{((forecastNext12Months > 0 ? forecastNext12Months : ttmDividends) / 12).toFixed(2)}
          </Text>
          <Text style={styles.statSub}>Run-rate / mo</Text>
        </View>
      </View>

      {/* Monthly Chart */}
      <View
        style={[
          styles.chartCard,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            borderWidth: isSketch ? 2 : 1,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
              Monthly Dividends
            </Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
                <Text style={styles.legendText}>Paid</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} />
                <Text style={styles.legendText}>Forecast</Text>
              </View>
            </View>
          </View>
          <Text style={styles.cardBadge}>{new Date().getFullYear()}</Text>
        </View>

        <View style={styles.barsContainer}>
          {monthlyDividends.map((item, idx) => {
            const receivedPct = maxMonthly > 0 ? (item.received / maxMonthly) * 100 : 0;
            const forecastPct = maxMonthly > 0 ? (item.forecast / maxMonthly) * 100 : 0;

            return (
              <View key={idx} style={styles.barCol}>
                <View style={styles.barTrack}>
                  {forecastPct > 0 && (
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.min(100, Math.max(3, forecastPct))}%`,
                          backgroundColor: '#3b82f6',
                          borderTopLeftRadius: 3,
                          borderTopRightRadius: 3,
                        },
                      ]}
                    />
                  )}
                  {receivedPct > 0 && (
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: `${Math.min(100, Math.max(3, receivedPct))}%`,
                          backgroundColor: '#059669',
                          borderTopLeftRadius: forecastPct > 0 ? 0 : 3,
                          borderTopRightRadius: forecastPct > 0 ? 0 : 3,
                        },
                      ]}
                    />
                  )}
                </View>
                <Text style={styles.barLabel}>{item.month}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Recent Dividends */}
      <View
        style={[
          styles.recentCard,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.cardBorder,
            borderWidth: isSketch ? 2 : 1,
          },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            Recent Dividends
          </Text>
          <TouchableOpacity onPress={() => onNavigateTab('calendar')}>
            <Text style={styles.seeAllText}>View Calendar</Text>
          </TouchableOpacity>
        </View>

        {recentDividends.map((div, i) => {
          const isForecast = div.status === 'EXPECTED' || div.status === 'FORECAST';
          return (
            <View key={i} style={styles.divRow}>
              <StockLogo ticker={div.ticker} size={36} />
              <View style={styles.divInfo}>
                <Text style={[styles.divTicker, { color: theme.textPrimary }]}>{div.ticker}</Text>
                <Text style={styles.divName} numberOfLines={1}>
                  {div.company_name || div.ticker}
                </Text>
              </View>
              <View style={styles.divAmountCol}>
                <Text style={[styles.divAmount, isForecast && styles.divAmountForecast]}>
                  +€{div.amount.toFixed(2)}
                </Text>
                <Text style={styles.divDate}>
                  {div.payment_date} {isForecast ? '• EST' : ''}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  heroLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroValue: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 4,
    letterSpacing: -0.5,
  },
  heroReturnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  pnlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pnlPillPositive: {
    backgroundColor: '#064e3b',
  },
  pnlPillNegative: {
    backgroundColor: '#7f1d1d',
  },
  pnlText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pnlTextPositive: {
    color: '#34d399',
  },
  pnlTextNegative: {
    color: '#f87171',
  },
  heroFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 14,
    justifyContent: 'space-between',
  },
  heroFooterCol: {
    flex: 1,
  },
  footerLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '500',
  },
  footerValue: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 4,
  },
  statSub: {
    color: '#94a3b8',
    fontSize: 11,
  },
  chartCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  cardBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  barsContainer: {
    flexDirection: 'row',
    height: 120,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: 14,
    height: 100,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
  },
  barLabel: {
    fontSize: 9,
    color: '#94a3b8',
    marginTop: 6,
    fontWeight: '600',
  },
  recentCard: {
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  divRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  divInfo: {
    flex: 1,
    marginLeft: 12,
  },
  divTicker: {
    fontSize: 14,
    fontWeight: '800',
  },
  divName: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  divAmountCol: {
    alignItems: 'flex-end',
  },
  divAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  divAmountForecast: {
    color: '#2563eb',
  },
  divDate: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  sketchBorder: {
    borderWidth: 1,
    borderColor: '#18181b',
  },
});
