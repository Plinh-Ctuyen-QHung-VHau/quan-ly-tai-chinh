import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart, PieChart } from 'react-native-gifted-charts';

// ─── Helpers ───────────────────────────────────────────────────────────────────

function shortAmount(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toLocaleString('vi-VN');
}

// ─── Spending Donut ────────────────────────────────────────────────────────────

function SpendingDonut({ data }: { data: any }) {
  const income = Number(data?.total_income || 0);
  const expense = Number(data?.total_expense || 0);
  const total = income + expense;
  if (total === 0) return null;

  const pieData = [
    { value: expense, color: '#EF4444' },
    { value: income, color: '#22C55E' },
  ];

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>THU vs CHI</Text>
      <View style={styles.donutRow}>
        <PieChart
          donut
          data={pieData}
          radius={72}
          innerRadius={46}
          centerLabelComponent={() => (
            <Text style={styles.donutCenter}>
              {Math.round((expense / total) * 100)}%{'\n'}
              <Text style={styles.donutCenterSub}>chi</Text>
            </Text>
          )}
        />
        <View style={styles.donutLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22C55E' }]} />
            <View>
              <Text style={styles.legendLabel}>Thu nhập</Text>
              <Text style={[styles.legendValue, { color: '#22C55E' }]}>
                {shortAmount(income)}đ
              </Text>
            </View>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
            <View>
              <Text style={styles.legendLabel}>Chi tiêu</Text>
              <Text style={[styles.legendValue, { color: '#EF4444' }]}>
                {shortAmount(expense)}đ
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Category Bar ──────────────────────────────────────────────────────────────

function CategoryBar({ data, type }: { data: any; type?: string }) {
  const breakdown: any[] = data?.category_breakdown || [];
  const filtered = breakdown
    .filter((c) => !type || c.type === type)
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5);

  if (filtered.length === 0) return null;

  const max = Number(filtered[0].amount);
  const color = type === 'income' ? '#22C55E' : '#2563EB';

  const barData = filtered.map((c) => ({
    value: Number(c.amount),
    label: (c.category_name || '?').slice(0, 8),
    frontColor: color,
    topLabelComponent: () => (
      <Text style={styles.barTopLabel}>{shortAmount(Number(c.amount))}</Text>
    ),
  }));

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>TOP DANH MỤC</Text>
      <BarChart
        data={barData}
        barWidth={50}
        spacing={16}
        roundedTop
        hideRules
        xAxisThickness={0}
        yAxisThickness={0}
        yAxisTextStyle={styles.hidden}
        noOfSections={3}
        maxValue={max * 1.25}
        height={130}
        barBorderRadius={8}
        xAxisLabelTextStyle={styles.barLabel}
      />
    </View>
  );
}

// ─── Budget Gauge ──────────────────────────────────────────────────────────────

function BudgetGauge({ data }: { data: any }) {
  if (!data) return null;

  const pct = Math.min(100, Math.round(Number(data.percent_used || 0)));
  const color = pct >= 100 ? '#EF4444' : pct >= 80 ? '#F59E0B' : '#22C55E';

  const pieData = [
    { value: pct, color },
    { value: Math.max(0, 100 - pct), color: '#E2E8F0' },
  ];

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>TIẾN ĐỘ NGÂN SÁCH</Text>
      <View style={styles.donutRow}>
        <PieChart
          donut
          data={pieData}
          radius={72}
          innerRadius={46}
          centerLabelComponent={() => (
            <Text style={[styles.donutCenter, { color }]}>{pct}%</Text>
          )}
        />
        <View style={styles.donutLegend}>
          <Text style={styles.legendLabel}>Đã chi</Text>
          <Text style={[styles.legendValue, { color }]}>
            {shortAmount(Number(data.spent_amount || 0))}đ
          </Text>
          <Text style={[styles.legendLabel, { marginTop: 8 }]}>Còn lại</Text>
          <Text style={[styles.legendValue, { color: '#0D9488' }]}>
            {shortAmount(Math.max(0, Number(data.remaining_amount || 0)))}đ
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Trends Bar ────────────────────────────────────────────────────────────────

function TrendsBar({ data, args }: { data: any; args?: any }) {
  const type = args?.type || 'expense';
  const v1 =
    type === 'income'
      ? Number(data?.period1?.total_income || 0)
      : Number(data?.period1?.total_expense || 0);
  const v2 =
    type === 'income'
      ? Number(data?.period2?.total_income || 0)
      : Number(data?.period2?.total_expense || 0);

  if (v1 === 0 && v2 === 0) return null;

  const barData = [
    {
      value: v1,
      label: 'Kỳ 1',
      frontColor: '#2563EB',
      topLabelComponent: () => (
        <Text style={styles.barTopLabel}>{shortAmount(v1)}</Text>
      ),
    },
    {
      value: v2,
      label: 'Kỳ 2',
      frontColor: '#7C3AED',
      topLabelComponent: () => (
        <Text style={styles.barTopLabel}>{shortAmount(v2)}</Text>
      ),
    },
  ];

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>SO SÁNH KỲ</Text>
      <BarChart
        data={barData}
        barWidth={64}
        spacing={40}
        roundedTop
        hideRules
        xAxisThickness={0}
        yAxisThickness={0}
        yAxisTextStyle={styles.hidden}
        noOfSections={3}
        maxValue={Math.max(v1, v2) * 1.3 || 1}
        height={130}
        barBorderRadius={10}
        xAxisLabelTextStyle={styles.barLabel}
      />
    </View>
  );
}

// ─── Anomaly Dots ──────────────────────────────────────────────────────────────

function AnomalyDots({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  const shown = data.slice(0, 4);

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>CHI TIÊU BẤT THƯỜNG</Text>
      {shown.map((a, i) => {
        const sev: string = a.severity || 'low';
        const color =
          sev === 'high' ? '#EF4444' : sev === 'medium' ? '#F59E0B' : '#94A3B8';
        const date = new Date(a.detected_at).toLocaleDateString('vi-VN');
        return (
          <View key={i} style={styles.anomalyRow}>
            <View style={[styles.anomalyDot, { backgroundColor: color }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.anomalyDate}>{date}</Text>
              <Text style={styles.anomalyAmt}>
                {Number(a.actual_value).toLocaleString('vi-VN')}đ
                {'  '}
                <Text style={{ color, fontWeight: '700' }}>
                  {sev === 'high' ? 'Cao' : sev === 'medium' ? 'Trung bình' : 'Thấp'}
                </Text>
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────────

export interface ChatChartProps {
  intent?: string;
  data?: any;
  args?: any;
}

export function ChatChart({ intent, data, args }: Readonly<ChatChartProps>) {
  if (!intent || !data) return null;

  switch (intent) {
    case 'get_spending_summary':
      if (args?.type === 'all') return <SpendingDonut data={data} />;
      if ((data?.category_breakdown?.length ?? 0) > 0)
        return <CategoryBar data={data} type={args?.type} />;
      return null;

    case 'get_budget_status':
      return <BudgetGauge data={data} />;

    case 'analyze_trends':
      return <TrendsBar data={data} args={args} />;

    case 'get_anomalies':
      return <AnomalyDots data={data} />;

    default:
      return null;
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  chartContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  chartTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  donutCenter: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  donutCenterSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  donutLegend: {
    flex: 1,
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  barTopLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  barLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  hidden: {
    fontSize: 0,
    color: 'transparent',
  },
  anomalyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  anomalyDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    marginTop: 4,
  },
  anomalyDate: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  anomalyAmt: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '700',
  },
});
