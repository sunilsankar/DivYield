import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const isPositive = summary.unrealized_pnl >= 0;

  // Derive metrics in a single pass
  const { totalReceivedAllTime, receivedYtd, ttmDividends } = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    let allTime = 0;
    let ytd = 0;
    let ttm = 0;

    for (const d of dividends) {
      const amt = d.amount || 0;
      allTime += amt;
      const date = d.payment_date || '';
      if (date.startsWith(currentYear)) ytd += amt;
      if (date >= cutoffStr) ttm += amt;
    }

    return { totalReceivedAllTime: allTime, receivedYtd: ytd, ttmDividends: ttm };
  }, [dividends]);

  // Max for bar chart
  const maxMonthly = useMemo(() => {
    const max = Math.max(...monthlyDividends.map(m => m.received), 1);
    return max;
  }, [monthlyDividends]);

  const recentDividends = useMemo(() => dividends.slice(0, 6), [dividends]);

  if (holdings.length === 0) {
    return (
      <ScrollView contentContainerStyle={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="wallet-outline" size={48} color="#2563eb" />
          <Text style={styles.emptyTitle}>Welcome to DivYield</Text>
          <Text style={styles.emptyText}>
            Your local portfolio is empty. Add your read-only Trading 212 API key in Settings and press Sync to load your live holdings and dividends.
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Portfolio Card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Total Portfolio Value</Text>
        <Text style={styles.heroValue}>€{summary.total_value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>

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
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Received</Text>
          <Text style={styles.statValue}>€{totalReceivedAllTime.toFixed(2)}</Text>
          <Text style={styles.statSub}>All time cash</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Received YTD</Text>
          <Text style={styles.statValue}>€{receivedYtd.toFixed(2)}</Text>
          <Text style={styles.statSub}>In {new Date().getFullYear()}</Text>
        </View>
      </View>

      <View style={styles.gridRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>TTM Dividends</Text>
          <Text style={styles.statValue}>€{ttmDividends.toFixed(2)}</Text>
          <Text style={styles.statSub}>Past 12 months</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Monthly Avg</Text>
          <Text style={styles.statValue}>€{(ttmDividends / 12).toFixed(2)}</Text>
          <Text style={styles.statSub}>Run-rate / mo</Text>
        </View>
      </View>

      {/* Monthly Chart */}
      <View style={styles.chartCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Monthly Dividends</Text>
          <Text style={styles.cardBadge}>{new Date().getFullYear()}</Text>
        </View>

        <View style={styles.barsContainer}>
          {monthlyDividends.map((item, idx) => {
            const heightPercent = maxMonthly > 0 ? (item.received / maxMonthly) * 100 : 0;
            return (
              <View key={idx} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${Math.max(4, Math.min(100, heightPercent))}%` },
                      item.received > 0 ? styles.barActive : styles.barInactive,
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{item.month}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Recent Dividends */}
      <View style={styles.recentCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Recent Dividends</Text>
          <TouchableOpacity onPress={() => onNavigateTab('calendar')}>
            <Text style={styles.seeAllText}>View Calendar</Text>
          </TouchableOpacity>
        </View>

        {recentDividends.map((div, i) => (
          <View key={i} style={styles.divRow}>
            <StockLogo ticker={div.ticker} size={36} />
            <View style={styles.divInfo}>
              <Text style={styles.divTicker}>{div.ticker}</Text>
              <Text style={styles.divName} numberOfLines={1}>
                {div.company_name || div.ticker}
              </Text>
            </View>
            <View style={styles.divAmountCol}>
              <Text style={styles.divAmount}>+€{div.amount.toFixed(2)}</Text>
              <Text style={styles.divDate}>{div.payment_date}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    backgroundColor: '#ffffff',
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
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
    marginVertical: 4,
  },
  statSub: {
    color: '#94a3b8',
    fontSize: 11,
  },
  chartCard: {
    backgroundColor: '#ffffff',
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
    color: '#0f172a',
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
    width: 8,
    height: 96,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  barActive: {
    backgroundColor: '#059669',
  },
  barInactive: {
    backgroundColor: '#cbd5e1',
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 6,
  },
  recentCard: {
    backgroundColor: '#ffffff',
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
    borderBottomColor: '#f8fafc',
  },
  divInfo: {
    flex: 1,
    marginLeft: 12,
  },
  divTicker: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  divName: {
    fontSize: 12,
    color: '#64748b',
  },
  divAmountCol: {
    alignItems: 'flex-end',
  },
  divAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  divDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  emptyContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
