import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { LoadingView } from "../../components/LoadingView";
import { ScreenHero } from "../../components/ScreenHero";
import { getCurrentBudgetStatus } from "../../services/budgetApi";
import { getTransactionSummary } from "../../services/transactionApi";
import { BudgetStatus } from "../../types/budget";
import { TransactionSummary } from "../../types/transaction";
import { formatCurrency } from "../../utils/formatCurrency";
import { StatTile, SmallMetric } from "../../components/MetricTiles";
import { COLORS, shadow } from "../../constants/ui";

const EMPTY_SUMMARY: TransactionSummary = {
  totalIncome: 0,
  totalExpense: 0,
  balance: 0,
};

// colors and shadow imported from constants to reduce file size

// Helper removed: inline check used for error status codes where needed

function clampPercent(value: number) {
  if (!Number.isFinite(value) || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getBudgetTheme(status?: BudgetStatus["status"]) {
  if (status === "healthy") {
    return { label: "An toàn", color: COLORS.income, bg: COLORS.incomeSoft };
  }

  if (status === "warning") {
    return { label: "Cần chú ý", color: "#D97706", bg: "#FEF3C7" };
  }

  if (status === "danger") {
    return { label: "Vượt ngưỡng", color: COLORS.expense, bg: COLORS.expenseSoft };
  }

  return { label: "Chưa có", color: COLORS.muted, bg: "#F1F5F9" };
}

// StatTile and SmallMetric are provided by ../../components/MetricTiles

export function HomeScreen() {
  const navigation = useNavigation<any>();

  const [summary, setSummary] = useState<TransactionSummary>(EMPTY_SUMMARY);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [summaryResult, budgetResult] = await Promise.allSettled([
      getTransactionSummary(),
      getCurrentBudgetStatus(),
    ]);

    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value ?? EMPTY_SUMMARY);
    } else if (summaryResult.status === "rejected") {
      const summaryError = summaryResult.reason as { statusCode?: number } | undefined;
      if (summaryError?.statusCode === 404) {
        setSummary(EMPTY_SUMMARY);
      }
    }

    if (budgetResult.status === "fulfilled") {
      setBudgetStatus(budgetResult.value);
    } else {
      // Tạm bỏ qua lỗi budget để UI không bị phá layout.
      setBudgetStatus(null);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const refresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
  }, [loadData]);

  const income = Number(summary.totalIncome ?? 0);
  const expense = Number(summary.totalExpense ?? 0);
  const balance = Number(summary.balance ?? 0);
  const netCashFlow = income - expense;

  const hasBudget = Boolean(budgetStatus && budgetStatus.status !== "no-budget");

  const budget_amount = Number(budgetStatus?.budget_amount ?? 0);
  const spent_amount = Number(budgetStatus?.spent_amount ?? 0);
  const remaining_amount = Number(
    budgetStatus?.remaining_amount ?? Math.max(0, budget_amount - spent_amount),
  );

  const budgetTheme = getBudgetTheme(budgetStatus?.status);

  const budgetPercent = useMemo(() => {
    if (!hasBudget || budget_amount <= 0) return 0;
    return clampPercent((spent_amount / budget_amount) * 100);
  }, [budget_amount, hasBudget, spent_amount]);

  if (loading) return <LoadingView label="Đang tải tổng quan..." />;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={COLORS.blue}
          onRefresh={refresh}
        />
      }
    >
      <ScreenHero
        kicker="Tổng quan"
        title="Số dư hiện tại"
        subtitle={`Thứ Hai, ${formatShortDate(new Date())}`}
        rightSlot={
          <View style={styles.currencyBadge}><Text style={styles.currencyBadgeText}>VND</Text></View>
        }
      >
        <Text style={styles.heroBalance} numberOfLines={1}>{formatCurrency(balance)}</Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatBox}><Text style={styles.heroStatDot}>●</Text>
            <View>
              <Text style={styles.heroStatLabel}>Thu vào</Text>
              <Text style={[styles.heroStatValue, { color: "#86EFAC" }]}>+{formatCurrency(income)}</Text>
            </View>
          </View>

          <View style={styles.heroStatBox}><Text style={[styles.heroStatDot, { color: "#FCA5A5" }]}>●</Text>
            <View>
              <Text style={styles.heroStatLabel}>Chi ra</Text>
              <Text style={[styles.heroStatValue, { color: "#FCA5A5" }]}>-{formatCurrency(expense)}</Text>
            </View>
          </View>
        </View>
      </ScreenHero>

      <View style={styles.quickActionRow}>
        <Pressable
          style={({ pressed }) => [
            styles.quickActionPrimary,
            pressed && styles.pressed,
          ]}
          onPress={() => navigation.navigate("AddTransaction")}
        >
          <Text style={styles.quickActionIcon}>＋</Text>
          <Text style={styles.quickActionPrimaryText}>Thêm giao dịch</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.quickActionSecondary,
            pressed && styles.pressed,
          ]}
          onPress={() => navigation.navigate("BudgetForm", { mode: "create" })}
        >
          <Text style={styles.quickActionSecondaryIcon}>◎</Text>
          <Text style={styles.quickActionSecondaryText}>Ngân sách</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Dòng tiền tháng này</Text>
      </View>

      <View style={styles.cashFlowGrid}>
        <StatTile
          label="Tổng thu"
          value={income}
          hint="Tiền vào trong kỳ"
          color={COLORS.income}
          bg={COLORS.incomeSoft}
          border={COLORS.incomeBorder}
          arrow="up"
        />

        <StatTile
          label="Tổng chi"
          value={expense}
          hint="Tiền ra trong kỳ"
          color={COLORS.expense}
          bg={COLORS.expenseSoft}
          border={COLORS.expenseBorder}
          arrow="down"
        />
      </View>

      <View style={styles.netCard}>
        <View>
          <Text style={styles.netLabel}>Dòng tiền ròng</Text>
          <Text style={styles.netHint}>
            {netCashFlow >= 0 ? "Thu nhập trừ chi tiêu" : "Chi tiêu đang vượt thu nhập"}
          </Text>
        </View>

        <Text
          style={[
            styles.netValue,
            { color: netCashFlow >= 0 ? COLORS.blue : COLORS.expense },
          ]}
          numberOfLines={1}
        >
          {netCashFlow >= 0 ? "+" : ""}
          {formatCurrency(netCashFlow)}
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Ngân sách kỳ này</Text>
      </View>

      <View style={styles.budgetCard}>
        <View style={styles.budgetHeader}>
          <View>
            <Text style={styles.budgetTitle}>Ngân sách hiện tại</Text>
            <Text style={styles.budgetSubtitle}>
              Theo dõi mức chi tiêu của bạn
            </Text>
          </View>

          <View style={[styles.budgetStatusChip, { backgroundColor: budgetTheme.bg }]}>
            <Text style={[styles.budgetStatusText, { color: budgetTheme.color }]}>
              {budgetTheme.label}
            </Text>
          </View>
        </View>

        {hasBudget ? (
          <>
            <View style={styles.budgetProgressRow}>
              <Text style={styles.budgetPercent}>{Math.round(budgetPercent)}%</Text>
              <Text style={styles.budgetUsedText}>đã sử dụng ngân sách</Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${budgetPercent}%`,
                    backgroundColor: budgetTheme.color,
                  },
                ]}
              />
            </View>

            <View style={styles.budgetMetricRow}>
              <SmallMetric
                label="Ngân sách"
                value={budget_amount}
                color={COLORS.blue}
                bg={COLORS.blueLight}
              />

              <SmallMetric
                label="Đã chi"
                value={spent_amount}
                color={COLORS.expense}
                bg={COLORS.expenseSoft}
              />

              <SmallMetric
                label="Còn lại"
                value={remaining_amount}
                color={COLORS.income}
                bg={COLORS.incomeSoft}
              />
            </View>

            <Text style={styles.budgetFooterText}>
              Còn lại khoảng {Math.max(0, Math.round(100 - budgetPercent))}% ngân sách cho kỳ hiện tại.
            </Text>
          </>
        ) : (
          <View style={styles.emptyBudgetBox}>
            <Text style={styles.emptyBudgetTitle}>Chưa có ngân sách</Text>
            <Text style={styles.emptyBudgetText}>
              Tạo ngân sách để kiểm soát chi tiêu tốt hơn trong kỳ này.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.createBudgetButton,
                pressed && styles.pressed,
              ]}
              onPress={() => navigation.navigate("BudgetForm", { mode: "create" })}
            >
              <Text style={styles.createBudgetButtonText}>Tạo ngân sách</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Text style={styles.footerNote}>
        Kéo xuống để làm mới · Thứ Hai, {formatShortDate(new Date())}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 120, backgroundColor: COLORS.bg },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  currencyBadge: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  currencyBadgeText: { color: "#E2E8F0", fontSize: 12, fontWeight: "900" },
  heroBalance: { color: COLORS.white, fontSize: 34, lineHeight: 40, fontWeight: "900", letterSpacing: -0.8, marginBottom: 18 },
  heroStatsRow: { flexDirection: "row", gap: 10 },
  heroStatBox: { flex: 1, flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 12, backgroundColor: "rgba(255,255,255,0.07)" },
  heroStatDot: { color: "#86EFAC", fontSize: 12, marginRight: 8 },
  heroStatLabel: { color: "#94A3B8", fontSize: 11, fontWeight: "700", marginBottom: 3 },
  heroStatValue: { fontSize: 13, fontWeight: "900" },
  quickActionRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  quickActionPrimary: { ...shadow, flex: 1, height: 66, borderRadius: 16, backgroundColor: COLORS.dark, alignItems: "center", justifyContent: "center" },
  quickActionSecondary: { ...shadow, flex: 1, height: 66, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  quickActionIcon: { color: COLORS.white, fontSize: 20, fontWeight: "900", marginBottom: 4 },
  quickActionPrimaryText: { color: COLORS.white, fontSize: 14, fontWeight: "900" },
  quickActionSecondaryIcon: { color: COLORS.blue, fontSize: 18, fontWeight: "900", marginBottom: 5 },
  quickActionSecondaryText: { color: COLORS.dark, fontSize: 14, fontWeight: "900" },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { color: COLORS.text, fontSize: 20, fontWeight: "900" },
  cashFlowGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  statTile: { flex: 1, minHeight: 112, borderRadius: 18, padding: 14, borderWidth: 1 },
  statArrow: { fontSize: 16, fontWeight: "900", marginBottom: 8 },
  statLabel: { color: COLORS.text, fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginBottom: 4 },
  statValue: { fontSize: 17, fontWeight: "900", marginBottom: 4 },
  statHint: { color: COLORS.muted, fontSize: 11, lineHeight: 15 },
  netCard: { ...shadow, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 18, padding: 14, backgroundColor: COLORS.blueLight, borderWidth: 1, borderColor: "#BFDBFE", marginBottom: 20 },
  netLabel: { color: COLORS.text, fontSize: 14, fontWeight: "900", marginBottom: 3 },
  netHint: { color: COLORS.muted, fontSize: 12 },
  netValue: { maxWidth: "48%", fontSize: 17, fontWeight: "900" },
  budgetCard: { ...shadow, backgroundColor: COLORS.white, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  budgetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, gap: 10 },
  budgetTitle: { color: COLORS.text, fontSize: 17, fontWeight: "900" },
  budgetSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  budgetStatusChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  budgetStatusText: { fontSize: 12, fontWeight: "900" },
  budgetProgressRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 10 },
  budgetPercent: { color: COLORS.text, fontSize: 34, lineHeight: 40, fontWeight: "900" },
  budgetUsedText: { color: COLORS.muted, fontSize: 13, fontWeight: "700" },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: "#E5EAF0", overflow: "hidden", marginBottom: 14 },
  progressFill: { height: "100%", borderRadius: 999 },
  budgetMetricRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  smallMetric: { flex: 1, borderRadius: 14, padding: 10 },
  smallMetricLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "900", textTransform: "uppercase", marginBottom: 4 },
  smallMetricValue: { fontSize: 12, fontWeight: "900" },
  budgetFooterText: { color: COLORS.muted, fontSize: 12, lineHeight: 17 },
  emptyBudgetBox: { padding: 14, borderRadius: 18, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: COLORS.border },
  emptyBudgetTitle: { color: COLORS.text, fontSize: 16, fontWeight: "900", marginBottom: 6 },

  emptyBudgetText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },

  createBudgetButton: {
    height: 46,
    borderRadius: 15,
    backgroundColor: COLORS.dark,
    alignItems: "center",
    justifyContent: "center",
  },

  createBudgetButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "900",
  },

  footerNote: {
    color: COLORS.muted2,
    textAlign: "center",
    fontSize: 11,
    marginTop: 18,
  },
});